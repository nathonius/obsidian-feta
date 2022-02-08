import { App, Modal, Notice, Setting, TFolder } from 'obsidian';
import { join } from 'path';
import { DEFAULT_EXPORT_PATH } from './constants';
import { SuggestModal } from './folder-suggest';
import { JSONExport } from './interfaces';
import { FetaPlugin } from './plugin';

export class ExportModal extends Modal {
  private working = false;
  private readonly suggestModal = new SuggestModal(this.app);
  callback: (
    folder: TFolder,
    renderHtml: boolean,
    requiredTag: string,
    requiredFrontmatter: string
  ) => Promise<JSONExport>;

  constructor(app: App, private readonly plugin: FetaPlugin) {
    super(app);
    this.containerEl.addClass('feta-export--modal');
  }

  onClose(): void {
    this.working = false;
  }

  onOpen(): void {
    const folders = this.app.vault.getAllLoadedFiles().filter((f) => f instanceof TFolder) as TFolder[];
    this.contentEl.empty();

    // Build header
    const exportHeader = this.contentEl.createEl('h3');
    exportHeader.createSpan({ text: 'F', cls: 'feta-export--bold-title' });
    exportHeader.createSpan({ text: 'older JSON ' });
    exportHeader.createSpan({ text: 'E', cls: 'feta-export--bold-title' });
    exportHeader.createSpan({ text: 'xpor' });
    exportHeader.createSpan({ text: 'T', cls: 'feta-export--bold-title' });
    exportHeader.createSpan({ text: ' ' });
    exportHeader.createSpan({ text: 'A', cls: 'feta-export--bold-title' });
    exportHeader.createSpan({ text: 'ddon 🧀' });

    // Add root path setting
    const pathSetting = new Setting(this.contentEl)
      .setName('Export root path 📁')
      .setDesc('Required. Notes in this folder and subfolders will be included in export.')
      .addExtraButton((button) => {
        button
          .setIcon('folder')
          .setTooltip('Select Folder')
          .onClick(() => {
            this.suggestModal.items = folders.map((f) => f.path);
            this.suggestModal.open();
            this.suggestModal.callback = (folderPath) => {
              this.plugin.settings.rootFolder = folderPath;
              this.plugin.saveSettings();
              ((pathSetting.components[1] as any).inputEl as HTMLInputElement).value = folderPath;
            };
          });
      })
      .addText((text) => {
        text
          .setPlaceholder('Folder')
          .setValue(this.plugin.settings.rootFolder)
          .onChange((value) => {
            this.plugin.settings.rootFolder = value;
            this.plugin.saveSettings();
          });
      });

    // Add required tag setting
    const tagSetting = new Setting(this.contentEl)
      .setName('Required tag 🏷️')
      .setDesc('Optional. Only notes with this tag will be included in the export.')
      .addExtraButton((button) => {
        button
          .setIcon('hashtag')
          .setTooltip('Select Tag')
          .onClick(() => {
            this.suggestModal.items = Object.keys((this.app.metadataCache as any).getTags());
            this.suggestModal.open();
            this.suggestModal.callback = (tag) => {
              this.plugin.settings.requiredTag = tag;
              this.plugin.saveSettings();
              ((tagSetting.components[1] as any).inputEl as HTMLInputElement).value = tag;
            };
          });
      })
      .addText((text) => {
        text
          .setPlaceholder('Tag')
          .setValue(this.plugin.settings.requiredTag)
          .onChange((value) => {
            this.plugin.settings.requiredTag = value;
            this.plugin.saveSettings();
          });
      });

    // Add required frontmatter key setting
    new Setting(this.contentEl)
      .setName('Required frontmatter key 🔑')
      .setDesc('Optional. Only notes with this frontmatter key (any value) will be included in the export.')
      .addText((text) => {
        text
          .setPlaceholder('Key')
          .setValue(this.plugin.settings.requiredFrontmatterKey)
          .onChange((value) => {
            this.plugin.settings.requiredFrontmatterKey = value;
            this.plugin.saveSettings();
          });
      });

    // Add low-fat no html setting
    new Setting(this.contentEl)
      .setName('Render HTML 🐮')
      .setDesc('Disable for low-fat mode to export the raw markdown.')
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.renderHtml).onChange((value) => {
          this.plugin.settings.renderHtml = value;
          this.plugin.saveSettings();
        });
      });

    // Add export path setting
    new Setting(this.contentEl)
      .setClass('feta-export--output-path')
      .setName('Export file 📤')
      .setDesc(
        'Defaults to the plugin folder, should be the fully qualified path including the .json extension. The folder should already exist.'
      )
      .addTextArea((textArea) => {
        textArea
          .setPlaceholder(join(this.plugin.vaultBasePath, DEFAULT_EXPORT_PATH))
          .setValue(this.plugin.settings.exportLocation)
          .onChange((value) => {
            this.plugin.settings.exportLocation = value;
            this.plugin.saveSettings();
          });
      });

    // Add ribbon icon toggle
    new Setting(this.contentEl)
      .setName('Show ribbon icon 🧀')
      .setDesc('Just a quick shortcut to open the exporter.')
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.showSidebarIcon).onChange((value) => {
          this.plugin.settings.showSidebarIcon = value;
          this.plugin.saveSettings();
        });
      });

    const exportButton = this.contentEl.createEl('button', {
      text: 'Export',
      cls: 'mod-cta feta-export--export-button'
    });
    exportButton.addEventListener('click', () => {
      if (this.plugin.settings.rootFolder && !this.working) {
        const selectedFolder = folders.find((f) => f.path === this.plugin.settings.rootFolder);
        if (selectedFolder) {
          this.exportFolder(
            selectedFolder,
            this.plugin.settings.renderHtml,
            this.plugin.settings.requiredTag,
            this.plugin.settings.requiredFrontmatterKey
          );
        } else {
          new Notice(`Folder ${this.plugin.settings.rootFolder} not found.`);
        }
      }
    });
  }

  async exportFolder(
    folder: TFolder,
    renderHtml: boolean,
    requiredTag: string,
    requiredFrontmatter: string
  ): Promise<void> {
    if (folder) {
      this.working = true;
      await this.callback(folder, renderHtml, requiredTag, requiredFrontmatter);
      this.working = false;
      this.close();
    }
  }
}
