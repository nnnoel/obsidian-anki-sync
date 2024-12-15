# Obsidian Anki Sync Plugin

A work-in-progress plugin for [Obsidian](https://obsidian.md) that syncs your notes to [Anki](https://apps.ankiweb.net/) flashcards with smart duplicate handling and bulk operations. **This plugin is not yet published to the official Obsidian Community Plugins list.** You can still use it by manually installing it from this repository.

## Features

- 🔄 Sync markdown notes to Anki flashcards
- 🎯 Smart duplicate detection and updating
- ⚡️ Efficient bulk operations
- 🗂 Custom deck and note type support
- 🔧 Configurable field mappings
- 📝 Support for multiple note formats
- ✨ In-editor highlighting of fields

## Installation

1. **Set up AnkiConnect**:
   - Install [AnkiConnect](https://ankiweb.net/shared/info/2055492159) in Anki
   - Configure AnkiConnect to accept requests from Obsidian:
     - In Anki, go to Tools > Add-ons > AnkiConnect > Config
     - Replace the existing configuration with:
       ```json
       {
           "webCorsOriginList": [
               "app://obsidian.md"
           ]
       }
       ```
     - Click "Save" and restart Anki
2. **Install the Plugin Manually**:
   - Download or clone this repository to your local machine.
   - Build or copy the plugin files into your `<vault>/.obsidian/plugins/obsidian-anki-sync` folder.

3. **Enable the Plugin**:
   - Open Obsidian’s Settings > Community Plugins
   - Enable "Third-party plugins" if prompted.
   - Find the "Obsidian Anki Sync" plugin in the list (or refresh if needed) and enable it.

> **Important**: If you skip the CORS configuration step, the plugin won't be able to communicate with Anki and you'll see connection errors.

## Usage

### Prerequisites

1. **Anki Note Type**: Create and configure your desired note type in Anki first.
   - The plugin does not create note types.
   - If the specified note type doesn't exist, sync will fail.

### Field Mappings

Field mappings link your note’s structured sections to Anki’s fields. For example:

```json
{
  "Word": "Front",
  "Meaning": "Back",
  "Context": "Context"
}
```

**Requirements:**

- Values must match Anki fields exactly (case-sensitive).
- Map at least the required fields (e.g., Front/Back).
- Unmapped fields in your notes are ignored.

### Example Note

```markdown
---
ankiDeck: "Vocabulary"
ankiNoteType: "Vocabulary"
ankiFieldMappings:
  Word: "Front"
  Meaning: "Back"
  Context: "Context"
---

### Word: Hello
### Meaning: A greeting
### Context: "Hello, world!"
```

### Syncing

- Use the command palette and search for "Sync current Note to Anki Flashcards"
- Click the sync icon in the ribbon (if available)
- Use the hotkey (configurable in Settings)

## Configuration

### Plugin Settings

- Default Deck: The default Anki deck to sync to
- Default Note Type: The default note type to use
- AnkiConnect URL: The URL where AnkiConnect is running (default: <http://localhost:8765>)

### Note-specific Settings

Set per-note overrides in frontmatter:

```yaml
ankiDeck: "Custom Deck"
ankiNoteType: "Custom Note Type"
ankiFieldMappings:
  CustomField: "AnkiField"
```

## For Developers

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## Support

- [Report issues](https://github.com/nnnoel/obsidian-anki-sync/issues)
- [Request features](https://github.com/nnnoel/obsidian-anki-sync/issues)

## License

MIT License. See [LICENSE](LICENSE) for details.

## Acknowledgments

- [Obsidian](https://obsidian.md) for the amazing platform
- [AnkiConnect](https://ankiweb.net/shared/info/2055492159) for making this integration possible