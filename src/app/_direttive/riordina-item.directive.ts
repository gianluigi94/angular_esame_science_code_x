import { Directive, EventEmitter, HostBinding, HostListener, Input, Output } from '@angular/core';

@Directive({ selector: '[riordinaItem]' })
export class RiordinaItemDirective {
  @Input() indiceStagione = 0;
  @Input() indiceEpisodio = -1;

  @Output() inizioTrascinamento = new EventEmitter<{ stagione: number; episodio: number }>();
  @Output() rilascio = new EventEmitter<{ stagione: number; episodio: number }>();

  @HostBinding('class.trascina-sopra') trascinaSopra = false;
  @HostBinding('class.in-trascinamento') inTrascinamento = false;

  @HostListener('dragstart', ['$event']) onDragStart(e: DragEvent): void {
    if (this.indiceEpisodio < 0) return;
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(this.indiceEpisodio));
    }
    this.inTrascinamento = true;
    this.inizioTrascinamento.emit({ stagione: this.indiceStagione, episodio: this.indiceEpisodio });
  }

  @HostListener('dragend') onDragEnd(): void {
    this.inTrascinamento = false;
    this.trascinaSopra = false;
  }

  @HostListener('dragover', ['$event']) onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    this.trascinaSopra = true;
  }

  @HostListener('dragleave', ['$event']) onDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.trascinaSopra = false;
  }

  @HostListener('drop', ['$event']) onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.trascinaSopra = false;
    this.rilascio.emit({ stagione: this.indiceStagione, episodio: this.indiceEpisodio });
  }
}
