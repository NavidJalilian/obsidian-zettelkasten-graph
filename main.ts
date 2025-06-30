import { Plugin, WorkspaceLeaf } from 'obsidian';
import { ZettelkastenGraphView, ZETTELKASTEN_GRAPH_VIEW_TYPE } from './graph-view';
import { ZettelkastenGraphSettingTab } from './settings-tab';

export interface ZettelkastenGraphSettings {
    folderPath: string;
}

export const DEFAULT_SETTINGS: ZettelkastenGraphSettings = {
    folderPath: ""
};

export default class ZettelkastenGraphPlugin extends Plugin {
    settings: ZettelkastenGraphSettings;

    async onload() {
        await this.loadSettings();
        console.log('Loading Zettelkasten Graph Plugin');

        // Register the custom view
        this.registerView(
            ZETTELKASTEN_GRAPH_VIEW_TYPE,
            (leaf) => new ZettelkastenGraphView(leaf, this)
        );

        // Add settings tab
        this.addSettingTab(new ZettelkastenGraphSettingTab(this.app, this));

        // Add ribbon icon
        this.addRibbonIcon('git-fork', 'Open Zettelkasten Graph', () => {
            this.activateView();
        });

        // Add command to open the view
        this.addCommand({
            id: 'open-zettelkasten-graph',
            name: 'Open Zettelkasten Graph',
            callback: () => {
                this.activateView();
            }
        });

        // Add command to refresh the current graph
        this.addCommand({
            id: 'refresh-zettelkasten-graph',
            name: 'Refresh Zettelkasten Graph',
            callback: () => {
                const leaves = this.app.workspace.getLeavesOfType(ZETTELKASTEN_GRAPH_VIEW_TYPE);
                if (leaves.length > 0) {
                    const view = leaves[0].view as ZettelkastenGraphView;
                    // Trigger refresh by calling the private method through any
                    (view as any).refreshGraph();
                }
            }
        });

        // Auto-open the view on startup if it was previously open
        this.app.workspace.onLayoutReady(() => {
            const leaves = this.app.workspace.getLeavesOfType(ZETTELKASTEN_GRAPH_VIEW_TYPE);
            if (leaves.length === 0) {
                // Optionally auto-open the view on first load
                // this.activateView();
            }
        });
    }

    async onunload() {
        console.log('Unloading Zettelkasten Graph Plugin');
        
        // Close all instances of the view
        this.app.workspace.detachLeavesOfType(ZETTELKASTEN_GRAPH_VIEW_TYPE);
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(ZETTELKASTEN_GRAPH_VIEW_TYPE);

        if (leaves.length > 0) {
            // A leaf with our view already exists, use that
            leaf = leaves[0];
        } else {
            // Our view could not be found in the workspace, create a new leaf
            // in the right sidebar for it
            leaf = workspace.getRightLeaf(false);
            await leaf?.setViewState({ type: ZETTELKASTEN_GRAPH_VIEW_TYPE, active: true });
        }

        // "Reveal" the leaf in case it is in a collapsed sidebar
        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
