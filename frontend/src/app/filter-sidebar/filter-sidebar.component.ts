import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FilteredDocument } from '../interfaces/filter-document.interface';

@Component({
  selector: 'app-filter-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filter-sidebar.component.html',
  styleUrls: ['./filter-sidebar.component.css']
})
export class FilterSidebarComponent implements OnChanges {
  @Input() documents: FilteredDocument[] = [];
  @Input() currentUserEmail: string = '';
  @Input() isLibraryRoute: boolean = false;
  @Output() filtersChanged = new EventEmitter<any>();

  filters = {
    documentSearch: '',
    authorSearch: '',
    categorySearch: '',
    authors: {} as { [key: string]: boolean },
    categories: {} as { [key: string]: boolean },
    visibility: 'all',
    uploadedBy: 'all'
  }

  selectedAuthors: string[] = [];
  selectedCategories: string[] = [];
  allAuthors: string[] = [];
  allCategories: string[] = [];
  availableAuthors: string[] = [];
  availableCategories: string[] = [];
  filteredDocuments: FilteredDocument[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['documents']) {
      this.updateAllAuthorsAndCategories();
      this.updateFilteredDocuments();
    }
  }

  updateAllAuthorsAndCategories(): void {
    this.allAuthors = [...new Set(this.documents.flatMap(doc => doc.authors))];
    this.allCategories = [...new Set(this.documents.flatMap(doc => doc.categories))];
    this.availableAuthors = [...this.allAuthors];
    this.availableCategories = [...this.allCategories];
  }

  updateFilteredDocuments(): void {
    this.filteredDocuments = this.getFilteredDocuments();
    this.updateAvailableFilters();
    this.filtersChanged.emit({
      documentSearch: this.filters.documentSearch,
      authors: this.selectedAuthors,
      categories: this.selectedCategories,
      visibility: this.filters.visibility,
      uploadedBy: this.filters.uploadedBy
    });
  }

  updateAvailableFilters(): void {
    this.availableAuthors = [...new Set(this.filteredDocuments.flatMap(doc => doc.authors))];
    this.availableCategories = [...new Set(this.filteredDocuments.flatMap(doc => doc.categories))];
  }

  getFilteredDocuments(): FilteredDocument[] {
    return this.documents.filter(doc => {
      const documentMatch = !this.filters.documentSearch || 
        doc.title.toLowerCase().includes(this.filters.documentSearch.toLowerCase());

      const authorMatch = this.selectedAuthors.length === 0 ||
        this.selectedAuthors.some(author => doc.authors.includes(author));

      const categoryMatch = this.selectedCategories.length === 0 ||
        this.selectedCategories.some(category => doc.categories.includes(category));

      const visibilityMatch = this.filters.visibility === 'all' ||
        (this.filters.visibility === 'public' && doc.isPublic) ||
        (this.filters.visibility === 'private' && !doc.isPublic);

      const uploadedByMatch = this.filters.uploadedBy === 'all' ||
        (this.filters.uploadedBy === 'me' && doc.uploadedBy === this.currentUserEmail) ||
        (this.filters.uploadedBy === 'others' && doc.uploadedBy !== this.currentUserEmail);

      return documentMatch && authorMatch && categoryMatch && visibilityMatch && uploadedByMatch;
    });
  }

  onFilterChange(): void {
    this.updateFilteredDocuments();
  }

  clearFilters(): void {
    this.filters = {
      documentSearch: '',
      authorSearch: '',
      categorySearch: '',
      authors: {},
      categories: {},
      visibility: 'all',
      uploadedBy: 'all'
    }
    this.selectedAuthors = [];
    this.selectedCategories = [];
    this.updateFilteredDocuments();
  }

  onAuthorEnter(event: Event): void {
    if ((event as KeyboardEvent).key === 'Enter') {
      const matchingAuthor = this.availableAuthors.find(author => 
        author.toLowerCase() === this.filters.authorSearch.toLowerCase()
      );
      if (matchingAuthor && !this.selectedAuthors.includes(matchingAuthor)) {
        this.selectedAuthors.push(matchingAuthor);
        this.filters.authors[matchingAuthor] = true;
        this.filters.authorSearch = '';
        this.updateFilteredDocuments();
      }
    }
  }

  onCategoryEnter(event: Event): void {
    if ((event as KeyboardEvent).key === 'Enter') {
      const matchingCategory = this.availableCategories.find(category => 
        category.toLowerCase() === this.filters.categorySearch.toLowerCase()
      );
      if (matchingCategory && !this.selectedCategories.includes(matchingCategory)) {
        this.selectedCategories.push(matchingCategory);
        this.filters.categories[matchingCategory] = true;
        this.filters.categorySearch = '';
        this.updateFilteredDocuments();
      }
    }
  }

  toggleAuthor(author: string): void {
    const index = this.selectedAuthors.indexOf(author);
    if (index > -1) {
      this.selectedAuthors.splice(index, 1);
      delete this.filters.authors[author];
    } else {
      this.selectedAuthors.push(author);
      this.filters.authors[author] = true;
    }
    this.updateFilteredDocuments();
  }

  toggleCategory(category: string): void {
    const index = this.selectedCategories.indexOf(category);
    if (index > -1) {
      this.selectedCategories.splice(index, 1);
      delete this.filters.categories[category];
    } else {
      this.selectedCategories.push(category);
      this.filters.categories[category] = true;
    }
    this.updateFilteredDocuments();
  }
}