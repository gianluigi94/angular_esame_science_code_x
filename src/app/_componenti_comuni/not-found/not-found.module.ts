import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotFoundComponent } from './not-found.component';
import { SaturnoModule } from '../saturno/saturno.module';

@NgModule({
  declarations: [NotFoundComponent],
  imports: [
    CommonModule,
    SaturnoModule,
    RouterModule.forChild([{ path: '', component: NotFoundComponent }]),
  ],
})
export class NotFoundModule {}
