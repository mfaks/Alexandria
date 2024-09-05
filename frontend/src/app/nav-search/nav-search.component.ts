import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';

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

  constructor(private authService: AuthService) {}

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
  }
}