import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface UploadedFile {
  file: File;
  url: string;
}

interface Document {
  title?: string;
  authors: string[];
  description?: string;
  categories: string[];
  fileName: string;
  thumbnailUrl: string;
  lastUpdated: string;
  isPublic: boolean;
  fileUrl?: string;
}

@Component({
  selector: 'app-my-uploads',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-uploads.component.html'
})
export class MyUploadsComponent {
  uploadedFiles: UploadedFile[] = [];
  documents: Document[] = [];

  newDocument: Document = {
    title: '',
    authors: [],
    description: '',
    categories: [],
    fileName: '',
    thumbnailUrl: '',
    lastUpdated: '',
    isPublic: false
  };

  showUploadForm = false;
  newCategory = '';
  newAuthor = '';

  async onFileSelected(event: any): Promise<void> {
    const file: File = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.newDocument.fileName = file.name;
      const url = URL.createObjectURL(file);
      this.uploadedFiles.push({ file, url });
      this.newDocument.fileUrl = url;

      // Generate thumbnail
      this.newDocument.thumbnailUrl = await this.generateThumbnail(file);
    } else {
      alert('Please select a PDF file.');
    }
  }

  async generateThumbnail(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e: any) => {
        const pdfData = new Uint8Array(e.target.result);
        try {
          const pdf = await (window as any).pdfjsLib.getDocument({ data: pdfData }).promise;
          const page = await pdf.getPage(1);
          const scale = 1.5;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport }).promise;
          resolve(canvas.toDataURL());
        } catch (error) {
          console.error('Error generating thumbnail:', error);
          resolve('/assets/pdf-placeholder.png');
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  async submitDocument(): Promise<void> {
    if (!this.newDocument.fileName) {
      alert('Please select a PDF file.');
      return;
    }

    const newDoc: Document = {
      ...this.newDocument,
      lastUpdated: 'Just now'
    };

    if (!newDoc.title) delete newDoc.title;
    if (!newDoc.description) delete newDoc.description;
    if (newDoc.authors.length === 0) newDoc.authors = ['Anonymous'];

    this.documents.unshift(newDoc);
    this.resetForm();
  }

  resetForm(): void {
    this.newDocument = {
      title: '',
      authors: [],
      description: '',
      categories: [],
      fileName: '',
      thumbnailUrl: '',
      lastUpdated: '',
      isPublic: false
    };
    this.uploadedFiles = [];
    this.showUploadForm = false;
    this.newCategory = '';
    this.newAuthor = '';
  }

  downloadDocument(document: Document): void {
    if (document.fileUrl) {
      window.open(document.fileUrl, '_blank');
    } else {
      console.error('No file URL available for', document.fileName);
    }
  }

  deleteDocument(document: Document): void {
    if (confirm(`Are you sure you want to delete "${document.title || document.fileName}"?`)) {
      this.documents = this.documents.filter(doc => doc.fileName !== document.fileName);
      this.uploadedFiles = this.uploadedFiles.filter(file => file.file.name !== document.fileName);
      if (document.fileUrl) {
        URL.revokeObjectURL(document.fileUrl);
      }
      console.log('Deleted', document.fileName);
    }
  }

  openFileUpload(): void {
    this.showUploadForm = true;
  }

  chatAboutDocument(document: Document): void {
    console.log('Opening chat for', document.title || document.fileName);
  }

  toggleVisibility(document: Document): void {
    document.isPublic = !document.isPublic;
    const action = document.isPublic ? 'public' : 'private';
    console.log(`${document.title || document.fileName} is now ${action}`);
  }

  addCategory(): void {
    if (this.newCategory && !this.newDocument.categories.includes(this.newCategory)) {
      this.newDocument.categories.push(this.newCategory);
      this.newCategory = '';
    }
  }

  removeCategory(category: string): void {
    this.newDocument.categories = this.newDocument.categories.filter(c => c !== category);
  }

  addAuthor(): void {
    if (this.newAuthor && !this.newDocument.authors.includes(this.newAuthor)) {
      this.newDocument.authors.push(this.newAuthor);
      this.newAuthor = '';
    }
  }

  removeAuthor(author: string): void {
    this.newDocument.authors = this.newDocument.authors.filter(a => a !== author);
  }

  clearImage(): void {
    this.newDocument.thumbnailUrl = '';
    this.newDocument.fileName = '';
    this.newDocument.fileUrl = '';
    this.uploadedFiles = [];
    const fileInput = document.getElementById('file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }
}