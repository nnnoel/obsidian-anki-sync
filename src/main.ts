import {
  Plugin,
  Notice,
  MarkdownView,
} from "obsidian";
import { AnkiSyncSettings, AnkiSyncSettingTab, DEFAULT_SETTINGS, NoteTypeFields } from "./settings";
import { parseFrontmatter, parseContent } from "./parser";
import { Logger } from "./logger";

interface AnkiCard {
  [field: string]: string;
}

interface AnkiNote {
  noteId: number;
  fields: {
    [key: string]: {
      value: string;
      order: number;
    };
  };
}

export default class AnkiSyncPlugin extends Plugin {
  settings: AnkiSyncSettings;
  noteTypeFields: NoteTypeFields = {};
  private logger: Logger;

  async onload() {
    await this.loadSettings();
    this.logger = new Logger(this.settings.debug);
    this.logger.log("Settings loaded");

    // Add ribbon icon
    this.addRibbonIcon(
      "upload",
      "Sync Current Note to Anki Flashcards",
      async () => {
        this.logger.log("Sync button clicked");
        const view = await this.getActiveMarkdownView();
        if (view) {
          await this.syncCurrentNoteToAnki();
        }
      }
    );
    this.logger.log("Ribbon icon added");

    // Add settings tab
    this.addSettingTab(new AnkiSyncSettingTab(this.app, this));
    this.logger.log("Setting tab added");

    // Add command
    this.addCommand({
      id: "sync-to-anki",
      name: "Sync current note to Anki",
      callback: async () => {
        this.logger.log("Sync command executed");
        const view = await this.getActiveMarkdownView();
        if (view) {
          await this.syncCurrentNoteToAnki();
        }
      },
    });
    this.logger.log("Command added");

    // Load note types on startup
    try {
      await this.loadNoteTypes();
      this.logger.log("Note types loaded");
    } catch (error) {
      this.logger.error("Failed to load note types:", error);
      new Notice("Failed to connect to Anki. Please ensure AnkiConnect is running.");
    }

    this.logger.log("Anki Sync plugin loaded successfully");
  }

  async loadNoteTypes() {
    try {
      this.logger.log("Loading note types from Anki...");
      const noteTypes = await this.invokeAnkiConnect("modelNames");
      this.logger.log("Available note types:", noteTypes);

      for (const noteType of noteTypes) {
        try {
          this.logger.log(`Loading fields for note type: ${noteType}`);
          const fields = await this.invokeAnkiConnect("modelFieldNames", {
            modelName: noteType,
          });
          this.logger.log(`Fields for ${noteType}:`, fields);
          this.noteTypeFields[noteType] = fields;
        } catch (error) {
          this.logger.error(
            `Failed to load fields for note type ${noteType}:`,
            error,
          );
          // Initialize with empty array but don't throw
          this.noteTypeFields[noteType] = [];
        }
      }

      // Verify fields were loaded
      const loadedTypes = Object.keys(this.noteTypeFields);
      this.logger.log("Loaded note types:", loadedTypes);
      for (const type of loadedTypes) {
        this.logger.log(`Fields for ${type}:`, this.noteTypeFields[type]);
      }
    } catch (error) {
      this.logger.error("Failed to load note types:", error);
      throw error;
    }
  }

  async invokeAnkiConnect(action: string, params = {}) {
    try {
      const response = await fetch(this.settings.ankiConnectUrl, {
        method: "POST",
        body: JSON.stringify({
          action,
          version: 6,
          params,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseJson = await response.json();
      if (responseJson.error) {
        throw new Error(responseJson.error);
      }
      return responseJson.result;
    } catch (error) {
      this.logger.error(`AnkiConnect ${action} failed:`, error);
      if (error.message.includes("Failed to fetch")) {
        throw new Error(
          "Cannot connect to Anki. Is Anki running with AnkiConnect installed?",
        );
      }
      throw error;
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    if (this.logger) {
      this.logger.setEnabled(this.settings.debug);
    }
  }

  async getActiveMarkdownView(): Promise<MarkdownView | null> {
    try {
      this.logger.log("Starting sync process...");
      
      // Try multiple methods to get the active view
      let activeView: MarkdownView | null = null;
      
      // Method 1: Through active leaf (most reliable)
      const activeLeaf = this.app.workspace.activeLeaf;
      this.logger.log("Active leaf:", activeLeaf);
      
      if (activeLeaf?.view instanceof MarkdownView) {
        activeView = activeLeaf.view;
        this.logger.log("Method 1 - Found view from active leaf:", activeView.file?.path);
      }
      
      // Method 2: Direct active view (backup)
      if (!activeView) {
        const directView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (directView) {
          activeView = directView;
          this.logger.log("Method 2 - Found direct active view:", directView.file?.path);
        }
      }
      
      // Method 3: Last resort - search all leaves
      if (!activeView) {
        this.logger.log("Trying method 3 - Search all leaves");
        const leaves = this.app.workspace.getLeavesOfType("markdown");
        const paths = leaves.map(leaf => (leaf.view as MarkdownView).file?.path).filter(Boolean);
        this.logger.log("Found markdown leaves:", paths);
        
        // First try to find a leaf that is both active and focused
        for (const leaf of leaves) {
          const state = leaf.getViewState();

          // @ts-expect-error FIXME
          if (leaf.view instanceof MarkdownView && (state.active || state.focused)) {
            activeView = leaf.view;
            this.logger.log("Method 3 - Found active/focused leaf:", activeView.file?.path);
            break;
          }
        }
        
        // If still no active view, just take the first markdown view
        if (!activeView && leaves.length > 0) {
          const firstLeaf = leaves[0];
          if (firstLeaf.view instanceof MarkdownView) {
            activeView = firstLeaf.view;
            this.logger.log("Method 3 - Using first available leaf:", activeView.file?.path);
          }
        }
      }

      if (!activeView?.file) {
        new Notice("No active markdown file found. Please open a markdown file and try again.");
        this.logger.log("No active markdown view found after all attempts");
        return null;
      }

      this.logger.log("Final selected file for sync:", activeView.file.path);
      return activeView;
    } catch (error) {
      this.logger.error("Error in getActiveMarkdownView:", error);
      return null;
    }
  }

  async syncCurrentNoteToAnki() {
    try {
      const activeView = await this.getActiveMarkdownView();
      if (!activeView) return;

      const content = activeView.getViewData();
      this.logger.log("Read file content, length:", content.length);

      // Parse frontmatter
      const frontmatter = parseFrontmatter(content);
      this.logger.log("Parsed frontmatter:", frontmatter);

      if (!frontmatter) {
        new Notice("No Anki configuration found in frontmatter");
        return;
      }

      // Use settings from frontmatter or defaults
      const deck = frontmatter.ankiDeck || this.settings.defaultDeck;
      const noteType = frontmatter.ankiNoteType || this.settings.defaultNoteType;
      const fieldMappings = frontmatter.ankiFieldMappings || {};

      this.logger.log("Using note type:", noteType);
      this.logger.log("Using deck:", deck);
      this.logger.log("Field mappings:", fieldMappings);

      // Ensure we have the fields for this note type
      const availableFields = this.noteTypeFields[noteType];
      if (!availableFields || availableFields.length === 0) {
        new Notice(`No fields found for note type: ${noteType}`);
        return;
      }

      this.logger.log("Available fields for note type:", availableFields);

      // Parse the content into flashcards
      const flashcards = parseContent(content, fieldMappings, availableFields);
      this.logger.log("Parsed flashcards:", flashcards);

      if (flashcards.length === 0) {
        new Notice("No valid flashcards found in note");
        return;
      }

      // Send to Anki
      await this.sendToAnki(flashcards, deck, noteType);
      new Notice(`Successfully synced ${flashcards.length} cards to Anki`);
    } catch (error) {
      this.logger.error("Error in syncCurrentNoteToAnki:", error);
      new Notice(`Error syncing to Anki: ${error.message}`);
    }
  }

  async ensureDeckExists(deckName: string): Promise<void> {
    try {
      // Get list of existing decks
      const decks = await this.invokeAnkiConnect("deckNames");

      // If deck doesn't exist, create it
      if (!decks.includes(deckName)) {
        this.logger.log(`Creating new deck: ${deckName}`);
        await this.invokeAnkiConnect("createDeck", {
          deck: deckName,
        });
        new Notice(`Created new deck: ${deckName}`);
      }
    } catch (error) {
      this.logger.error("Failed to check/create deck:", error);
      throw new Error(`Failed to ensure deck exists: ${error.message}`);
    }
  }

  async sendToAnki(
    flashcards: Array<AnkiCard>,
    deck: string,
    noteType: string,
  ) {
    try {
      // Ensure deck exists before adding cards
      await this.ensureDeckExists(deck);
      this.logger.log(`Sending ${flashcards.length} cards to Anki...`);

      // First, find all existing notes in the deck
      const query = `"deck:${deck}"`;
      const existingNoteIds = await this.invokeAnkiConnect("findNotes", { query });
      this.logger.log(`Found ${existingNoteIds?.length || 0} existing notes in deck`);

      if (existingNoteIds && existingNoteIds.length > 0) {
        // Get info for all existing notes
        const existingNotes = await this.invokeAnkiConnect("notesInfo", {
          notes: existingNoteIds
        });

        // Create a map of Front field to note ID for quick lookup
        const existingNoteMap = new Map(
          existingNotes.map((note: AnkiNote) => [note.fields.Front.value, note.noteId])
        );
        this.logger.log("Created map of existing notes");

        // Separate cards into new and updates
        const newCards: typeof flashcards = [];
        const updateCards: { id: number; fields: { [key: string]: string } }[] = [];

        for (const card of flashcards) {
          const existingNoteId = existingNoteMap.get(card.Front);
          if (existingNoteId) {
            updateCards.push({
              // @ts-expect-error FIXME
              id: existingNoteId,
              fields: card
            });
          } else {
            newCards.push(card);
          }
        }

        this.logger.log(`Found ${updateCards.length} cards to update and ${newCards.length} new cards`);

        // Bulk update existing notes
        if (updateCards.length > 0) {
          const updateActions = updateCards.map(card => ({
            action: "updateNoteFields",
            params: {
              note: {
                id: card.id,
                fields: card.fields
              }
            }
          }));

          this.logger.log("Updating existing notes...");
          await this.invokeAnkiConnect("multi", { actions: updateActions });
        }

        // Add new cards
        if (newCards.length > 0) {
          const addActions = newCards.map(card => ({
            action: "addNote",
            params: {
              note: {
                deckName: deck,
                modelName: noteType,
                fields: card,
                options: {
                  allowDuplicate: false,
                  duplicateScope: "deck",
                },
              },
            },
          }));

          this.logger.log("Adding new notes...");
          await this.invokeAnkiConnect("multi", { actions: addActions });
        }
      } else {
        // No existing notes, add all as new
        const addActions = flashcards.map(card => ({
          action: "addNote",
          params: {
            note: {
              deckName: deck,
              modelName: noteType,
              fields: card,
              options: {
                allowDuplicate: false,
                duplicateScope: "deck",
              },
            },
          },
        }));

        this.logger.log("Adding all notes as new...");
        await this.invokeAnkiConnect("multi", { actions: addActions });
      }

      this.logger.log("Successfully synced all cards");
    } catch (error) {
      this.logger.error("Failed in sendToAnki:", error);
      throw new Error(`Failed to sync cards: ${error.message}`);
    }
  }
}

