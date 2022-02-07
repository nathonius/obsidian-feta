import { App, FuzzySuggestModal } from 'obsidian';

/**
 * Generic string suggest modal
 */
export class SuggestModal extends FuzzySuggestModal<string> {
  items: Array<string> = [];
  callback: (choice: string) => unknown;

  constructor(app: App) {
    super(app);
  }

  getItems(): Array<string> {
    return this.items;
  }

  getItemText(item: string): string {
    return item;
  }

  onChooseItem(item: string): void {
    if (this.callback) {
      this.callback(item);
    }
    this.close();
  }
}
