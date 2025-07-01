import { ItemView, WorkspaceLeaf, Setting, Notice } from 'obsidian';
import { ZettelkastenParser, ZettelGraph, ZettelNode } from './zettelkasten-parser';
import { GraphRenderer } from './graph-renderer';
import { NoteCreator } from './note-creator';
import ZettelkastenGraphPlugin from './main';

export const ZETTELKASTEN_GRAPH_VIEW_TYPE = "zettelkasten-graph-view";

export class ZettelkastenGraphView extends ItemView {
    private plugin: ZettelkastenGraphPlugin;
    private parser: ZettelkastenParser;
    private renderer: GraphRenderer;
    private noteCreator: NoteCreator;
    private currentGraph: ZettelGraph | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: ZettelkastenGraphPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.parser = new ZettelkastenParser(this.app.vault);
        this.noteCreator = new NoteCreator(this.app.vault, this.parser);
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
                .setValue(this.plugin.settings.folderPath)
                .onChange(async (value) => {
                    this.plugin.settings.folderPath = value;
                    await this.plugin.saveSettings();
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

        // Initialize renderer with note creation callbacks
        const noteCreationCallbacks = {
            onCreateSequential: this.createSequentialNote.bind(this),
            onCreateBranch: this.createBranchNote.bind(this),
            onDeleteNote: this.deleteNote.bind(this)
        };
        this.renderer = new GraphRenderer(graphContainer, this.app.workspace, noteCreationCallbacks);

        // Initialize node manipulator with vault and parser
        this.renderer.initializeNodeManipulator(this.app.vault, this.parser);

        // Load initial graph
        await this.refreshGraph();
    }

    async onClose() {
        if (this.renderer) {
            this.renderer.destroy();
        }
    }

    async refreshGraph() {
        try {
            // Show loading state
            const graphContainer = this.containerEl.querySelector('.zettelkasten-graph-container') as HTMLElement;
            if (graphContainer) {
                graphContainer.empty();
                const loadingDiv = graphContainer.createDiv('zettelkasten-loading-state');
                loadingDiv.textContent = 'Loading graph...';
            }

            // Parse zettelkasten
            const folderPath = this.plugin.settings.folderPath.trim() || undefined;
            this.currentGraph = await this.parser.parseZettelkasten(folderPath);

            // Re-initialize renderer with fresh container
            if (graphContainer) {
                graphContainer.empty();
                const noteCreationCallbacks = {
                    onCreateSequential: this.createSequentialNote.bind(this),
                    onCreateBranch: this.createBranchNote.bind(this),
                    onDeleteNote: this.deleteNote.bind(this)
                };
                this.renderer = new GraphRenderer(graphContainer, this.app.workspace, noteCreationCallbacks);

                // Initialize node manipulator with vault and parser
                this.renderer.initializeNodeManipulator(this.app.vault, this.parser);

                if (this.currentGraph.nodes.size > 0) {
                    this.renderer.render(this.currentGraph);
                } else {
                    const emptyDiv = graphContainer.createDiv('zettelkasten-empty-state');
                    emptyDiv.textContent = 'No Zettelkasten notes found. Make sure your files contain numbering patterns like 21, 21.1, 21a, etc.';
                }
            }

            // Update stats
            this.updateStats();

        } catch (error) {
            console.error('Error refreshing Zettelkasten graph:', error);
            const graphContainer = this.containerEl.querySelector('.zettelkasten-graph-container') as HTMLElement;
            if (graphContainer) {
                graphContainer.empty();
                const errorDiv = graphContainer.createDiv('zettelkasten-error-state');
                errorDiv.textContent = `Error loading graph: ${error.message}`;
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

        const totalNodes = this.currentGraph.nodes.size;
        const sequenceNodes = Array.from(this.currentGraph.nodes.values()).filter(n => n.type === 'sequence').length;
        const branchNodes = Array.from(this.currentGraph.nodes.values()).filter(n => n.type === 'branch').length;
        const rootNodes = this.currentGraph.roots.length;

        // Create stats content using DOM API
        const titleDiv = statsDiv.createDiv();
        titleDiv.createEl('strong', { text: 'Graph Statistics:' });

        statsDiv.createDiv({ text: `Total Notes: ${totalNodes}` });
        statsDiv.createDiv({ text: `Sequential Notes: ${sequenceNodes}` });
        statsDiv.createDiv({ text: `Branch Notes: ${branchNodes}` });
        statsDiv.createDiv({ text: `Root Notes: ${rootNodes}` });
    }

    async onResize() {
        // Refresh the graph when the view is resized
        if (this.renderer && this.currentGraph) {
            const graphContainer = this.containerEl.querySelector('.zettelkasten-graph-container') as HTMLElement;
            if (graphContainer) {
                const noteCreationCallbacks = {
                    onCreateSequential: this.createSequentialNote.bind(this),
                    onCreateBranch: this.createBranchNote.bind(this),
                    onDeleteNote: this.deleteNote.bind(this)
                };
                this.renderer = new GraphRenderer(graphContainer, this.app.workspace, noteCreationCallbacks);
                this.renderer.initializeNodeManipulator(this.app.vault, this.parser);
                this.renderer.render(this.currentGraph);
            }
        }
    }

    private async createSequentialNote(node: ZettelNode) {
        try {
            if (!this.currentGraph) {
                new Notice('No graph loaded');
                return;
            }

            const newFile = await this.noteCreator.createSequentialNote(
                node,
                this.currentGraph,
                this.plugin.settings.folderPath
            );

            if (newFile) {
                new Notice(`Created sequential note: ${newFile.basename}`);

                // Refresh the graph to show the new note (preserving current view)
                await this.refreshGraphStable();

                // Optionally open the new note for editing
                this.app.workspace.getLeaf().openFile(newFile);
            } else {
                new Notice('Failed to create sequential note');
            }
        } catch (error) {
            console.error('Error creating sequential note:', error);
            new Notice('Error creating sequential note');
        }
    }

    private async createBranchNote(node: ZettelNode) {
        try {
            if (!this.currentGraph) {
                new Notice('No graph loaded');
                return;
            }

            const newFile = await this.noteCreator.createBranchNote(
                node,
                this.currentGraph,
                this.plugin.settings.folderPath
            );

            if (newFile) {
                new Notice(`Created branch note: ${newFile.basename}`);

                // Refresh the graph to show the new note (preserving current view)
                await this.refreshGraphStable();

                // Optionally open the new note for editing
                this.app.workspace.getLeaf().openFile(newFile);
            } else {
                new Notice('Failed to create branch note');
            }
        } catch (error) {
            console.error('Error creating branch note:', error);
            new Notice('Error creating branch note');
        }
    }

    private async deleteNote(node: ZettelNode) {
        try {
            // Show confirmation dialog
            const confirmed = await this.showDeleteConfirmation(node);
            if (!confirmed) {
                return;
            }

            // Delete the file using fileManager to respect user preferences
            await this.app.fileManager.trashFile(node.file);

            new Notice(`Deleted note: ${node.file.basename}`);

            // Refresh the graph to reflect the deletion
            await this.refreshGraphStable();

        } catch (error) {
            console.error('Error deleting note:', error);
            new Notice('Error deleting note');
        }
    }

    private async showDeleteConfirmation(node: ZettelNode): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'zettelkasten-delete-modal';

            const dialog = document.createElement('div');
            dialog.className = 'zettelkasten-delete-dialog';

            const message = document.createElement('p');
            message.className = 'zettelkasten-delete-message';
            message.textContent = `Are you sure you want to delete "${node.file.basename}"?`;

            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'zettelkasten-delete-buttons';

            const cancelButton = document.createElement('button');
            cancelButton.className = 'zettelkasten-delete-button-cancel';
            cancelButton.textContent = 'Cancel';

            const deleteButton = document.createElement('button');
            deleteButton.className = 'zettelkasten-delete-button-confirm';
            deleteButton.textContent = 'Delete';

            const cleanup = () => {
                document.body.removeChild(modal);
            };

            cancelButton.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });

            deleteButton.addEventListener('click', () => {
                cleanup();
                resolve(true);
            });

            // Close on escape key
            const handleKeydown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve(false);
                    document.removeEventListener('keydown', handleKeydown);
                }
            };
            document.addEventListener('keydown', handleKeydown);

            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(deleteButton);
            dialog.appendChild(message);
            dialog.appendChild(buttonContainer);
            modal.appendChild(dialog);
            document.body.appendChild(modal);
        });
    }

    private async refreshGraphStable() {
        try {
            // Parse zettelkasten data
            const folderPath = this.plugin.settings.folderPath.trim() || undefined;
            this.currentGraph = await this.parser.parseZettelkasten(folderPath);

            // Update the graph without re-initializing the renderer
            if (this.renderer && this.currentGraph.nodes.size > 0) {
                this.renderer.render(this.currentGraph);
            }

            // Update stats
            this.updateStats();

        } catch (error) {
            console.error('Error refreshing Zettelkasten graph:', error);
            // Fall back to full refresh if stable refresh fails
            await this.refreshGraph();
        }
    }
}
