import { Component } from '@angular/core';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  template: `
    <ng-container *ngIf="auth.isLoggedIn; else loginView">
      <app-navbar></app-navbar>
      <div class="app-layout">
        <app-sidebar></app-sidebar>
        <main class="app-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </ng-container>
    <ng-template #loginView>
      <router-outlet></router-outlet>
    </ng-template>
  `,
  styles: [`
    .app-layout { display: flex; min-height: calc(100vh - 60px); }
    .app-content { flex: 1; padding: 1.5rem; overflow-x: hidden; animation: fadeIn 0.3s ease; }
  `]
})
export class AppComponent {
  constructor(public auth: AuthService) {}
}
