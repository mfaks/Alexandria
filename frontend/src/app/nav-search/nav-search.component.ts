import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { SearchService } from '../search.service';

@Component({
  selector: 'app-nav-search',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './nav-search.component.html',
  styleUrl: './nav-search.component.css',
})
export class NavSearchComponent implements OnInit {
  searchText: string = '';
  userInfo: any;

  constructor(
    private authService: AuthService,
    private router: Router,
    private searchService: SearchService
  ) {}

  ngOnInit() {
    this.userInfo = this.authService.getUserInfo();
    this.authService.fetchUserInfo().subscribe(
      (userInfo) => {
        this.userInfo = userInfo;
      },
      (error) => {
        console.error('Error fetching user info:', error);
      }
    );
  }

  clearSearch(): void {
    this.searchText = '';
    if (this.router.url.startsWith('/library')) {
      this.router.navigate(['/library']);
    }
  }

  searchDocuments(): void {
    if (this.searchText.trim()) {
      this.router.navigate(['/library'], { 
        queryParams: { search: this.searchText }
      });
    } else {
      this.router.navigate(['/library']);
    }
  }
}