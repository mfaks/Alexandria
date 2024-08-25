import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nav-search',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './nav-search.component.html',
  styleUrl: './nav-search.component.css',
})
export class NavSearchComponent {
  searchText: string = '';

  clearSearch(): void {
    this.searchText = '';
  }
}