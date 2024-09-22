import { Component, Input, Output, EventEmitter, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Document } from '../interfaces/shared/document.interface';

@Component({
  selector: 'app-document-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './document-form.component.html',
  styleUrls: ['./document-form.component.css']
})
export class DocumentFormComponent implements OnInit {
  @Input() set document(value: Document | null | undefined) {
    this._document = value || this.getEmptyDocument();
  }
  get document(): Document {
    return this._document;
  }
  private _document: Document = this.getEmptyDocument();

  @Input() isEditing = false;
  @Output() formSubmit = new EventEmitter<{ document: Document, file: File | null }>();
  @Output() formCancel = new EventEmitter<void>();

  @ViewChild('documentForm') documentForm!: NgForm;

  newCategory = '';
  newAuthor = '';
  selectedFile: File | null = null;
  preloadedFileName: string | null = null;
  formSubmitted = false;

  ngOnInit() {
    if (this.isEditing) {
      this.preloadedFileName = this.document.fileName;
    }
  }

  getEmptyDocument(): Document {
    return {
      _id: '',
      title: '',
      authors: [],
      description: '',
      categories: [],
      fileName: '',
      thumbnailUrl: '',
      lastUpdated: '',
      isPublic: false,
      user_email: '',
      similarity_score: 0,
      uploadedBy: ''
    };
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.selectedFile = file;
      this.document.fileName = file.name;
      this.preloadedFileName = null;
    } else {
      alert('Please select a PDF file.');
    }
  }

  validateAndSubmit(): void {
    this.formSubmitted = true;

    if (this.documentForm.form.valid && 
        this.document.authors.length > 0 && 
        (this.isEditing || this.selectedFile)) {
      this.formSubmit.emit({ document: this.document, file: this.selectedFile });
    } else {
      console.error('Form is invalid. Please check all required fields.');
    }
  }

  addCategory(): void {
    if (this.newCategory.trim()) {
      if (!this.document.categories.includes(this.newCategory.trim())) {
        this.document.categories.push(this.newCategory.trim());
      }
      this.newCategory = '';
    }
  }

  removeCategory(category: string): void {
    this.document.categories = this.document.categories.filter(c => c !== category);
  }

  addAuthor(): void {
    if (this.newAuthor.trim()) {
      if (!this.document.authors.includes(this.newAuthor.trim())) {
        this.document.authors.push(this.newAuthor.trim());
      }
      this.newAuthor = '';
    }
  }

  removeAuthor(author: string): void {
    this.document.authors = this.document.authors.filter(a => a !== author);
  }

  cancel(): void {
    this.formCancel.emit();
  }
}