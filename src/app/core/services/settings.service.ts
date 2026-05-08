import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Settings } from '../models/interfaces';

import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private settingsSubject = new BehaviorSubject<Settings | null>(null);
  public settings$ = this.settingsSubject.asObservable();

  constructor(private api: ApiService) { }

  loadSettings(): void {
    this.api.getSettings().subscribe({
      next: (settings: Settings) => {
        this.settingsSubject.next(settings);
        this.updateFavicon(settings.logoUrl);
      },
      error: () => console.warn('No se pudieron cargar las configuraciones')
    });
  }

  private updateFavicon(logoUrl?: string): void {
    if (!logoUrl) return;
    const fullUrl = logoUrl.startsWith('http') ? logoUrl : environment.apiUrl.replace('/api', '') + logoUrl;
    const favicon = document.getElementById('app-favicon') as HTMLLinkElement;
    if (favicon) {
      favicon.href = fullUrl;
    }
  }

  get settings(): Settings | null {
    return this.settingsSubject.value;
  }

  get storeName(): string {
    return this.settings?.storeName || 'La Inmaculada';
  }

  get logoUrl(): string {
    return this.settings?.logoUrl || '';
  }
}
