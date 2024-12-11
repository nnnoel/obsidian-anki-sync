import {
  App,
  Plugin,
  PluginSettingTab,
  Setting,
  Notice,
  MarkdownView,
  parseYaml,
} from "obsidian";

interface AnkiSyncSettings {
  defaultDeck: string;
  defaultNoteType: string;
  ankiConnectUrl: string;
}

interface NoteTypeFields {
  [noteType: string]: string[];
}

interface NoteFrontmatter {
  ankiDeck?: string;
  ankiNoteType?: string;
  ankiFieldMappings?: {
    [key: string]: string;
  };
}

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

interface AnkiAction {
  action: string;
  params: any;
}

const DEFAULT_SETTINGS: AnkiSyncSettings = {
  defaultDeck: "Default",
  defaultNoteType: "Basic",
  ankiConnectUrl: "http://localhost:8765",
};

export default class AnkiSyncPlugin extends Plugin {
  settings: AnkiSyncSettings;
  noteTypeFields: NoteTypeFields = {};

  async onload() {
    await this.loadSettings();
    console.log("Settings loaded");

    // Add ribbon icon
    this.addRibbonIcon(
      "upload",
      "Sync Current Note to Anki Flashcards",
      async () => {
        console.log("Sync button clicked");
        const view = await this.getActiveMarkdownView();
        if (view) {
          await this.syncCurrentNoteToAnki();
        }
      }
    );
    console.log("Ribbon icon added");

    // Add settings tab
    this.addSettingTab(new AnkiSyncSettingTab(this.app, this));
    console.log("Setting tab added");

    // Add command
    this.addCommand({
      id: "sync-to-anki",
      name: "Sync current note to Anki",
      callback: async () => {
        const view = await this.getActiveMarkdownView();
        if (view) {
          await this.syncCurrentNoteToAnki();
        }
      },
    });
    console.log("Command added");

    // Load note types on startup
    try {
      await this.loadNoteTypes();
      console.log("Note types loaded");
    } catch (error) {
      console.error("Failed to load note types:", error);
      new Notice("Failed to connect to Anki. Please ensure AnkiConnect is running.");
    }

    console.log("Anki Sync plugin loaded successfully");
  }

  async loadNoteTypes() {
    try {
      console.log("Loading note types from Anki...");
      const noteTypes = await this.invokeAnkiConnect("modelNames");
      console.log("Available note types:", noteTypes);

      for (const noteType of noteTypes) {
        try {
          console.log(`Loading fields for note type: ${noteType}`);
          const fields = await this.invokeAnkiConnect("modelFieldNames", {
            modelName: noteType,
          });
          console.log(`Fields for ${noteType}:`, fields);
          this.noteTypeFields[noteType] = fields;
        } catch (error) {
          console.error(
            `Failed to load fields for note type ${noteType}:`,
            error,
          );
          // Initialize with empty array but don't throw
          this.noteTypeFields[noteType] = [];
        }
      }

      // Verify fields were loaded
      const loadedTypes = Object.keys(this.noteTypeFields);
      console.log("Loaded note types:", loadedTypes);
      for (const type of loadedTypes) {
        console.log(`Fields for ${type}:`, this.noteTypeFields[type]);
      }
    } catch (error) {
      console.error("Failed to load note types:", error);
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
      console.error(`AnkiConnect ${action} failed:`, error);
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
  }

  parseFrontmatter(content: string): NoteFrontmatter | null {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return null;

    try {
      return parseYaml(frontmatterMatch[1]);
    } catch (error) {
      console.error("Failed to parse frontmatter:", error);
      return null;
    }
  }

  async getActiveMarkdownView(): Promise<MarkdownView | null> {
    try {
      console.log("Starting sync process...");
      
      // Try multiple methods to get the active view
      let activeView: MarkdownView | null = null;
      
      // Method 1: Through active leaf (most reliable)
      const activeLeaf = this.app.workspace.activeLeaf;
      console.log("Active leaf:", activeLeaf);
      
      if (activeLeaf?.view instanceof MarkdownView) {
        activeView = activeLeaf.view;
        console.log("Method 1 - Found view from active leaf:", activeView.file?.path);
      }
      
      // Method 2: Direct active view (backup)
      if (!activeView) {
        const directView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (directView) {
          activeView = directView;
          console.log("Method 2 - Found direct active view:", directView.file?.path);
        }
      }
      
      // Method 3: Last resort - search all leaves
      if (!activeView) {
        console.log("Trying method 3 - Search all leaves");
        const leaves = this.app.workspace.getLeavesOfType("markdown");
        const paths = leaves.map(leaf => (leaf.view as MarkdownView).file?.path).filter(Boolean);
        console.log("Found markdown leaves:", paths);
        
        // First try to find a leaf that is both active and focused
        for (const leaf of leaves) {
          const state = leaf.getViewState();

          // @ts-expect-error FIXME
          if (leaf.view instanceof MarkdownView && (state.active || state.focused)) {
            activeView = leaf.view;
            console.log("Method 3 - Found active/focused leaf:", activeView.file?.path);
            break;
          }
        }
        
        // If still no active view, just take the first markdown view
        if (!activeView && leaves.length > 0) {
          const firstLeaf = leaves[0];
          if (firstLeaf.view instanceof MarkdownView) {
            activeView = firstLeaf.view;
            console.log("Method 3 - Using first available leaf:", activeView.file?.path);
          }
        }
      }

      if (!activeView?.file) {
        new Notice("No active markdown file found. Please open a markdown file and try again.");
        console.log("No active markdown view found after all attempts");
        return null;
      }

      console.log("Final selected file for sync:", activeView.file.path);
      return activeView;
    } catch (error) {
      console.error("Error in getActiveMarkdownView:", error);
      return null;
    }
  }

  async syncCurrentNoteToAnki() {
    try {
      const activeView = await this.getActiveMarkdownView();
      if (!activeView) return;

      const content = activeView.getViewData();
      console.log("Read file content, length:", content.length);

      // Parse frontmatter
      const frontmatter = this.parseFrontmatter(content);
      console.log("Parsed frontmatter:", frontmatter);

      if (!frontmatter) {
        new Notice("No Anki configuration found in frontmatter");
        return;
      }

      // Use settings from frontmatter or defaults
      const deck = frontmatter.ankiDeck || this.settings.defaultDeck;
      const noteType = frontmatter.ankiNoteType || this.settings.defaultNoteType;
      const fieldMappings = frontmatter.ankiFieldMappings || {};

      console.log("Using note type:", noteType);
      console.log("Using deck:", deck);
      console.log("Field mappings:", fieldMappings);

      // Ensure we have the fields for this note type
      const availableFields = this.noteTypeFields[noteType];
      if (!availableFields || availableFields.length === 0) {
        new Notice(`No fields found for note type: ${noteType}`);
        return;
      }

      console.log("Available fields for note type:", availableFields);

      // Parse the content into flashcards
      const flashcards = this.parseContent(content, fieldMappings, availableFields);
      console.log("Parsed flashcards:", flashcards);

      if (flashcards.length === 0) {
        new Notice("No valid flashcards found in note");
        return;
      }

      // Send to Anki
      await this.sendToAnki(flashcards, deck, noteType);
      new Notice(`Successfully synced ${flashcards.length} cards to Anki`);
    } catch (error) {
      console.error("Error in syncCurrentNoteToAnki:", error);
      new Notice(`Error syncing to Anki: ${error.message}`);
    }
  }

  async ensureDeckExists(deckName: string): Promise<void> {
    try {
      // Get list of existing decks
      const decks = await this.invokeAnkiConnect("deckNames");

      // If deck doesn't exist, create it
      if (!decks.includes(deckName)) {
        console.log(`Creating new deck: ${deckName}`);
        await this.invokeAnkiConnect("createDeck", {
          deck: deckName,
        });
        new Notice(`Created new deck: ${deckName}`);
      }
    } catch (error) {
      console.error("Failed to check/create deck:", error);
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
      console.log(`Sending ${flashcards.length} cards to Anki...`);

      // First, find all existing notes in the deck
      const query = `"deck:${deck}"`;
      const existingNoteIds = await this.invokeAnkiConnect("findNotes", { query });
      console.log(`Found ${existingNoteIds?.length || 0} existing notes in deck`);

      if (existingNoteIds && existingNoteIds.length > 0) {
        // Get info for all existing notes
        const existingNotes = await this.invokeAnkiConnect("notesInfo", {
          notes: existingNoteIds
        });

        // Create a map of Front field to note ID for quick lookup
        const existingNoteMap = new Map(
          existingNotes.map((note: AnkiNote) => [note.fields.Front.value, note.noteId])
        );
        console.log("Created map of existing notes");

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

        console.log(`Found ${updateCards.length} cards to update and ${newCards.length} new cards`);

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

          console.log("Updating existing notes...");
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

          console.log("Adding new notes...");
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

        console.log("Adding all notes as new...");
        await this.invokeAnkiConnect("multi", { actions: addActions });
      }

      console.log("Successfully synced all cards");
    } catch (error) {
      console.error("Failed in sendToAnki:", error);
      throw new Error(`Failed to sync cards: ${error.message}`);
    }
  }

  parseContent(
    content: string,
    fieldMappings: { [key: string]: string },
    availableFields: string[],
  ): Array<AnkiCard> {
    console.log("Starting content parsing...");
    console.log("Field mappings:", fieldMappings);
    console.log("Available fields:", availableFields);

    const flashcards: Array<AnkiCard> = [];
    const entries = content.split(/(?=### \*\*Front:)/).filter(Boolean);
    console.log(`Found ${entries.length} entries to process`);

    for (const entry of entries) {
      console.log("\nProcessing entry:", entry.substring(0, 100) + "...");
      const fields: AnkiCard = {};
      
      // Extract Front field from header
      const frontMatch = entry.match(/### \*\*Front: (.*?)\*\*/);
      if (frontMatch) {
        fields["Front"] = frontMatch[1].trim();
        console.log("Found Front:", fields["Front"]);
      } else {
        console.log("No Front field found in entry");
      }

      // Extract Back field - everything between "Back:" and the next field or end
      const backMatch = entry.match(/\*\*Back:\*\* ([\s\S]*?)(?=(?:-   [A-Z]|Context:|$))/);
      if (backMatch) {
        fields["Back"] = backMatch[1].trim();
        console.log("Found Back:", fields["Back"].substring(0, 50) + "...");
      } else {
        console.log("No Back field found in entry");
      }

      // Extract other fields from bullet points
      const usageMatch = entry.match(/-   Usage: ([\s\S]*?)(?=(?:-   |$))/);
      if (usageMatch) {
        fields["Usage"] = usageMatch[1].trim();
        console.log("Found Usage:", fields["Usage"].substring(0, 50) + "...");
      }

      const exampleMatch = entry.match(/-   Example: ([\s\S]*?)(?=(?:-   |$))/);
      if (exampleMatch) {
        fields["Example"] = exampleMatch[1].trim();
        console.log("Found Example:", fields["Example"].substring(0, 50) + "...");
      }

      // Extract Context field - try multiple formats
      let contextContent = null;
      
      // Try bullet point format first
      const contextBulletMatch = entry.match(/-   Context: ([\s\S]*?)(?=(?:-   |$))/);
      if (contextBulletMatch) {
        contextContent = contextBulletMatch[1];
      } else {
        // Try plain "Context:" format
        const contextPlainMatch = entry.match(/Context:\s*([\s\S]*?)(?=(?:\n### |$))/);
        if (contextPlainMatch) {
          contextContent = contextPlainMatch[1];
        }
      }

      if (contextContent) {
        fields["Context"] = contextContent.trim();
        console.log("Found Context:", fields["Context"].substring(0, 50) + "...");
      }

      // Only add the card if we have both Front and Back fields
      if (fields["Front"] && fields["Back"]) {
        // Clean up fields
        Object.keys(fields).forEach(key => {
          if (fields[key]) {
            // Remove extra newlines and spaces
            fields[key] = fields[key]
              .replace(/\n+/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          }
        });
        
        console.log("Adding card with fields:", fields);
        flashcards.push(fields);
      } else {
        console.log("Skipping entry - missing required Front/Back fields");
      }
    }

    console.log(`Created ${flashcards.length} flashcards`);
    return flashcards;
  }
}

class AnkiSyncSettingTab extends PluginSettingTab {
  plugin: AnkiSyncPlugin;

  constructor(app: App, plugin: AnkiSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  async display() {
    const { containerEl } = this;
    containerEl.empty();

    // Get available decks and note types from Anki
    let decks: string[] = [];
    let noteTypes: string[] = [];
    try {
      decks = await this.plugin.invokeAnkiConnect("deckNames");
      noteTypes = await this.plugin.invokeAnkiConnect("modelNames");
    } catch (error) {
      new Notice("Failed to fetch Anki configuration. Is AnkiConnect running?");
    }

    new Setting(containerEl)
      .setName("Default Deck")
      .setDesc("Choose the default Anki deck for new cards")
      .addDropdown((dropdown) => {
        decks.forEach((deck) => dropdown.addOption(deck, deck));
        dropdown
          .setValue(this.plugin.settings.defaultDeck)
          .onChange(async (value) => {
            this.plugin.settings.defaultDeck = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Default Note Type")
      .setDesc("Choose the default note type for new cards")
      .addDropdown((dropdown) => {
        noteTypes.forEach((type) => dropdown.addOption(type, type));
        dropdown
          .setValue(this.plugin.settings.defaultNoteType)
          .onChange(async (value) => {
            this.plugin.settings.defaultNoteType = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("AnkiConnect URL")
      .setDesc("URL where AnkiConnect is running")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.ankiConnectUrl)
          .onChange(async (value) => {
            this.plugin.settings.ankiConnectUrl = value;
            await this.plugin.saveSettings();
          }),
      );
  }
}
