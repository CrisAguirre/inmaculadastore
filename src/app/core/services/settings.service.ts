import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Settings } from '../models/interfaces';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private settingsSubject = new BehaviorSubject<Settings | null>(null);
  public settings$ = this.settingsSubject.asObservable();

  constructor(private api: ApiService) {}

  loadSettings(): void {
    this.api.getSettings().subscribe({
      next: (settings: Settings) => this.settingsSubject.next(settings),
      error: () => console.warn('No se pudieron cargar las configuraciones')
    });
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
