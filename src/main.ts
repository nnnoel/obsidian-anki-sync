import { Plugin, Notice, MarkdownView } from "obsidian";
import {
  AnkiSyncSettings,
  AnkiSyncSettingTab,
  DEFAULT_SETTINGS,
} from "./settings";
import { parseFrontmatter, parseContent } from "./parser";
import { Logger } from "./logger";
import { FieldDecorator } from "./field-decorator";
import { AnkiCard, AnkiService } from "./anki-service";
import { FieldDecorationManager } from "./field-decoration-manager";

export default class AnkiSyncPlugin extends Plugin {
  settings: AnkiSyncSettings;
  private logger: Logger;
  private fieldDecorator: FieldDecorator;
  private decorationManager: FieldDecorationManager;
  private ankiService: AnkiService;

  async onload() {
    await this.loadSettings();
    this.logger = new Logger(this.settings.debug);
    this.fieldDecorator = new FieldDecorator();
    this.decorationManager = new FieldDecorationManager(this.app, this.fieldDecorator);
    this.decorationManager.registerDecorations(this);
    this.ankiService = new AnkiService(
      this.settings.ankiConnectUrl,
      this.logger,
    );
    this.logger.log("Settings loaded");

    // Add ribbon icon
    this.addRibbonIcon(
      "upload",
      "Sync current Note to Anki Flashcards",
      this.handleSyncToAnki,
    );
    this.logger.log("Ribbon icon added");

    // Add settings tab
    this.addSettingTab(new AnkiSyncSettingTab(this.app, this));
    this.logger.log("Setting tab added");

    // Add command
    this.addCommand({
      id: "sync-to-anki",
      name: "Sync current note to Anki Flashcards",
      callback: this.handleSyncToAnki,
    });
    this.logger.log("Command added");

    // Load note types on startup
    try {
      await this.ankiService.loadNoteTypes();
      this.logger.log("Note types loaded");
    } catch (error) {
      this.logger.error("Failed to load note types:", error);
      new Notice(
        "Failed to connect to Anki. Please ensure AnkiConnect is running.",
      );
    }

    this.logger.log("Anki Sync plugin loaded successfully");
    new Notice(`Successfully connected to Anki`);
  }

  handleSyncToAnki = async () => {
    this.logger.log("Sync command executed");
    const view = await this.getActiveMarkdownView();
    if (view) {
      await this.syncCurrentNoteToAnki();
    }
  };

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
        this.logger.log(
          "Method 1 - Found view from active leaf:",
          activeView.file?.path,
        );
      }

      // Method 2: Direct active view (backup)
      if (!activeView) {
        const directView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (directView) {
          activeView = directView;
          this.logger.log(
            "Method 2 - Found direct active view:",
            directView.file?.path,
          );
        }
      }

      // Method 3: Last resort - search all leaves
      if (!activeView) {
        this.logger.log("Trying method 3 - Search all leaves");
        const leaves = this.app.workspace.getLeavesOfType("markdown");
        const paths = leaves
          .map((leaf) => (leaf.view as MarkdownView).file?.path)
          .filter(Boolean);
        this.logger.log("Found markdown leaves:", paths);

        // First try to find a leaf that is both active and focused
        for (const leaf of leaves) {
          const state = leaf.getViewState();

          if (leaf.view instanceof MarkdownView && state.active) {
            activeView = leaf.view;
            this.logger.log(
              "Method 3 - Found active leaf:",
              activeView.file?.path,
            );
            break;
          }
        }

        // If still no active view, just take the first markdown view
        if (!activeView && leaves.length > 0) {
          const firstLeaf = leaves[0];
          if (firstLeaf.view instanceof MarkdownView) {
            activeView = firstLeaf.view;
            this.logger.log(
              "Method 3 - Using first available leaf:",
              activeView.file?.path,
            );
          }
        }
      }

      if (!activeView?.file) {
        new Notice(
          "No active markdown file found. Please open a markdown file and try again.",
        );
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

      // Check if we're connected to AnkiConnect
      try {
        await this.ankiService.ping();
      } catch {
        new Notice(
          "Failed to connect to Anki. Please ensure AnkiConnect is running.",
        );
        return;
      }

      // Use settings from frontmatter or defaults
      const deck = frontmatter.ankiDeck || this.settings.defaultDeck;
      const noteType =
        frontmatter.ankiNoteType || this.settings.defaultNoteType;
      const fieldMappings = frontmatter.ankiFieldMappings || {};

      this.logger.log("Using note type:", noteType);
      this.logger.log("Using deck:", deck);
      this.logger.log("Field mappings:", fieldMappings);

      // Ensure we have the fields for this note type
      const availableFields = this.ankiService.getNoteTypeFields(noteType);
      if (!availableFields || availableFields.length === 0) {
        new Notice(`No fields found for note type: ${noteType}`);
        return;
      }

      this.logger.log("Available fields for note type:", availableFields);

      // Parse the content into flashcards
      let flashcards: AnkiCard[] = [];
      try {
        flashcards = parseContent(content, fieldMappings, availableFields);
        this.logger.log("Parsed flashcards:", flashcards);
      } catch (error) {
        new Notice(error.message);
        return;
      }

      if (flashcards.length === 0) {
        new Notice("No valid flashcards found in note");
        return;
      }

      // Send to Anki
      try {
        await this.ankiService.syncFlashcards(flashcards, deck, noteType);
      } catch (error) {
        this.logger.debug(error);
      }
      new Notice(`Successfully synced ${flashcards.length} cards to Anki`);
    } catch (error) {
      this.logger.error("Error in syncCurrentNoteToAnki:", error);
      new Notice(`Error syncing to Anki: ${error.message}`);
    }
  }
}
