import { App, PluginSettingTab, Setting } from 'obsidian';
import ZettelkastenGraphPlugin from './main';

export class ZettelkastenGraphSettingTab extends PluginSettingTab {
    plugin: ZettelkastenGraphPlugin;

    constructor(app: App, plugin: ZettelkastenGraphPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Zettelkasten Graph Settings' });

        new Setting(containerEl)
            .setName('Zettelkasten Folder')
            .setDesc('Specify the folder path to scan for Zettelkasten notes. Leave empty to scan all files in the vault.')
            .addText(text => text
                .setPlaceholder('folder/path')
                .setValue(this.plugin.settings.folderPath)
                .onChange(async (value) => {
                    this.plugin.settings.folderPath = value;
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl('p', {
            text: 'The plugin will scan for files containing Zettelkasten numbering patterns like 21, 21.1, 21a, etc. within the specified folder.',
            cls: 'setting-item-description'
        });
    }
}
