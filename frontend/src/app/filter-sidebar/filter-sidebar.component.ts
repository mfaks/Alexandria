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
  @Output() filtersChanged = new EventEmitter<any>();

  filters = {
    search: '',
    authors: {} as { [key: string]: boolean},
    categories: {} as { [key: string]: boolean},
    visibility: 'all'
  }

  get uniqueAuthors(): string[] {
    return [...new Set(this.documents.flatMap(doc => doc.authors))]
  }

  get uniqueCategories(): string[] {
    return [...new Set(this.documents.flatMap(doc => doc.categories))]
  }

  onFilterChange(): void{
    this.filtersChanged.emit(this.filters);
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      authors: {},
      categories: {},
      visibility: 'all'
    }
    this.onFilterChange();
  }
}
