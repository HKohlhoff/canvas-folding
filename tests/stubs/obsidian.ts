export class App {}

export class Modal {
  readonly contentEl = new StubElement();
  title = "";

  constructor(readonly app: App) {}

  open(): void {
    this.onOpen();
  }

  close(): void {
    this.onClose();
  }

  onOpen(): void {}

  onClose(): void {}

  setTitle(title: string): void {
    this.title = title;
  }
}

export class Setting {
  name = "";
  desc = "";
  readonly buttons: StubButton[] = [];
  readonly settingEl = new StubElement();

  constructor(containerEl: StubElement) {
    containerEl.settings.push(this);
  }

  setName(name: string): this {
    this.name = name;
    return this;
  }

  setDesc(desc: string): this {
    this.desc = desc;
    return this;
  }

  addButton(callback: (button: StubButton) => void): this {
    const button = new StubButton();
    this.buttons.push(button);
    callback(button);
    return this;
  }
}

export function setIcon(): void {
  // Obsidian renders icons at runtime; manager cleanup tests do not need them.
}

class StubButton {
  destructive = false;
  onClickCallback: (() => void | Promise<void>) | null = null;
  text = "";

  setButtonText(text: string): this {
    this.text = text;
    return this;
  }

  setDestructive(): this {
    this.destructive = true;
    return this;
  }

  onClick(callback: () => void | Promise<void>): this {
    this.onClickCallback = callback;
    return this;
  }
}

class StubElement {
  readonly children: StubElement[] = [];
  readonly classes = new Set<string>();
  readonly settings: Setting[] = [];
  textContent = "";

  addClass(className: string): void {
    this.classes.add(className);
  }

  empty(): void {
    this.children.length = 0;
    this.settings.length = 0;
  }

  createEl(_tag: string, options?: { cls?: string; text?: string }): StubElement {
    const child = new StubElement();
    if (options?.cls) child.addClass(options.cls);
    child.textContent = options?.text ?? "";
    this.children.push(child);
    return child;
  }
}
