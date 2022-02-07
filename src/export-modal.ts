import { Modal, Notice, Setting, TFolder } from 'obsidian';
import { SuggestModal } from './folder-suggest';
import { JSONExport } from './interfaces';

export class ExportModal extends Modal {
  private readonly suggestModal = new SuggestModal(this.app);
  private folderText = '';
  private requiredTag = '';
  private requiredFrontmatter = '';
  private renderHtml = false;
  callback: (
    folder: TFolder,
    renderHtml: boolean,
    requiredTag: string,
    requiredFrontmatter: string
  ) => Promise<JSONExport>;

  onOpen(): void {
    const folders = this.app.vault.getAllLoadedFiles().filter((f) => f instanceof TFolder) as TFolder[];
    this.contentEl.empty();

    const pathSetting = new Setting(this.contentEl)
      .setName('Export Root Path')
      .addText((text) => {
        text
          .setPlaceholder('Folder')
          .setValue(this.folderText)
          .onChange((value) => {
            this.folderText = value;
          });
      })
      .addExtraButton((button) => {
        button
          .setIcon('folder')
          .setTooltip('Select Folder')
          .onClick(() => {
            this.suggestModal.items = folders.map((f) => f.path);
            this.suggestModal.open();
            this.suggestModal.callback = (folderPath) => {
              this.folderText = folderPath;
              ((pathSetting.components[0] as any).inputEl as HTMLInputElement).value = this.folderText;
            };
          });
      });

    const tagSetting = new Setting(this.contentEl)
      .setName('Required Tag')
      .setDesc('Optional. Only notes with this tag will be included in the export.')
      .addText((text) => {
        text
          .setPlaceholder('Tag')
          .setValue(this.requiredTag)
          .onChange((value) => {
            this.requiredTag = value;
          });
      })
      .addExtraButton((button) => {
        button
          .setIcon('hashtag')
          .setTooltip('Select Tag')
          .onClick(() => {
            this.suggestModal.items = Object.keys((this.app.metadataCache as any).getTags());
            this.suggestModal.open();
            this.suggestModal.callback = (tag) => {
              if (typeof tag === 'string') {
                this.requiredTag = tag;
                ((tagSetting.components[0] as any).inputEl as HTMLInputElement).value = this.requiredTag;
              }
            };
          });
      });

    new Setting(this.contentEl)
      .setName('Required Frontmatter Key')
      .setDesc('Optional. Only notes with this frontmatter key (any value) will be included in the export.')
      .addText((text) => {
        text
          .setPlaceholder('Key')
          .setValue(this.requiredFrontmatter)
          .onChange((value) => {
            this.requiredFrontmatter = value;
          });
      });

    new Setting(this.contentEl).setName('Render HTML').addToggle((toggle) => {
      toggle.setValue(this.renderHtml).onChange((value) => {
        this.renderHtml = value;
      });
    });

    const exportButton = this.contentEl.createEl('button', { text: 'Export', cls: 'mod-cta' });
    exportButton.addEventListener('click', () => {
      const selectedFolder = folders.find((f) => f.path === this.folderText);
      if (selectedFolder) {
        this.exportFolder(selectedFolder, this.renderHtml, this.requiredTag, this.requiredFrontmatter);
      } else {
        new Notice(`Folder ${this.folderText} not found.`);
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
      const shade = document.body.createDiv();
      shade.style.width = '100vw';
      shade.style.height = '100vh';
      shade.style.backgroundColor = 'rgba(#000000, 0.5)';
      shade.style.pointerEvents = 'none';
      document.body.appendChild(shade);
      const jsonExport = await this.callback(folder, renderHtml, requiredTag, requiredFrontmatter);
      shade.detach();
      new Notice(`Exported ${jsonExport.meta.length} notes.`);
      this.close();
    }
  }
}
