import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-document-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-popup.component.html',
  styleUrl: './document-popup.component.css'
})
export class DocumentPopupComponent {
  @Input() showPopup: boolean = false;
  @Input() document: any;
  @Output() close = new EventEmitter<void>();

  closePopup() {
    this.close.emit();
  }
}