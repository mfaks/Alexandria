import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { FooterComponent } from '../footer/footer.component';
import { NavSearchComponent } from '../nav-search/nav-search.component';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, NavSearchComponent, FooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  features = [
    {
      title: 'Explore the Library',
      description: 'Dive into a comprehensive collection of research papers and academic resources, covering a wide range of topics.'
    },
    {
      title: 'Real-Time AI Support',
      description: 'Get instant answers to your questions from our advanced AI system to enhance your understanding.'
    },
    {
      title: 'Data Privacy Promise',
      description: 'Rest assured, your data is never used for training or shared with third parties, maintaining the highest standards of privacy and integrity.'
    }
  ];

  constructor(private authService: AuthService) { }

  handleLogin(provider: string) {
    this.authService.initiateAuth(provider);
  }
}