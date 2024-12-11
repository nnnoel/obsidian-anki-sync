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

### Basic Setup

1. Create a note in Obsidian
2. Add the following frontmatter to configure the sync:

```yaml
---
ankiDeck: "Your Deck Name"
ankiNoteType: "Your Note Type"
ankiFieldMappings:
  Front: "Front"
  Back: "Back"
  Usage: "Usage"
  Example: "Example"
  Context: "Context"
---
```

### Creating Cards

The plugin maps your note's content to Anki fields using `ankiFieldMappings`. Understanding this mapping is crucial:

- **Keys** (left side): The field names you'll use in your Obsidian note
- **Values** (right side): The corresponding field names in your Anki note type

For example, if you have an Anki note type called "Vietnamese" with fields `Front`, `Back`, `Usage`, `Example`, and `Context`, here's how to set it up:

1. First, set up the mapping in your note's frontmatter:
```yaml
---
ankiDeck: "Vietnamese"
ankiNoteType: "Vietnamese"
ankiFieldMappings:
  Front: "Front"      # Left: Use "Front" in note → Right: Maps to Anki's "Front" field
  Back: "Back"        # Left: Use "Back" in note → Right: Maps to Anki's "Back" field
  Usage: "Usage"      # Left: Use "Usage" in note → Right: Maps to Anki's "Usage" field
  Example: "Example"  # Left: Use "Example" in note → Right: Maps to Anki's "Example" field
  Context: "Context"  # Left: Use "Context" in note → Right: Maps to Anki's "Context" field
---
```

2. Then use the **left-side** keys in your note content:
```markdown
### **Front: Your Term**        # Matches "Front" from mapping
**Back:** Definition           # Matches "Back" from mapping
- Usage: How it's used        # Matches "Usage" from mapping
- Example: Example sentence   # Matches "Example" from mapping
- Context: Additional info    # Matches "Context" from mapping
```

You can customize the mapping to use different names in your notes. For example, if you prefer different field names in your notes:

```yaml
ankiFieldMappings:
  Word: "Front"         # Use "Word" in note instead of "Front"
  Meaning: "Back"       # Use "Meaning" in note instead of "Back"
  Notes: "Context"      # Use "Notes" in note instead of "Context"
```

Then your note would look like:
```markdown
### **Word: Your Term**         # Maps to Anki's "Front" field
**Meaning:** Definition        # Maps to Anki's "Back" field
- Notes: Additional info      # Maps to Anki's "Context" field
```

> **Important**: 
> - The **values** (right side) must exactly match your Anki note type field names
> - The **keys** (left side) can be whatever you prefer to use in your notes
> - The plugin looks for these keys in your note content when creating cards
> - Field names are case-sensitive on both sides
> - At minimum, you need mappings for `Front` and `Back` Anki fields
> - Any fields in your note that don't have a mapping will be ignored

You can create different mappings for different note types. For instance, if you have a simpler "Basic" note type in Anki with just `Front` and `Back` fields:

```yaml
---
ankiDeck: "Basic"
ankiNoteType: "Basic"
ankiFieldMappings:
  Question: "Front"    # Use "Question" in note → Maps to Anki's "Front" field
  Answer: "Back"       # Use "Answer" in note → Maps to Anki's "Back" field
---
```

Then your note would use these keys:
```markdown
### **Question: What is the capital of France?**
**Answer:** Paris
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
