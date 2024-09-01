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
      description: 'Dive into a comprehensive collection of research papers and academic resources, covering a wide range of disciplines and topics.'
    },
    {
      title: 'Real-Time Q&A Support',
      description: 'Get instant answers to your questions from our advanced AI system, enhancing your research process and understanding.'
    },
    {
      title: 'Robust Data Privacy',
      description: 'Choose to keep your uploaded research papers private or make them public. Rest assured, your data is never used for training or shared with third parties, maintaining the highest standards of privacy and integrity.'
    }
  ];

  constructor(private authService: AuthService) { }

  signIn(provider: string) {
    this.authService.getAuthUrl(provider).subscribe(
      response => {
        window.location.href = response.url;
      },
      error => {
        console.error('Error getting auth URL', error);
      }
    );
  }
}