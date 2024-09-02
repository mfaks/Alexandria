import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { MyUploadsComponent } from './my-uploads/my-uploads.component';
import { authGuard } from './auth.guard';
import { NgModule } from '@angular/core';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'my-uploads', component: MyUploadsComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '/home' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }