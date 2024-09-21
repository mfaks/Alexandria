import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FilterSidebarComponent } from '../filter-sidebar/filter-sidebar.component';
import { Router } from '@angular/router';
import { Document } from '../interfaces/shared/document.interface';
import { DocumentPopupComponent } from "../document-popup/document-popup.component";
import { DocumentFormComponent } from '../document-form/document-form.component';

@Component({
  selector: 'app-my-uploads',
  standalone: true,
  imports: [CommonModule, FilterSidebarComponent, DocumentPopupComponent, DocumentFormComponent],
  templateUrl: './my-uploads.component.html',
  styleUrls: ['./my-uploads.component.css']
})
export class MyUploadsComponent implements OnInit {
  documents: Document[] = [];
  filteredDocuments: Document[] = [];
  showUploadForm = false;
  isEditing = false;
  editingDocument: Document | null = null;

  showPopup = false;
  selectedDocument: Document | null = null;

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    this.loadDocuments();
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

  submitDocument(formData: { document: Document, file: File | null }): void {
    const { document, file } = formData;
    const formDataToSend = new FormData();

    formDataToSend.append('document', JSON.stringify(document));

    if (file) {
      formDataToSend.append('file', file);
    } else if (this.isEditing) {
      formDataToSend.append('keepExistingFile', 'true');
    }

    const headers = new HttpHeaders();

    if (this.isEditing && document._id) {
      this.http.put(`http://localhost:8000/update_document/${document._id}`, formDataToSend, { headers, withCredentials: true })
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
      this.http.post('http://localhost:8000/upload_document', formDataToSend, { headers, withCredentials: true })
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
    this.showUploadForm = false;
    this.isEditing = false;
    this.editingDocument = null;
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
    this.isEditing = false;
    this.editingDocument = null;
  }

  chatAboutDocument(document: Document): void {
    this.router.navigate(['/chat', document._id]);
  }

  editDocument(document: Document): void {
    this.isEditing = true;
    this.showUploadForm = true;
    this.editingDocument = { ...document };
    this.scrollToTop();
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