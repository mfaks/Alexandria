import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavSearchComponent } from './nav-search.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { SearchService } from '../search.service';

describe('NavSearchComponent', () => {
  let component: NavSearchComponent;
  let fixture: ComponentFixture<NavSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavSearchComponent, HttpClientTestingModule, RouterTestingModule, FormsModule],
      providers: [AuthService, SearchService],
    }).compileComponents();

    fixture = TestBed.createComponent(NavSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
