import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent implements OnInit, OnDestroy {
  products: any[] = [];
  categories: any[] = [];
  suppliers: any[] = [];
  searchTerm = '';
  searchSubject = new Subject<string>();
  searchSubscription!: Subscription;
  filterCategory = '';
  filterSuppliers: string[] = [];
  showSupplierDropdown = false;
  currentPage = 1;
  totalPages = 1;
  totalProducts = 0;
  showForm = false;
  editingProduct: any = null;

  // Form fields
  form: any = { name: '', barcode: '', category: '', supplier: '', purchasePrice: null, salePrice: null, stock: 0, minStock: 5, description: '' };

  get pageArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get margin(): number {
    if (!this.form.purchasePrice || !this.form.salePrice) return 0;
    return ((this.form.salePrice - this.form.purchasePrice) / this.form.purchasePrice * 100);
  }

  constructor(public authService: AuthService, private api: ApiService) {}

  @HostListener('document:click')
  onDocumentClick() {
    this.showSupplierDropdown = false;
  }

  ngOnInit(): void {
    this.loadProducts();
    this.api.getCategories().subscribe({ next: (cats: any) => this.categories = cats });
    this.api.getSuppliers({ active: 'true' }).subscribe({ next: (sups: any) => this.suppliers = sups });

    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadProducts();
    });
  }

  ngOnDestroy(): void {
    if (this.searchSubscription) this.searchSubscription.unsubscribe();
  }

  loadProducts(): void {
    const params: any = { page: this.currentPage, limit: 100 };
    if (this.searchTerm) params.search = this.searchTerm;
    if (this.filterCategory) params.category = this.filterCategory;
    if (this.filterSuppliers.length > 0) params.supplier = this.filterSuppliers.join(',');
    this.api.getProducts(params).subscribe({
      next: (res: any) => {
        this.products = res.products;
        this.totalPages = res.pages;
        this.totalProducts = res.total;
      }
    });
  }

  onSearch(): void { this.searchSubject.next(this.searchTerm); }
  onFilterCategory(): void { this.currentPage = 1; this.loadProducts(); }
  
  toggleSupplier(supplierId: string, event: Event): void {
    event.stopPropagation();
    const index = this.filterSuppliers.indexOf(supplierId);
    if (index > -1) {
      this.filterSuppliers.splice(index, 1);
    } else {
      this.filterSuppliers.push(supplierId);
    }
    this.currentPage = 1;
    this.loadProducts();
  }

  isSupplierSelected(supplierId: string): boolean {
    return this.filterSuppliers.includes(supplierId);
  }

  goToPage(p: number): void { this.currentPage = p; this.loadProducts(); }

  openNewForm(): void {
    this.editingProduct = null;
    this.form = { name: '', barcode: '', category: '', supplier: '', purchasePrice: null, salePrice: null, stock: 0, minStock: 5, description: '' };
    this.showForm = true;
  }

  openEditForm(product: any): void {
    this.editingProduct = product;
    this.form = {
      name: product.name,
      barcode: product.barcode,
      category: product.category?._id || '',
      supplier: product.supplier?._id || '',
      purchasePrice: product.purchasePrice,
      salePrice: product.salePrice,
      stock: product.stock,
      minStock: product.minStock,
      description: product.description || ''
    };
    this.showForm = true;
  }

  cancelForm(): void { this.showForm = false; this.editingProduct = null; }

  onDependencyChange(): void {
    if (!this.form.category || !this.form.supplier || this.editingProduct) return;
    
    // We pass both category and supplier to getNextBarcode. We might need to update api.service to accept supplierId.
    this.api.getNextBarcode(this.form.category, this.form.supplier).subscribe({
      next: (r: any) => this.form.barcode = r.barcode,
      error: () => {}
    });
  }

  saveProduct(): void {
    if (!this.form.name || !this.form.category || !this.form.supplier || !this.form.barcode) {
      Swal.fire('⚠️', 'Completa nombre, categoría, proveedor y código', 'warning');
      return;
    }
    const obs = this.editingProduct
      ? this.api.updateProduct(this.editingProduct._id, this.form)
      : this.api.createProduct(this.form);
    obs.subscribe({
      next: () => {
        this.showForm = false;
        this.editingProduct = null;
        this.loadProducts();
        Swal.fire('✅', this.editingProduct ? 'Producto actualizado' : 'Producto registrado', 'success');
      },
      error: (err: any) => Swal.fire('❌', err.error?.message || 'Error al guardar', 'error')
    });
  }

  async adjustStock(product: any): Promise<void> {
    const { value } = await Swal.fire({
      title: `📦 Ajustar Stock: ${product.name}`,
      html: `
        <p>Stock actual: <strong>${product.stock}</strong></p>
        <p style="font-size:0.8rem;color:#888">Código: ${product.barcode}</p>
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
      title: '¿Desactivar producto?', text: `${product.name} (${product.barcode})`,
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#FF1744',
      confirmButtonText: 'Sí, desactivar'
    }).then(r => {
      if (r.isConfirmed) {
        this.api.deleteProduct(product._id).subscribe({ next: () => this.loadProducts() });
      }
    });
  }

  getCategoryName(catId: string): string {
    const cat = this.categories.find((c: any) => c._id === catId);
    return cat ? `${cat.icon} ${cat.name}` : '';
  }

  getCategoryCode(catId: string): string {
    const cat = this.categories.find((c: any) => c._id === catId);
    return cat?.code || '---';
  }

  getSupplierCode(supId: string): string {
    const sup = this.suppliers.find((s: any) => s._id === supId);
    return sup?.code || '--';
  }
}
