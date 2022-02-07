import {
  Plugin,
  TFile,
  TFolder,
  FrontMatterCache,
  getAllTags,
  FileSystemAdapter,
  MarkdownView,
  EventRef,
  addIcon,
  Notice
} from 'obsidian';
import { DEFAULT_SETTINGS, FetaSettings, JSONExport, NoteMeta } from './interfaces';
import slugify from 'slugify';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { ExportModal } from './export-modal';
import { DEFAULT_EXPORT_PATH, FETA_ICON } from './constants';

export class FetaPlugin extends Plugin {
  private ribbonIcon: HTMLElement | null = null;
  private readonly exportModal = new ExportModal(this.app, this);
  settings: FetaSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    // Load settings
    const savedData: FetaSettings | undefined = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);

    // Register icon
    addIcon(FETA_ICON.iconId, FETA_ICON.svgContent);

    // Add ribbon icon if enabled
    if (this.settings.showSidebarIcon) {
      this.addFetaIcon();
    }

    // Set up export callback
    this.exportModal.callback = this.exportFolderToJSON.bind(this);

    // Add export command
    this.addCommand({
      id: 'json-export-plugin-export',
      name: 'Export folder to json',
      callback: () => {
        this.exportModal.open();
      },
      icon: 'feta-cheese'
    });
  }

  onunload(): void {}

  /**
   * Get the full path to the vault
   */
  get vaultBasePath(): string {
    return (this.app.vault.adapter as FileSystemAdapter).getBasePath();
  }

  /**
   * Recursively get all nested note children of a folder
   */
  private getChildNotes(folder: TFolder, filterFn?: (file: TFile) => boolean): TFile[] {
    const childNotes: TFile[] = [];
    folder.children.forEach((child) => {
      if (child instanceof TFile && child.extension === 'md') {
        if (filterFn && filterFn(child)) {
          childNotes.push(child);
        } else if (!filterFn) {
          childNotes.push(child);
        }
      } else if (child instanceof TFolder) {
        childNotes.push(...this.getChildNotes(child));
      }
    });
    return childNotes;
  }

  /**
   * Top level export, gathers the export data for each file
   */
  async exportFolderToJSON(
    folder: TFolder,
    renderHtml: boolean,
    requiredTag: string,
    requiredFrontmatter: string
  ): Promise<JSONExport> {
    const files = this.getChildNotes(folder);
    const jsonExport: JSONExport = { meta: [], notes: {} };
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await this.exportFileToJSON(file, renderHtml, requiredTag, requiredFrontmatter);
      if (result) {
        jsonExport.meta.push(result.meta);
        jsonExport.notes[result.meta.slug] = result;
      }
    }
    await this.saveExport(jsonExport);
    return jsonExport;
  }

  /**
   * File level export, checks if a file should be exported,
   * then renders it and returns HTML + metadata
   */
  async exportFileToJSON(
    file: TFile,
    renderHtml: boolean,
    requiredTag: string,
    requiredFrontmatter: string
  ): Promise<{ meta: NoteMeta; content: string } | null> {
    const fileCache = this.app.metadataCache.getFileCache(file);
    const tags = getAllTags(fileCache);
    const frontmatterCache = fileCache.frontmatter;

    // Check for required tag
    if (requiredTag && !tags.includes(requiredTag)) {
      return null;
    }

    // Check for required frontmatter key
    if (requiredFrontmatter && (!frontmatterCache || !Object.keys(frontmatterCache).includes(requiredFrontmatter))) {
      return null;
    }

    let fileContent = await this.app.vault.cachedRead(file);
    let frontmatter: Omit<FrontMatterCache, 'position'> = {};
    if (frontmatterCache) {
      const position = frontmatterCache.position;
      frontmatter = { ...frontmatterCache };
      delete frontmatter.position;
      fileContent = fileContent
        .split('\n')
        .slice(position.end.line + 1)
        .join('\n')
        .trim();
    }

    if (renderHtml) {
      const host = await this.openFile(file);
      fileContent = (host.previewMode as any).renderer.previewEl.innerHTML;
    }

    const meta: NoteMeta = {
      slug: slugify(file.name),
      frontmatter,
      tags,
      title: file.name,
      stat: file.stat,
      path: file.path
    };

    return { meta, content: fileContent };
  }

  /**
   * Save the output of the export to the filesystem
   */
  async saveExport(exported: JSONExport): Promise<void> {
    let exportPath = this.settings.exportLocation;
    if (!this.settings.exportLocation) {
      exportPath = join(this.vaultBasePath, DEFAULT_EXPORT_PATH);
    }

    try {
      await writeFile(exportPath, JSON.stringify(exported));
      new Notice(`Exported ${exported.meta.length} notes to ${exportPath}.`);
    } catch {
      new Notice(`Failed to export ${exported.meta.length} notes to ${exportPath}.`);
    }
  }

  /**
   * Open a note in preview mode and wait until rendering is done
   */
  async openFile(file: TFile): Promise<MarkdownView> {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    let eventRef: EventRef;

    // Ensure the file is open in preview mode
    await new Promise((resolve, _) => {
      const result: any = {};

      // File is already open. Ensure we are in preview mode.
      if (this.app.workspace.getActiveFile() === file) {
        activeView.setState({ file: file.path, mode: 'preview', source: false }, result);
        resolve(undefined);
      }

      // File is not open. Listen for the file to be opened.
      eventRef = this.app.workspace.on('file-open', () => {
        resolve(undefined);
      });
      activeView.setState({ file: file.path, mode: 'preview', source: false }, result);
    });
    this.app.workspace.offref(eventRef);

    // Wait for render to finish
    await new Promise((resolve, _) => {
      (activeView.previewMode as any).renderer.onRendered(() => {
        resolve(undefined);
      });
    });

    // Return the active view when the file has been rendered
    return activeView;
  }

  /**
   * Save changes to settings and add/remove the ribbon icon
   * as needed
   */
  async saveSettings(): Promise<void> {
    if (this.settings.showSidebarIcon) {
      this.addFetaIcon();
    } else {
      this.removeFetaIcon();
    }
    await this.saveData(this.settings);
  }

  /**
   * Adds the ribbon icon if it's not already there.
   */
  private addFetaIcon(): void {
    if (this.ribbonIcon === null) {
      this.ribbonIcon = this.addRibbonIcon('feta-cheese', 'FETA Export', () => {
        this.exportModal.open();
      });
    }
  }

  /**
   * Removes the ribbon icon if it's there.
   */
  private removeFetaIcon(): void {
    if (this.ribbonIcon) {
      this.ribbonIcon.detach();
      this.ribbonIcon = null;
    }
  }
}
