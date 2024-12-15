import { Logger } from "./logger";
import { NoteTypeFields } from "./settings";

export interface AnkiCard {
  [field: string]: string;
}

export interface AnkiNote {
  noteId: number;
  fields: {
    [key: string]: {
      value: string;
      order: number;
    };
  };
}

export class AnkiService {
  private noteTypeFields: NoteTypeFields = {};

  constructor(
    private ankiConnectUrl: string,
    private logger: Logger,
  ) {}

  async invokeAnkiConnect(action: string, params = {}) {
    try {
      const response = await fetch(this.ankiConnectUrl, {
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

  getNoteTypeFields(noteType: string): string[] {
    return this.noteTypeFields[noteType];
  }

  async addNote(noteType: string, fields: AnkiCard, deckName: string) {
    return this.invokeAnkiConnect("addNote", {
      note: {
        modelName: noteType,
        deckName: deckName,
        fields: fields,
        options: {
          allowDuplicate: false,
          duplicateScope: "deck",
        },
      },
    });
  }

  async updateNote(noteId: number, fields: AnkiCard) {
    return this.invokeAnkiConnect("updateNoteFields", {
      note: {
        id: noteId,
        fields: fields,
      },
    });
  }

  async findNotes(query: string): Promise<number[]> {
    return this.invokeAnkiConnect("findNotes", { query });
  }

  async notesInfo(noteIds: number[]): Promise<AnkiNote[]> {
    return this.invokeAnkiConnect("notesInfo", { notes: noteIds });
  }

  async ping() {
    return this.invokeAnkiConnect("version");
  }

  async multiAction(actions: { action: string; params: any }[]) {
    return this.invokeAnkiConnect("multi", { actions });
  }

  async ensureDeckExists(deckName: string): Promise<boolean> {
    try {
      const decks = await this.invokeAnkiConnect("deckNames");
      if (!decks.includes(deckName)) {
        await this.invokeAnkiConnect("createDeck", { deck: deckName });
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error("Failed to check/create deck:", error);
      throw new Error(`Failed to ensure deck exists: ${error.message}`);
    }
  }

  async syncFlashcards(
    flashcards: AnkiCard[],
    deck: string,
    noteType: string,
  ): Promise<void> {
    try {
      // Ensure deck exists before adding cards
      await this.ensureDeckExists(deck);
      this.logger.log(`Sending ${flashcards.length} cards to Anki...`);

      // First, find all existing notes in the deck
      const query = `"deck:${deck}"`;
      const existingNoteIds = await this.findNotes(query);
      this.logger.log(
        `Found ${existingNoteIds?.length || 0} existing notes in deck`,
      );

      if (existingNoteIds && existingNoteIds.length > 0) {
        // Get info for all existing notes
        const existingNotes = await this.notesInfo(existingNoteIds);

        // Create a map of Front field to note ID for quick lookup
        const existingNoteMap = new Map(
          existingNotes.map((note: AnkiNote) => [
            note.fields.Front.value,
            note.noteId,
          ]),
        );
        this.logger.log("Created map of existing notes");

        // Separate cards into new and updates
        const newCards: typeof flashcards = [];
        const updateCards: { id: number; fields: AnkiCard }[] = [];

        for (const card of flashcards) {
          const existingNoteId = existingNoteMap.get(card.Front);
          if (typeof existingNoteId === "number") {
            updateCards.push({
              id: existingNoteId,
              fields: card,
            });
          } else {
            newCards.push(card);
          }
        }

        this.logger.log(
          `Found ${updateCards.length} cards to update and ${newCards.length} new cards`,
        );

        // Bulk update existing notes
        if (updateCards.length > 0) {
          const updateActions = updateCards.map((card) => ({
            action: "updateNoteFields",
            params: {
              note: {
                id: card.id,
                fields: card.fields,
              },
            },
          }));

          this.logger.log("Updating existing notes...");
          await this.multiAction(updateActions);
        }

        // Add new cards
        if (newCards.length > 0) {
          const addActions = newCards.map((card) => ({
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
          await this.multiAction(addActions);
        }
      } else {
        // No existing notes, add all as new
        const addActions = flashcards.map((card) => ({
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
        await this.multiAction(addActions);
      }

      this.logger.log("Successfully synced all cards");
    } catch (error) {
      this.logger.error("Failed in syncFlashcards:", error);
      throw new Error(`Failed to sync cards: ${error.message}`);
    }
  }
}
