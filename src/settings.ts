import { App, PluginSettingTab, Setting } from "obsidian";
import type AnkiSyncPlugin from "./main";

export interface AnkiSyncSettings {
  defaultDeck: string;
  defaultNoteType: string;
  ankiConnectUrl: string;
}

export interface NoteTypeFields {
  [noteType: string]: string[];
}

export interface NoteFrontmatter {
  ankiDeck?: string;
  ankiNoteType?: string;
  ankiFieldMappings?: {
    [key: string]: string;
  };
}

export const DEFAULT_SETTINGS: AnkiSyncSettings = {
  defaultDeck: "Default",
  defaultNoteType: "Basic",
  ankiConnectUrl: "http://localhost:8765",
};

export class AnkiSyncSettingTab extends PluginSettingTab {
  plugin: AnkiSyncPlugin;

  constructor(app: App, plugin: AnkiSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Anki Sync Settings" });

    new Setting(containerEl)
      .setName("Default Deck")
      .setDesc("Default Anki deck to sync notes to")
      .addText((text) =>
        text
          .setPlaceholder("Enter deck name")
          .setValue(this.plugin.settings.defaultDeck)
          .onChange(async (value) => {
            this.plugin.settings.defaultDeck = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Default Note Type")
      .setDesc("Default Anki note type to use")
      .addText((text) =>
        text
          .setPlaceholder("Enter note type")
          .setValue(this.plugin.settings.defaultNoteType)
          .onChange(async (value) => {
            this.plugin.settings.defaultNoteType = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("AnkiConnect URL")
      .setDesc("URL for AnkiConnect (usually http://localhost:8765)")
      .addText((text) =>
        text
          .setPlaceholder("Enter URL")
          .setValue(this.plugin.settings.ankiConnectUrl)
          .onChange(async (value) => {
            this.plugin.settings.ankiConnectUrl = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
