import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContactDialogComponent } from './contact-dialog.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ContactDialogComponent', () => {
  let component: ContactDialogComponent;
  let fixture: ComponentFixture<ContactDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactDialogComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
