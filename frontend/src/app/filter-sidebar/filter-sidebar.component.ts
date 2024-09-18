import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-filter-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filter-sidebar.component.html',
  styleUrl: './filter-sidebar.component.css'
})
export class FilterSidebarComponent {
  @Input() documents: any[] = [];
  @Input() currentUserEmail: string = '';
  @Input() isLibraryRoute: boolean = false;
  @Output() filtersChanged = new EventEmitter<any>();

  filters = {
    titleSearch: '',
    authors: {} as { [key: string]: boolean },
    categories: {} as { [key: string]: boolean },
    visibility: 'all',
    uploadedBy: 'all'
  }

  get uniqueAuthors(): string[] {
    return [...new Set(this.documents.flatMap(doc => doc.authors))]
  }

  get uniqueCategories(): string[] {
    return [...new Set(this.documents.flatMap(doc => doc.categories))]
  }

  onFilterChange(): void {
    this.filtersChanged.emit(this.filters);
  }

  clearFilters(): void {
    this.filters = {
      titleSearch: '',
      authors: {},
      categories: {},
      visibility: 'all',
      uploadedBy: 'all'
    }
    this.onFilterChange();
  }
}