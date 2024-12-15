import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FieldDecorator } from '@/field-decorator';
import { EditorView, Decoration } from '@codemirror/view';
import { JSDOM } from 'jsdom';

// Mock CodeMirror view module using factory function
vi.mock('@codemirror/view', () => {
    return {
        EditorView: vi.fn(),
        ViewUpdate: vi.fn(),
        ViewPlugin: {
            fromClass: vi.fn((cls) => {
                const mockView = {
                    state: {
                        doc: {
                            toString: () => `---
ankiDeck: "Test List"
ankiNoteType: "Basic"
ankiFieldMappings:
  Front: "Front"
  Back: "Back"
---

Front: Test content
**Back**: More content`,
                            sliceString: (from: number, to: number, includeEnd?: boolean) => {
                                const content = mockView.state.doc.toString();
                                return content.slice(from, to);
                            }
                        }
                    },
                    visibleRanges: [{ from: 0, to: 200 }]
                } as unknown as EditorView;

                const pluginInstance = new cls(mockView);
                const decorations = pluginInstance.buildDecorations(mockView);

                return {
                    constructor: cls,
                    extension: vi.fn(),
                    decorations
                }
            })
        },
        Decoration: {
            mark: vi.fn((config) => ({
                spec: config,
                map: vi.fn()
            }))
        }
    }
});

vi.mock('@/parser', () => {
    return {
      parseFrontmatter: vi.fn().mockReturnValue({
        ankiDeck: "Test List",
        ankiNoteType: "Basic",
        ankiFieldMappings: {
          Front: "Front",
          Back: "Back"
        }
      })
    };
  });


const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window as unknown as Window & typeof globalThis;
global.NodeFilter = dom.window.NodeFilter;

const createMockView = () => ({
    state: {
        doc: {
            toString: () => `---
ankiDeck: "Test List"
ankiNoteType: "Basic"
ankiFieldMappings:
  Front: "Front"
  Back: "Back"
---

Front: Test content
**Back**: More content`,
            sliceString: (from: number, to: number) => 
                mockView.state.doc.toString().slice(from, to)
        }
    },
    visibleRanges: [{ from: 0, to: 200 }]
}) as unknown as EditorView;

let mockView: EditorView;

describe('FieldDecorator', () => {
    let decorator: FieldDecorator;

    beforeEach(() => {
        vi.clearAllMocks();
        decorator = new FieldDecorator();
        mockView = createMockView();
    });

    describe('getColorForField', () => {
        it('should return consistent colors for the same field', () => {
            const color1 = decorator.getColorForField('Front');
            const color2 = decorator.getColorForField('Front');
            expect(color1).toBe(color2);
        });

        it('should return different colors for different fields', () => {
            const color1 = decorator.getColorForField('Front');
            const color2 = decorator.getColorForField('Back');
            expect(color1).not.toBe(color2);
        });
    });

    describe('createEditorExtension', () => {
        it('should create decorations for field markers', () => {
            const extension = decorator.createEditorExtension();
            expect(extension).toBeDefined();
    
            const PluginClass = (extension as any).constructor;
            const pluginInstance = new PluginClass(mockView);
    
            // Verify that Decoration.mark was called with correct styling
            expect(vi.mocked(Decoration.mark)).toHaveBeenCalledWith(
                expect.objectContaining({
                    class: 'anki-field-marker',
                    attributes: expect.objectContaining({
                        style: expect.stringContaining('background-color'),
                    }),
                })
            );
    
            // Verify decorations are created
            const decorations = pluginInstance.buildDecorations(mockView);
            expect(decorations).toBeDefined();
        });
    });
    

    describe('processContent', () => {
        it('should process HTML content and add field highlighting', () => {
            const el = document.createElement('div');
            const content = 'Front: Test content';
            el.textContent = content;
            
            const fieldMappings = {
                Front: 'Front'
            };

            decorator.processContent(el, fieldMappings);

            // Check that spans were created
            const spans = el.getElementsByTagName('span');
            expect(spans.length).toBeGreaterThan(0);
            
            // Find the field marker span
            const markerSpan = Array.from(spans).find(span => 
                span.className === 'anki-field-marker'
            );
            expect(markerSpan).toBeDefined();
            expect(markerSpan?.className).toBe('anki-field-marker');
            expect(markerSpan?.style.backgroundColor).toBeDefined();
        });

        it('should handle markdown formatting in field markers', () => {
            const el = document.createElement('div');
            const content = '**Front**: Test content';
            el.textContent = content;
            
            const fieldMappings = {
                Front: '**Front**'  // Include the markdown formatting in the field mapping
            };

            decorator.processContent(el, fieldMappings);

            // Find the field marker span
            const markerSpan = Array.from(el.getElementsByTagName('span')).find(span => 
                span.className === 'anki-field-marker'
            );
            expect(markerSpan).toBeDefined();
            expect(markerSpan?.className).toBe('anki-field-marker');
        });
    });
});