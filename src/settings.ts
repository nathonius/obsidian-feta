import { App, PluginSettingTab, Setting } from 'obsidian';
import { FetaPlugin } from './plugin';

export class FetaSettingsTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: FetaPlugin) {
    super(app, plugin);
  }

  display() {
    // Prepare container
    this.containerEl.empty();
    this.containerEl.createEl('h2', { text: 'FETA (Folder JSON ExporT Addon) settings.' });

    // Build settings
    new Setting(this.containerEl)
      .setName('Show sidebar icon')
      .setDesc('Just a quick shortcut to open the exporter.')
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.showSidebarIcon).onChange((value) => {
          this.plugin.settings.showSidebarIcon = value;
          this.plugin.saveSettings();
        });
      });
  }
}
