import {
  Plugin,
  TFile,
  TFolder,
  FrontMatterCache,
  getAllTags,
  FileSystemAdapter,
  MarkdownView,
  EventRef
} from 'obsidian';
import { JSONExport, NoteMeta } from './interfaces';
import slugify from 'slugify';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { ExportModal } from './export-modal';

export class FetaPlugin extends Plugin {
  private readonly exportModal = new ExportModal(this.app);

  async onload(): Promise<void> {
    this.exportModal.callback = this.exportFolderToJSON.bind(this);
    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: 'json-export-plugin-export',
      name: 'Export folder to json',
      callback: () => {
        this.exportModal.open();
      }
    });
  }

  onunload(): void {}

  private get vaultBasePath(): string {
    return (this.app.vault.adapter as FileSystemAdapter).getBasePath();
  }

  // TODO: Figure out how to do this without recursion
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

  async saveExport(exported: JSONExport): Promise<void> {
    const outputPath = '.obsidian/plugins/json-export/export.json';
    const fullOutPath = join(this.vaultBasePath, outputPath);

    await writeFile(fullOutPath, JSON.stringify(exported));
  }

  async openFile(file: TFile): Promise<MarkdownView> {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    let eventRef: EventRef;
    const waitForRender = new Promise((resolve, _) => {
      if (this.app.workspace.getActiveFile() === file) {
        resolve(undefined);
      }
      eventRef = this.app.workspace.on('file-open', () => {
        resolve(undefined);
      });
      const result: any = {};
      activeView.setState({ file: file.path, mode: 'preview', source: false }, result);
    });
    await waitForRender;
    this.app.workspace.offref(eventRef);
    const waitForReady = new Promise((resolve, _) => {
      (activeView.previewMode as any).renderer.onRendered(() => {
        resolve(undefined);
      });
    });
    await waitForReady;
    return activeView;
  }
}
