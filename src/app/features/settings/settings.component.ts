import { Component, OnInit } from '@angular/core';
import { ApiService } from '@core/services/api.service';
import { SettingsService } from '@core/services/settings.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-settings',
  template: `
    <div class="page-header"><h1>⚙️ Configuración del Establecimiento</h1></div>
    <div class="grid-2">
      <div class="neon-card">
        <h3 style="margin-bottom:1rem">🏪 Datos del Negocio</h3>
        <div class="form-group">
          <label class="form-label">Nombre del Establecimiento</label>
          <input class="form-input" [(ngModel)]="storeName">
        </div>
        <div class="form-group">
          <label class="form-label">Teléfono</label>
          <input class="form-input" [(ngModel)]="phone">
        </div>
        <div class="form-group">
          <label class="form-label">Dirección</label>
          <input class="form-input" [(ngModel)]="address">
        </div>
        <div class="form-group">
          <label class="form-label">WhatsApp (con código país: 573...)</label>
          <input class="form-input" [(ngModel)]="whatsappNumber" placeholder="573137733408">
        </div>
        <button class="btn-primary" (click)="saveSettings()">💾 Guardar Cambios</button>
      </div>
      <div class="neon-card-violet">
        <h3 style="margin-bottom:1rem">🖼️ Logo</h3>
        <div style="text-align:center;padding:1rem">
          <img *ngIf="currentLogo" [src]="currentLogo" alt="Logo actual" style="max-height:120px;margin:0 auto 1rem;border-radius:12px">
          <p *ngIf="!currentLogo" style="color:var(--text-muted);margin-bottom:1rem">Sin logo configurado</p>
          <input type="file" accept="image/*" (change)="onFileSelected($event)" #fileInput style="display:none">
          <button class="btn-outline" (click)="fileInput.click()">📤 Subir Logo</button>
          <p *ngIf="selectedFile" style="font-size:0.8rem;margin-top:0.5rem;color:var(--neon-green)">
            ✅ {{ selectedFile.name }}
          </p>
        </div>
      </div>
    </div>
  `
})
export class SettingsComponent implements OnInit {
  storeName = ''; phone = ''; address = ''; whatsappNumber = '';
  currentLogo = '';
  selectedFile: File | null = null;

  constructor(private api: ApiService, private settingsService: SettingsService) {}

  ngOnInit(): void {
    this.api.getSettings().subscribe({
      next: (s: any) => {
        this.storeName = s.storeName; this.phone = s.phone;
        this.address = s.address; this.whatsappNumber = s.whatsappNumber;
        this.currentLogo = s.logoUrl;
      }
    });
  }

  onFileSelected(event: any): void { this.selectedFile = event.target.files[0]; }

  saveSettings(): void {
    const formData = new FormData();
    formData.append('storeName', this.storeName);
    formData.append('phone', this.phone);
    formData.append('address', this.address);
    formData.append('whatsappNumber', this.whatsappNumber);
    if (this.selectedFile) formData.append('logo', this.selectedFile);

    this.api.updateSettings(formData).subscribe({
      next: () => {
        this.settingsService.loadSettings();
        Swal.fire('✅', 'Configuración actualizada', 'success');
      },
      error: () => Swal.fire('❌', 'Error al guardar', 'error')
    });
  }
}
