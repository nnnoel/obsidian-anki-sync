# Obsidian Anki Sync Plugin

A plugin for [Obsidian](https://obsidian.md) that syncs your notes to [Anki](https://apps.ankiweb.net/) flashcards with smart duplicate handling and bulk operations.

## Features

- 🔄 Sync markdown notes to Anki flashcards
- 🎯 Smart duplicate detection and updating
- ⚡️ Efficient bulk operations
- 🗂 Custom deck and note type support
- 🔧 Configurable field mappings
- 📝 Support for multiple note formats

## Installation

1. Install [AnkiConnect](https://ankiweb.net/shared/info/2055492159) in Anki
2. Configure AnkiConnect to accept requests from Obsidian:
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
3. Install this plugin in Obsidian via Community Plugins
4. Configure your default deck and note type in plugin settings

> **Important**: If you skip the CORS configuration step, the plugin won't be able to communicate with Anki and you'll see connection errors.

## Usage

### Prerequisites

1. **Anki Note Type**: Create your desired note type in Anki *before* using this plugin
   - The plugin does not create note types automatically
   - If the specified note type doesn't exist, sync will fail with an error

### Field Mappings

Field mappings connect your note content to Anki fields. The left side (keys) are what you'll use in your notes, and the right side (values) must match your Anki note type fields exactly:

```json
{
  "Word": "Front",        // Your note's "Word" section → Anki's "Front" field
  "Meaning": "Back",      // Your note's "Meaning" section → Anki's "Back" field
  "Context": "Context"    // Your note's "Context" section → Anki's "Context" field
}
```

**Requirements:**
- Values must exactly match existing Anki note type fields (case-sensitive)
- At minimum, map the required fields for your note type (usually Front/Back)
- Unmapped fields in your notes will be ignored

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

- Click the sync icon in the ribbon
- Use the command palette and search for "Sync current note to Anki"
- Use the hotkey (configurable in Settings)

## Configuration

### Plugin Settings

- Default Deck: The default Anki deck to sync to
- Default Note Type: The default note type to use
- AnkiConnect URL: The URL where AnkiConnect is running (default: http://localhost:8765)

### Note-specific Settings

Override default settings using frontmatter in individual notes:

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
- All contributors who have helped improve this plugin
