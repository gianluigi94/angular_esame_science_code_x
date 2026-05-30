import { Directive, EventEmitter, HostBinding, HostListener, Output } from '@angular/core';

@Directive({ selector: '[dragdrop]' })
export class DragdropDirective {
  @Output() alRilascio = new EventEmitter<File[]>();
  @Output() inizioLettura = new EventEmitter<void>();
  @HostBinding('class.drag-over') dragOver = false;

  @HostListener('dragover', ['$event']) onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.dragOver = true;
  }

  @HostListener('dragleave', ['$event']) onDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.dragOver = false;
  }

  @HostListener('drop', ['$event']) async onDrop(e: DragEvent): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    this.dragOver = false;

    if (!e.dataTransfer) return;

    this.inizioLettura.emit();

    const files = await this.leggiElementiTrascinati(e.dataTransfer);
    this.alRilascio.emit(files);
  }

  async leggiElementiTrascinati(dataTransfer: DataTransfer): Promise<File[]> {
    const elementi = Array.from(dataTransfer.items);
    const files: File[] = [];

    for (const elemento of elementi) {
      const elementoConEntry = elemento as DataTransferItem & {
        webkitGetAsEntry?: () => FileSystemEntry;
      };

      const entry = elementoConEntry.webkitGetAsEntry?.();

      if (entry) {
        const filesEntry = await this.leggiEntry(entry);
        files.push(...filesEntry);
      } else {
        const file = elemento.getAsFile();
        if (file) files.push(file);
      }
    }

    return files;
  }

  async leggiEntry(entry: FileSystemEntry): Promise<File[]> {
    if (entry.isFile) {
      return [await this.leggiFileDaEntry(entry as FileSystemFileEntry)];
    }

    if (entry.isDirectory) {
      return await this.leggiCartellaDaEntry(entry as FileSystemDirectoryEntry);
    }

    return [];
  }

  leggiFileDaEntry(entry: FileSystemFileEntry): Promise<File> {
    return new Promise(resolve => {
      entry.file(file => {
        Object.defineProperty(file, 'webkitRelativePath', {
          value: entry.fullPath.replace(/^\//, ''),
        });

        resolve(file);
      });
    });
  }

  leggiCartellaDaEntry(entry: FileSystemDirectoryEntry): Promise<File[]> {
    return new Promise(resolve => {
      const reader = entry.createReader();
      const files: File[] = [];

      const leggiBatch = (): void => {
        reader.readEntries(async entries => {
          if (entries.length === 0) {
            resolve(files);
            return;
          }

          for (const elemento of entries) {
            const filesElemento = await this.leggiEntry(elemento);
            files.push(...filesElemento);
          }

          leggiBatch();
        });
      };

      leggiBatch();
    });
  }
}
