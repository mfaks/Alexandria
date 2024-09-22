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
    this.fetchUserInfo();
  }

  fetchUserInfo() {
    this.authService.fetchUserInfo().subscribe(
      userInfo => {
        this.userInfo = userInfo;
      },
      error => {
        console.error('Error fetching user info:', error);
        this.userInfo = null;
      }
    );
  }

  handleLogin(provider: string) {
    this.authService.initiateAuth(provider);
  }

  logout() {
    this.authService.logout().subscribe(
      () => {
        this.userInfo = null;
        this.router.navigate(['/']);
      },
      error => {
        console.error('Error logging out:', error);
      }
    );
  }
}