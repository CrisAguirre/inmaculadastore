import { Component, OnInit } from '@angular/core';
import { ApiService } from '@core/services/api.service';

@Component({
  selector: 'app-reports',
  template: `
    <div class="page-header">
      <h1>📈 Reportes</h1>
      <div style="display:flex;gap:0.5rem">
        <button *ngFor="let p of ['day','week','month']" [class]="period===p ? 'btn-primary btn-sm' : 'btn-outline btn-sm'"
                (click)="period=p;loadData()">{{ p === 'day' ? 'Hoy' : p === 'week' ? 'Semana' : 'Mes' }}</button>
      </div>
    </div>

    <div class="grid-3 mb-3">
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(0,229,255,0.1)">💰</div>
        <div><div class="stat-value">\${{ summary.totalRevenue | number:'1.0-0' }}</div><div class="stat-label">Ingresos</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(124,77,255,0.1)">🧾</div>
        <div><div class="stat-value">{{ summary.totalTransactions }}</div><div class="stat-label">Ventas</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(0,230,118,0.1)">🎯</div>
        <div><div class="stat-value">\${{ summary.averageTicket | number:'1.0-0' }}</div><div class="stat-label">Ticket Promedio</div></div>
      </div>
    </div>

    <div class="grid-2">
      <div class="neon-card">
        <h3 style="margin-bottom:1rem">⭐ Top 10 Productos</h3>
        <div *ngFor="let p of topProducts; let i = index" style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;border-bottom:1px solid var(--bg-input)">
          <span style="font-weight:700;color:var(--neon-cyan);min-width:20px">{{ i+1 }}</span>
          <span style="flex:1;font-size:0.85rem">{{ p.name }}</span>
          <span class="badge badge-cyan">{{ p.totalQuantity }} uds</span>
          <span style="font-family:Outfit;font-weight:700">\${{ p.totalRevenue | number:'1.0-0' }}</span>
        </div>
      </div>
      <div class="neon-card-violet">
        <h3 style="margin-bottom:1rem">🐌 Productos Estancados (30 días)</h3>
        <div *ngFor="let p of lowRotation" style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;border-bottom:1px solid var(--bg-input)">
          <span style="flex:1;font-size:0.85rem">{{ p.name }}</span>
          <span class="badge badge-orange">Stock: {{ p.stock }}</span>
        </div>
        <p *ngIf="lowRotation.length === 0" style="color:var(--text-muted);text-align:center;padding:1rem">Sin productos estancados</p>
      </div>
    </div>
  `
})
export class ReportsComponent implements OnInit {
  period = 'week';
  summary: any = { totalRevenue: 0, totalTransactions: 0, averageTicket: 0 };
  topProducts: any[] = [];
  lowRotation: any[] = [];

  constructor(private api: ApiService) {}
  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.api.getSalesSummary(this.period).subscribe({ next: (r: any) => this.summary = r });
    this.api.getTopProducts(10).subscribe({ next: (r: any) => this.topProducts = r || [] });
    this.api.getLowRotation().subscribe({ next: (r: any) => this.lowRotation = r || [] });
  }
}
