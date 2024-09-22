import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FilterSidebarComponent } from '../filter-sidebar/filter-sidebar.component';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SearchService } from '../search.service';
import { FormsModule } from '@angular/forms';
import { Document } from '../interfaces/shared/document.interface';
import { DocumentPopupComponent } from '../document-popup/document-popup.component';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, FilterSidebarComponent, FormsModule, DocumentPopupComponent],
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.css']
})
export class LibraryComponent implements OnInit {
  documents: Document[] = [];
  filteredDocuments: Document[] = [];
  currentUserEmail: string = '';
  semanticSearchQuery: string = '';
  isLibraryRoute: boolean = false;

  showPopup: boolean = false;
  selectedDocument: Document | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private searchService: SearchService
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isLibraryRoute = event.url.includes('/library');
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['search']) {
        this.semanticSearchQuery = params['search'];
        this.performSemanticSearch();
      } else {
        this.loadPublicDocuments();
      }
    });
    this.getCurrentUser();
  }

  getCurrentUser() {
    this.http.get<{ email: string }>('http://localhost:8000/user_info', { withCredentials: true })
      .subscribe(
        (response) => {
          this.currentUserEmail = response.email;
        },
        (error) => {
          console.error('Error getting current user ID:', error);
        }
      );
  }

  loadPublicDocuments() {
    this.http.get<Document[]>('http://localhost:8000/public_documents', { withCredentials: true })
      .subscribe(
        (documents) => {
          this.documents = documents.map(doc => ({
            ...doc,
            thumbnailUrl: `http://localhost:8000/thumbnail/${doc._id}`,
            uploadedBy: doc.uploadedBy || doc.user_email
          }));
          this.filteredDocuments = this.documents;
        },
        (error) => {
          console.error('Error loading public documents:', error);
        }
      );
  }

  performSemanticSearch() {
    if (this.semanticSearchQuery) {
      this.searchService.searchDocuments(this.semanticSearchQuery).subscribe(
        (results: any[]) => {
          this.documents = results.map(doc => ({
            ...doc,
            uploadedBy: doc.uploadedBy || doc.user_email || 'Unknown',
            thumbnailUrl: `http://localhost:8000/thumbnail/${doc._id}`
          }));
          this.documents = this.documents.filter(doc =>
            this.isLibraryRoute ?
              (doc.isPublic || doc.user_email === this.currentUserEmail) : doc.isPublic
          );
          this.filteredDocuments = this.documents;
        },
        (error) => {
          console.error('Error searching documents:', error);
        }
      );
    } else {
      this.loadPublicDocuments();
    }
  }

  applyFilters(filters: any) {
    console.log('Received filters:', filters);

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

      const uploadedByMatch = filters.uploadedBy === 'all' ||
        (filters.uploadedBy === 'me' && doc.uploadedBy === this.currentUserEmail) ||
        (filters.uploadedBy === 'others' && doc.uploadedBy !== this.currentUserEmail);

      return titleMatch && authorMatch && categoryMatch && visibilityMatch && uploadedByMatch;
    });

    this.filteredDocuments.sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));
    
    console.log('Filtered documents:', this.filteredDocuments);
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

  chatAboutDocument(document: Document): void {
    this.router.navigate(['/chat', document._id]);
  }

  isCurrentUserDocument(document: Document): boolean {
    return document.user_email === this.currentUserEmail;
  }

  navigateToMyUploads(): void {
    this.router.navigate(['/my-uploads']);
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