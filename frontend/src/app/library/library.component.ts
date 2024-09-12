import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FilterSidebarComponent } from '../filter-sidebar/filter-sidebar.component';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

interface Document {
  _id?: string;
  title: string;
  authors: string[];
  description?: string;
  categories: string[];
  fileName: string;
  thumbnailUrl: string;
  lastUpdated: string;
  isPublic: boolean;
  fileUrl?: string;
  user_email: string;
}

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, FilterSidebarComponent],
  templateUrl: './library.component.html'
})
export class LibraryComponent implements OnInit {
  documents: Document[] = [];
  filteredDocuments: Document[] = [];
  currentUserEmail: string = '';
  searchQuery: string | null = null;
  isLibraryRoute: boolean = false;

  constructor(
    private http: HttpClient, 
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.isLibraryRoute = event.url === '/library';
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.searchQuery = params['search'] !== undefined ? params['search'] : null;
      this.loadPublicDocuments();
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
          this.documents = documents;
          this.applySearchFilter();
        },
        (error) => {
          console.error('Error loading public documents:', error);
        }
      );
  }

  applySearchFilter() {
    if (this.searchQuery !== null && this.searchQuery !== '') {
      this.filteredDocuments = this.documents.filter(doc => 
        doc.title.toLowerCase().includes(this.searchQuery!.toLowerCase()) ||
        doc.description?.toLowerCase().includes(this.searchQuery!.toLowerCase()) ||
        doc.authors.some(author => author.toLowerCase().includes(this.searchQuery!.toLowerCase())) ||
        doc.categories.some(category => category.toLowerCase().includes(this.searchQuery!.toLowerCase()))
      );
    } else {
      this.filteredDocuments = this.documents;
    }
  }

  clearSearch() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { search: '' },
      queryParamsHandling: 'merge'
    });
  }

  applyFilters(filters: any) {
    this.filteredDocuments = this.documents.filter(doc => {
      const searchMatch = doc.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        doc.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
        doc.authors.some(author => author.toLowerCase().includes(filters.search.toLowerCase())) ||
        doc.categories.some(category => category.toLowerCase().includes(filters.search.toLowerCase()));

      const authorMatch = Object.keys(filters.authors).length === 0 ||
        doc.authors.some(author => filters.authors[author]);

      const categoryMatch = Object.keys(filters.categories).length === 0 ||
        doc.categories.some(category => filters.categories[category]);

      let uploadedByMatch = true;
      if (this.isLibraryRoute && filters.uploadedBy) {
        uploadedByMatch = filters.uploadedBy === 'all' ||
          (filters.uploadedBy === 'me' && doc.user_email === this.currentUserEmail) ||
          (filters.uploadedBy === 'others' && doc.user_email !== this.currentUserEmail);
      }

      return searchMatch && authorMatch && categoryMatch && uploadedByMatch;
    });
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
    this.router.navigate(['/chat']);
  }

  isCurrentUserDocument(document: Document): boolean {
    return document.user_email === this.currentUserEmail;
  }

  navigateToMyUploads(): void {
    this.router.navigate(['/my-uploads']);
  }
}