import { Extension, RangeSetBuilder } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { parseFrontmatter } from "./parser";

export interface FieldHighlight {
    field: string;
    color: string;
}

// The FieldDecorator class is responsible for identifying and highlighting 
// specific "fields" within a text document, as determined by frontmatter 
// metadata (e.g., "ankiFieldMappings"). By parsing frontmatter and analyzing 
// the document's text, it locates occurrences of these fields, then visually 
// highlights them in the editor (through a CodeMirror extension) or in plain 
// HTML content (for non-editor scenarios). This helps users quickly see and 
// identify fields of interest within their notes or documents.
export class FieldDecorator {
    private colors: Map<string, string> = new Map();
    private colorGenerator: () => string;
    
    constructor() {
        this.colorGenerator = this.createColorGenerator();
    }

    private createColorGenerator(): () => string {
        const hues = [0, 60, 120, 180, 240, 300]; // Different base hues
        let i = 0;
        return () => {
            const hue = hues[i % hues.length];
            i++;
            return `hsla(${hue}, 70%, 80%, 0.3)`; // Pastel colors with 0.3 opacity
        };
    }

    public getColorForField(field: string): string {
        if (!this.colors.has(field)) {
            this.colors.set(field, this.colorGenerator());
        }
        return this.colors.get(field)!;
    }

    public createEditorExtension(): Extension {
        const plugin = this;
        
        return ViewPlugin.fromClass(class {
            decorations: DecorationSet;

            constructor(view: EditorView) {
                this.decorations = this.buildDecorations(view);
            }

            update(update: ViewUpdate) {
                if (update.docChanged || update.viewportChanged) {
                    this.decorations = this.buildDecorations(update.view);
                }
            }

            destroy() {}

            buildDecorations(view: EditorView): DecorationSet {
                const builder = new RangeSetBuilder<Decoration>();
                const doc = view.state.doc;
                const content = doc.toString();
                const frontmatter = parseFrontmatter(content);
                
                if (!frontmatter?.ankiFieldMappings) {
                    return builder.finish();
                }

                // Find all field markers in the visible range
                const visibleRanges = view.visibleRanges;
                const matches: { pos: number, length: number, color: string }[] = [];

                for (let { from, to } of visibleRanges) {
                    const text = doc.sliceString(from, to);
                    
                    Object.entries(frontmatter.ankiFieldMappings).forEach(([ankiField, obsidianField]) => {
                        const color = plugin.getColorForField(ankiField);
                        // Capture the entire field including formatting
                        const pattern = new RegExp(`([*_~]{0,2}${obsidianField}[*_~]{0,2}):`, 'g');
                        let match;
                        
                        while ((match = pattern.exec(text)) !== null) {
                            const startPos = from + match.index;
                            const fieldLength = match[1].length;
                            
                            matches.push({
                                pos: startPos,
                                length: fieldLength,
                                color
                            });
                        }
                    });
                }

                // Sort matches by position
                matches.sort((a, b) => a.pos - b.pos);

                // Add decorations
                matches.forEach(({ pos, length, color }) => {
                    const mark = Decoration.mark({
                        class: "anki-field-marker",
                        attributes: { 
                            style: `background-color: ${color} !important; 
                                   border-right: none !important;
                                   border-left: none !important;
                                   user-select: text !important;
                                   cursor: text !important;`
                        }
                    });
                    builder.add(pos, pos + length, mark);
                });

                return builder.finish();
            }
        }, {
            decorations: v => v.decorations
        });
    }

    public processContent(el: HTMLElement, fieldMappings: Record<string, string>) {
        // Process text nodes
        const walker = document.createTreeWalker(
            el,
            NodeFilter.SHOW_TEXT,
            null,
        );

        const textNodes: Text[] = [];
        let node: Text | null;
        while ((node = walker.nextNode() as Text)) {
            textNodes.push(node);
        }

        // Process each text node
        textNodes.forEach(textNode => {
            Object.entries(fieldMappings).forEach(([ankiField, obsidianField]) => {
                const color = this.getColorForField(ankiField);
                const pattern = `${obsidianField}:`;
                const content = textNode.textContent || "";
                let pos = content.indexOf(pattern);
                
                if (pos === -1) return;

                const fragments: (string | HTMLElement)[] = [];
                let lastPos = 0;

                while (pos !== -1) {
                    // Add text before match
                    if (pos > lastPos) {
                        fragments.push(content.slice(lastPos, pos));
                    }

                    // Create highlighted span for match
                    const span = document.createElement('span');
                    span.className = 'anki-field-marker';
                    span.textContent = pattern;
                    span.style.backgroundColor = `${color} !important`;
                    fragments.push(span);

                    lastPos = pos + pattern.length;
                    pos = content.indexOf(pattern, lastPos);
                }

                // Add remaining text
                if (lastPos < content.length) {
                    fragments.push(content.slice(lastPos));
                }

                // Replace text node if we found matches
                if (fragments.length > 1) {
                    const container = document.createElement('span');
                    fragments.forEach(fragment => {
                        if (typeof fragment === 'string') {
                            container.appendChild(document.createTextNode(fragment));
                        } else {
                            container.appendChild(fragment);
                        }
                    });
                    textNode.replaceWith(container);
                }
            });
        });
    }
}
