import { Component } from '@angular/core';
import { NavSearchComponent } from "../nav-search/nav-search.component";

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [NavSearchComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {

}
