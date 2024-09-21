import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FilterSidebarComponent } from '../filter-sidebar/filter-sidebar.component';
import { Router } from '@angular/router';
import { Document } from '../interfaces/shared/document.interface';

@Component({
  selector: 'app-my-uploads',
  standalone: true,
  imports: [CommonModule, FormsModule, FilterSidebarComponent],
  templateUrl: './my-uploads.component.html',
  styleUrls: ['./my-uploads.component.css']
})
export class MyUploadsComponent implements OnInit {
  documents: Document[] = [];
  filteredDocuments: Document[] = [];
  newDocument: Document = this.getEmptyDocument();
  showUploadForm = false;
  newCategory = '';
  newAuthor = '';
  isEditing = false;
  selectedFile: File | null = null;
  preloadedFileName: string | null = null;

  showPopup = false;
  selectedDocument: Document | null = null;

  @ViewChild('uploadForm') uploadForm!: NgForm;
  formSubmitted = false;

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    this.loadDocuments();
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

  loadDocuments() {
    this.http.get<Document[]>('http://localhost:8000/user_documents', { withCredentials: true })
      .subscribe(
        (documents) => {
          this.documents = documents;
          this.filteredDocuments = documents;
        },
        (error) => {
          console.error('Error loading documents:', error);
        }
      );
  }

  applyFilters(filters: any) {
    this.filteredDocuments = this.documents.filter(doc => {
      const titleMatch = !filters.documentSearch || 
        doc.title.toLowerCase().includes(filters.documentSearch.toLowerCase());

      const authorMatch = !filters.authors || filters.authors.length === 0 ||
        doc.authors.some(author => filters.authors.includes(author));

      const categoryMatch = !filters.categories || filters.categories.length === 0 ||
        doc.categories.some(category => filters.categories.includes(category));

      const visibilityMatch = filters.visibility === 'all' ||
        (filters.visibility === 'public' && doc.isPublic) ||
        (filters.visibility === 'private' && !doc.isPublic);

      return titleMatch && authorMatch && categoryMatch && visibilityMatch;
    });
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.selectedFile = file;
      this.newDocument.fileName = file.name;
      this.preloadedFileName = null;
    } else {
      alert('Please select a PDF file.');
    }
  }

  validateAndSubmit(): void {
    this.formSubmitted = true;

    if (this.uploadForm.form.valid && 
        this.newDocument.authors.length > 0 && 
        (this.isEditing || this.selectedFile)) {
      this.submitDocument();
    } else {
      console.error('Form is invalid. Please check all required fields.');
    }
  }

  submitDocument(): void {
    const formData = new FormData();

    const documentData = {
      title: this.newDocument.title,
      authors: this.newDocument.authors,
      description: this.newDocument.description,
      categories: this.newDocument.categories,
      isPublic: this.newDocument.isPublic
    };

    formData.append('document', JSON.stringify(documentData));

    if (this.selectedFile) {
      formData.append('file', this.selectedFile);
    } else if (this.isEditing && this.preloadedFileName) {
      formData.append('keepExistingFile', 'true');
    }

    const headers = new HttpHeaders();

    if (this.isEditing && this.newDocument._id) {
      this.http.put(`http://localhost:8000/update_document/${this.newDocument._id}`, formData, { headers, withCredentials: true })
        .subscribe(
          () => {
            this.loadDocuments();
            this.resetForm();
          },
          (error) => {
            console.error('Error updating document:', error);
          }
        );
    } else {
      this.http.post('http://localhost:8000/upload_document', formData, { headers, withCredentials: true })
        .subscribe(
          () => {
            this.loadDocuments();
            this.resetForm();
          },
          (error) => {
            console.error('Error uploading document:', error);
          }
        );
    }
  }

  resetForm(): void {
    this.newDocument = this.getEmptyDocument();
    this.selectedFile = null;
    this.preloadedFileName = null;
    this.showUploadForm = false;
    this.isEditing = false;
    this.newCategory = '';
    this.newAuthor = '';
    this.formSubmitted = false;
  }

  downloadDocument(document: Document): void {
    if (document._id) {
      this.http.get(`http://localhost:8000/download_document/${document._id}`, {
        responseType: 'blob',
        withCredentials: true
      }).subscribe(
        (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);

          const a = window.document.createElement('a');
          a.href = url;
          a.download = document.fileName || 'document.pdf';
          window.document.body.appendChild(a);
          a.click();
          window.document.body.removeChild(a);

          window.open(url, '_blank');

          setTimeout(() => window.URL.revokeObjectURL(url), 100);
        },
        (error) => {
          console.error('Error downloading document:', error);
          alert('Error downloading document. Please try again.');
        }
      );
    } else {
      console.error('Document ID is missing');
      alert('Unable to download document. Document ID is missing.');
    }
  }

  deleteDocument(document: Document): void {
    if (confirm(`Are you sure you want to delete "${document.title || document.fileName}"?`)) {
      this.http.delete(`http://localhost:8000/delete_document/${document._id}`, { withCredentials: true })
        .subscribe(
          () => {
            this.loadDocuments();
          },
          (error) => {
            console.error('Error deleting document:', error);
          }
        );
    }
  }

  openFileUpload(): void {
    this.showUploadForm = true;
  }

  chatAboutDocument(document: Document): void {
    this.router.navigate(['/chat', document._id]);
  }

  editDocument(document: Document): void {
    this.isEditing = true;
    this.showUploadForm = true;
    this.newDocument = { ...document };
    this.preloadedFileName = document.fileName;
    this.scrollToTop();
  }

  addCategory(): void {
    if (this.newCategory.trim()) {
      if (!this.newDocument.categories.includes(this.newCategory.trim())) {
        this.newDocument.categories.push(this.newCategory.trim());
      }
      this.newCategory = '';
    }
  }

  removeCategory(category: string): void {
    this.newDocument.categories = this.newDocument.categories.filter(c => c !== category);
  }

  addAuthor(): void {
    if (this.newAuthor.trim()) {
      if (!this.newDocument.authors.includes(this.newAuthor.trim())) {
        this.newDocument.authors.push(this.newAuthor.trim());
      }
      this.newAuthor = '';
    }
  }

  removeAuthor(author: string): void {
    this.newDocument.authors = this.newDocument.authors.filter(a => a !== author);
  }

  clearImage(): void {
    this.newDocument.thumbnailUrl = '';
    this.newDocument.fileName = '';
    this.selectedFile = null;
    const fileInput = document.getElementById('file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showDescription(document: Document): void {
    this.selectedDocument = document;
    this.showPopup = true;
  }

  closePopup(): void {
    this.showPopup = false;
    this.selectedDocument = null;
  }
}