import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyUploadsComponent } from './my-uploads.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthService } from '../auth.service';

describe('MyUploadsComponent', () => {
  let component: MyUploadsComponent;
  let fixture: ComponentFixture<MyUploadsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyUploadsComponent, HttpClientTestingModule],
      providers: [AuthService],
    }).compileComponents();

    fixture = TestBed.createComponent(MyUploadsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
