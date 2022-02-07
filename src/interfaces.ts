import { FileStats } from 'obsidian';

export interface NoteMeta {
  title: string;
  slug: string;
  frontmatter: { [key: string]: any };
  tags: string[];
  stat: FileStats;
  path: string;
}

export interface ExportedNote {
  meta: NoteMeta;
  content: string;
}

export interface JSONExport {
  meta: NoteMeta[];
  notes: Record<string, ExportedNote>;
}
