import { Component, OnInit } from '@angular/core';
import { NavSearchComponent } from "../nav-search/nav-search.component";
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [NavSearchComponent, CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  userInfo: any;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.userInfo = this.authService.getUserInfo();
  }

  signIn(provider: 'github' | 'google') {
    this.authService.getAuthUrl(provider).subscribe(
      (response: { url: string }) => {
        window.location.href = response.url;
      },
      (error) => {
        console.error('Error getting auth URL:', error);
      }
    );
  }

  logout() {
    this.authService.logout();
    this.userInfo = null;
    this.router.navigate(['/']);
  }
}