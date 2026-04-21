import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth';

@NgModule({
  imports: [CommonModule, FormsModule, RouterModule],
  providers: [AuthService]
})
export class AuthModule {}
