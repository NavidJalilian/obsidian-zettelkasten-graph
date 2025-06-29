import { ItemView, WorkspaceLeaf, Setting, ButtonComponent } from 'obsidian';
import { ZettelkastenParser, ZettelGraph } from './zettelkasten-parser';
import { GraphRenderer } from './graph-renderer';
import ZettelkastenGraphPlugin from './main';

export const ZETTELKASTEN_GRAPH_VIEW_TYPE = "zettelkasten-graph-view";

export class ZettelkastenGraphView extends ItemView {
    private plugin: ZettelkastenGraphPlugin;
    private parser: ZettelkastenParser;
    private renderer: GraphRenderer;
    private currentGraph: ZettelGraph | null = null;
    private selectedFolder: string = "";

    constructor(leaf: WorkspaceLeaf, plugin: ZettelkastenGraphPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.parser = new ZettelkastenParser(this.app.vault);
    }

    getViewType(): string {
        return ZETTELKASTEN_GRAPH_VIEW_TYPE;
    }

    getDisplayText(): string {
        return "Zettelkasten Graph";
    }

    getIcon(): string {
        return "git-fork";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass("zettelkasten-graph-view");

        // Create controls section
        const controlsDiv = container.createDiv("zettelkasten-controls");
        
        // Folder selection
        const folderSetting = new Setting(controlsDiv)
            .setName("Zettelkasten Folder")
            .setDesc("Select folder to scan for Zettelkasten notes (leave empty for all files)");

        folderSetting.addText(text => {
            text.setPlaceholder("folder/path")
                .setValue(this.selectedFolder)
                .onChange(async (value) => {
                    this.selectedFolder = value;
                });
        });

        // Refresh button
        folderSetting.addButton(button => {
            button.setButtonText("Refresh Graph")
                .setTooltip("Scan files and refresh the graph")
                .onClick(async () => {
                    await this.refreshGraph();
                });
        });

        // Graph container
        const graphContainer = container.createDiv("zettelkasten-graph-container");
        graphContainer.style.width = "100%";
        graphContainer.style.height = "calc(100% - 100px)";
        graphContainer.style.border = "1px solid var(--background-modifier-border)";
        graphContainer.style.borderRadius = "4px";

        // Initialize renderer
        this.renderer = new GraphRenderer(graphContainer, this.app.workspace);

        // Load initial graph
        await this.refreshGraph();
    }

    async onClose() {
        if (this.renderer) {
            this.renderer.destroy();
        }
    }

    private async refreshGraph() {
        try {
            // Show loading state
            const graphContainer = this.containerEl.querySelector('.zettelkasten-graph-container') as HTMLElement;
            if (graphContainer) {
                graphContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted);">Loading graph...</div>';
            }

            // Parse zettelkasten
            const folderPath = this.selectedFolder.trim() || undefined;
            this.currentGraph = await this.parser.parseZettelkasten(folderPath);

            // Re-initialize renderer with fresh container
            if (graphContainer) {
                graphContainer.innerHTML = '';
                this.renderer = new GraphRenderer(graphContainer, this.app.workspace);
                
                if (this.currentGraph.nodes.size > 0) {
                    this.renderer.render(this.currentGraph);
                } else {
                    graphContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted);">No Zettelkasten notes found. Make sure your files contain numbering patterns like 21, 21.1, 21a, etc.</div>';
                }
            }

            // Update stats
            this.updateStats();

        } catch (error) {
            console.error('Error refreshing Zettelkasten graph:', error);
            const graphContainer = this.containerEl.querySelector('.zettelkasten-graph-container') as HTMLElement;
            if (graphContainer) {
                graphContainer.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-error);">Error loading graph: ${error.message}</div>`;
            }
        }
    }

    private updateStats() {
        if (!this.currentGraph) return;

        const controlsDiv = this.containerEl.querySelector('.zettelkasten-controls') as HTMLElement;
        if (!controlsDiv) return;

        // Remove existing stats
        const existingStats = controlsDiv.querySelector('.zettelkasten-stats');
        if (existingStats) {
            existingStats.remove();
        }

        // Add new stats
        const statsDiv = controlsDiv.createDiv('zettelkasten-stats');
        statsDiv.style.marginTop = '10px';
        statsDiv.style.padding = '10px';
        statsDiv.style.backgroundColor = 'var(--background-secondary)';
        statsDiv.style.borderRadius = '4px';
        statsDiv.style.fontSize = '0.9em';

        const totalNodes = this.currentGraph.nodes.size;
        const sequenceNodes = Array.from(this.currentGraph.nodes.values()).filter(n => n.type === 'sequence').length;
        const branchNodes = Array.from(this.currentGraph.nodes.values()).filter(n => n.type === 'branch').length;
        const rootNodes = this.currentGraph.roots.length;

        statsDiv.innerHTML = `
            <div><strong>Graph Statistics:</strong></div>
            <div>Total Notes: ${totalNodes}</div>
            <div>Sequential Notes: ${sequenceNodes}</div>
            <div>Branch Notes: ${branchNodes}</div>
            <div>Root Notes: ${rootNodes}</div>
        `;
    }

    async onResize() {
        // Refresh the graph when the view is resized
        if (this.renderer && this.currentGraph) {
            const graphContainer = this.containerEl.querySelector('.zettelkasten-graph-container') as HTMLElement;
            if (graphContainer) {
                this.renderer = new GraphRenderer(graphContainer, this.app.workspace);
                this.renderer.render(this.currentGraph);
            }
        }
    }
}
