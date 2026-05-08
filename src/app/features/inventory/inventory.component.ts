import { Component, OnInit } from '@angular/core';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-inventory',
  template: `
    <div class="page-header">
      <h1>📦 Inventario</h1>
      <div style="display:flex;gap:0.5rem">
        <input class="form-input" style="width:250px" placeholder="🔍 Buscar producto..."
               [(ngModel)]="searchTerm" (input)="onSearch()">
        <button class="btn-primary" (click)="openProductModal()" *ngIf="authService.hasRole('admin')">
          + Nuevo Producto
        </button>
      </div>
    </div>

    <div class="table-wrapper neon-card" style="padding:0;animation:none">
      <table class="data-table">
        <thead>
          <tr>
            <th>Producto</th><th>Categoría</th><th>P. Compra</th><th>P. Venta</th>
            <th>Stock</th><th>Estado</th><th *ngIf="authService.hasRole('admin')">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of products; let i = index" style="animation: fadeInUp {{i * 0.05}}s ease both">
            <td><strong>{{ p.name }}</strong><br><small style="color:var(--text-muted)">{{ p.barcode }}</small></td>
            <td>{{ p.category?.icon }} {{ p.category?.name }}</td>
            <td>\${{ p.purchasePrice | number:'1.0-0' }}</td>
            <td>\${{ p.salePrice | number:'1.0-0' }}</td>
            <td>
              <span [class]="p.stock <= p.minStock ? 'badge badge-red' : 'badge badge-green'">
                {{ p.stock }}
              </span>
            </td>
            <td><span [class]="p.isActive ? 'badge badge-green' : 'badge badge-red'">
              {{ p.isActive ? 'Activo' : 'Inactivo' }}</span>
            </td>
            <td *ngIf="authService.hasRole('admin')">
              <button class="btn-ghost btn-sm" (click)="openProductModal(p)">✏️</button>
              <button class="btn-ghost btn-sm" (click)="adjustStock(p)">📦</button>
              <button class="btn-ghost btn-sm" (click)="deleteProduct(p)">🗑️</button>
            </td>
          </tr>
          <tr *ngIf="products.length === 0">
            <td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">
              No hay productos registrados
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex-between mt-2" *ngIf="totalPages > 1">
      <span style="font-size:0.85rem;color:var(--text-secondary)">{{ totalProducts }} productos</span>
      <div style="display:flex;gap:0.25rem">
        <button class="btn-outline btn-sm" *ngFor="let p of pageArray" [class.btn-primary]="p === currentPage"
                (click)="goToPage(p)">{{ p }}</button>
      </div>
    </div>
  `,
  styles: [`.data-table td, .data-table th { font-size: 0.82rem; }`]
})
export class InventoryComponent implements OnInit {
  products: any[] = [];
  categories: any[] = [];
  searchTerm = '';
  currentPage = 1;
  totalPages = 1;
  totalProducts = 0;

  get pageArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  constructor(public authService: AuthService, private api: ApiService) {}

  ngOnInit(): void {
    this.loadProducts();
    this.api.getCategories().subscribe({ next: (cats: any) => this.categories = cats });
  }

  loadProducts(): void {
    const params: any = { page: this.currentPage, limit: 20 };
    if (this.searchTerm) params.search = this.searchTerm;
    this.api.getProducts(params).subscribe({
      next: (res: any) => {
        this.products = res.products;
        this.totalPages = res.pages;
        this.totalProducts = res.total;
      }
    });
  }

  onSearch(): void { this.currentPage = 1; this.loadProducts(); }
  goToPage(p: number): void { this.currentPage = p; this.loadProducts(); }

  async openProductModal(product?: any): Promise<void> {
    const catOptions = this.categories.map(c => `<option value="${c._id}" ${product?.category?._id === c._id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('');
    const { value: formValues } = await Swal.fire({
      title: product ? '✏️ Editar Producto' : '➕ Nuevo Producto',
      html: `
        <input id="swal-name" class="swal2-input" placeholder="Nombre" value="${product?.name || ''}">
        <input id="swal-barcode" class="swal2-input" placeholder="Código de barras" value="${product?.barcode || ''}">
        <select id="swal-category" class="swal2-select">${catOptions}</select>
        <input id="swal-purchase" class="swal2-input" type="number" placeholder="Precio compra" value="${product?.purchasePrice || ''}">
        <input id="swal-sale" class="swal2-input" type="number" placeholder="Precio venta" value="${product?.salePrice || ''}">
        <input id="swal-stock" class="swal2-input" type="number" placeholder="Stock inicial" value="${product?.stock || 0}">
        <input id="swal-minstock" class="swal2-input" type="number" placeholder="Stock mínimo" value="${product?.minStock || 5}">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: product ? 'Guardar' : 'Crear',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#00E5FF',
      preConfirm: () => ({
        name: (document.getElementById('swal-name') as HTMLInputElement).value,
        barcode: (document.getElementById('swal-barcode') as HTMLInputElement).value,
        category: (document.getElementById('swal-category') as HTMLSelectElement).value,
        purchasePrice: +(document.getElementById('swal-purchase') as HTMLInputElement).value,
        salePrice: +(document.getElementById('swal-sale') as HTMLInputElement).value,
        stock: +(document.getElementById('swal-stock') as HTMLInputElement).value,
        minStock: +(document.getElementById('swal-minstock') as HTMLInputElement).value,
      })
    });
    if (!formValues) return;
    const obs = product ? this.api.updateProduct(product._id, formValues) : this.api.createProduct(formValues);
    obs.subscribe({ next: () => { this.loadProducts(); Swal.fire('✅', product ? 'Producto actualizado' : 'Producto creado', 'success'); } });
  }

  async adjustStock(product: any): Promise<void> {
    const { value } = await Swal.fire({
      title: `📦 Ajustar Stock: ${product.name}`,
      html: `
        <p>Stock actual: <strong>${product.stock}</strong></p>
        <select id="swal-type" class="swal2-select">
          <option value="entrada">➕ Entrada</option><option value="salida">➖ Salida</option>
        </select>
        <input id="swal-qty" class="swal2-input" type="number" placeholder="Cantidad" min="1">
      `,
      showCancelButton: true, confirmButtonText: 'Aplicar', confirmButtonColor: '#00E5FF',
      preConfirm: () => ({
        type: (document.getElementById('swal-type') as HTMLSelectElement).value,
        quantity: +(document.getElementById('swal-qty') as HTMLInputElement).value,
      })
    });
    if (!value) return;
    this.api.updateStock(product._id, value).subscribe({
      next: () => { this.loadProducts(); Swal.fire('✅', 'Stock actualizado', 'success'); },
      error: (err: any) => Swal.fire('❌', err.error?.message, 'error')
    });
  }

  deleteProduct(product: any): void {
    Swal.fire({
      title: '¿Desactivar producto?', text: product.name,
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#FF1744',
      confirmButtonText: 'Sí, desactivar'
    }).then(r => {
      if (r.isConfirmed) {
        this.api.deleteProduct(product._id).subscribe({ next: () => this.loadProducts() });
      }
    });
  }
}
