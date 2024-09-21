import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactDialogComponent } from '../contact-dialog/contact-dialog.component';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, ContactDialogComponent],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  isContactDialogOpen = false;

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openContactDialog() {
    this.isContactDialogOpen = true;
  }

  closeContactDialog() {
    this.isContactDialogOpen = false;
  }
}