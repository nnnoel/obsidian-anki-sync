import { App, MarkdownPostProcessorContext, MarkdownView, Plugin, TFile } from "obsidian";
import { FieldDecorator } from "./field-decorator";
import { parseFrontmatter } from "./parser";

export class FieldDecorationManager {
    constructor(
        private app: App,
        private fieldDecorator: FieldDecorator
    ) {}

    public registerDecorations(plugin: Plugin) {
        plugin.registerEditorExtension([
            this.fieldDecorator.createEditorExtension()
        ]);

        plugin.registerMarkdownPostProcessor(this.handleMarkdownProcess.bind(this));

        plugin.registerEvent(
            this.app.workspace.on("file-open", this.handleFileOpen.bind(this))
        );
    }

    private handleMarkdownProcess(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        const cache = ctx.getSectionInfo(el);
        if (!cache) return;

        const content = cache.text;
        const frontmatter = parseFrontmatter(content);
        if (frontmatter?.ankiFieldMappings) {
            this.fieldDecorator.processContent(el, frontmatter.ankiFieldMappings);
        }
    }

    private async handleFileOpen(file: TFile | undefined) {
        if (!file) return;

        // Force a refresh of the view to trigger the markdown processor
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view) {
            view.previewMode.rerender(true);
        }
    }
}