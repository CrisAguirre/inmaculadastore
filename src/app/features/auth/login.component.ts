import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="login-wrapper">
      <div class="login-card neon-card">
        <div class="login-header">
          <div class="login-logo">🏪</div>
          <h1>La Inmaculada</h1>
          <p>Sistema de Gestión Integral</p>
        </div>
        <form (ngSubmit)="onLogin()" class="login-form">
          <div class="form-group">
            <label class="form-label">Correo electrónico</label>
            <input class="form-input" type="email" [(ngModel)]="email" name="email"
                   placeholder="admin@lainmaculada.com" required autocomplete="email">
          </div>
          <div class="form-group">
            <label class="form-label">Contraseña</label>
            <input class="form-input" [type]="showPwd ? 'text' : 'password'"
                   [(ngModel)]="password" name="password" placeholder="••••••••" required>
            <button type="button" class="pwd-toggle" (click)="showPwd = !showPwd">
              {{ showPwd ? '🙈' : '👁️' }}
            </button>
          </div>
          <p class="error-msg" *ngIf="error">{{ error }}</p>
          <button type="submit" class="btn-primary btn-lg login-btn" [disabled]="loading">
            {{ loading ? '⏳ Ingresando...' : '🔐 Ingresar' }}
          </button>
        </form>
        <p class="login-footer">Powered by <strong>Agencia Deploy</strong></p>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #F5F7FA 0%, #E8F0FE 100%);
      padding: 1rem;
    }
    .login-card {
      width: 100%; max-width: 400px; padding: 2.5rem 2rem;
      animation: fadeInUp 0.6s ease;
    }
    .login-header {
      text-align: center; margin-bottom: 2rem;
    }
    .login-logo { font-size: 3rem; margin-bottom: 0.5rem; }
    .login-header h1 {
      font-family: 'Outfit', sans-serif; font-size: 1.5rem;
      background: linear-gradient(135deg, var(--neon-cyan), var(--neon-violet));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .login-header p { color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.25rem; }
    .login-form { display: flex; flex-direction: column; }
    .form-group { position: relative; }
    .pwd-toggle {
      position: absolute; right: 10px; top: 32px;
      background: none; border: none; cursor: pointer; font-size: 1rem;
    }
    .error-msg {
      color: var(--neon-red); font-size: 0.8rem; text-align: center;
      margin-bottom: 0.5rem; animation: fadeIn 0.3s;
    }
    .login-btn { width: 100%; margin-top: 0.5rem; }
    .login-footer {
      text-align: center; margin-top: 1.5rem;
      font-size: 0.75rem; color: var(--text-muted);
    }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  error = '';
  showPwd = false;

  constructor(private auth: AuthService, private router: Router) {
    if (this.auth.isLoggedIn) this.router.navigate(['/dashboard']);
  }

  onLogin(): void {
    this.loading = true;
    this.error = '';
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Error al iniciar sesión';
      }
    });
  }
}
