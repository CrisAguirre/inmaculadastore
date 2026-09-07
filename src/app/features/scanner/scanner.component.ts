import { Component, OnInit } from '@angular/core';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.component.html',
  styleUrls: ['./scanner.component.scss']
})
export class ScannerComponent implements OnInit {
  scannerRunning = false;
  scannerUrl = '';
  selectedTab: 'scan' | 'catalog' = 'scan';
  isScanning = false;
  scanResults: any = null;
  uploadedImage: string | null = null;
  imagePreview: string | null = null;
  catalogProducts: any[] = [];
  categories: any[] = [];
  selectedCategory = '';
  allProducts: any[] = [];
  referenceImages: Map<string, string> = new Map();
  showReferenceModal = false;
  referenceProduct: any = null;
  referenceImageBase64: string | null = null;

  constructor(public authService: AuthService, private api: ApiService) {}

  ngOnInit(): void {
    this.checkScannerStatus();
    this.loadCategories();
    this.loadAllProducts();
    this.loadCatalogProducts();
  }

  checkScannerStatus(): void {
    this.api.getScannerStatus().subscribe({
      next: (res: any) => {
        this.scannerRunning = res.running;
        this.scannerUrl = res.url || '';
      },
      error: () => { this.scannerRunning = false; }
    });
  }

  startScanner(): void {
    Swal.fire({ title: 'Iniciando Scanner...', text: 'Por favor espera', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    this.api.startScanner().subscribe({
      next: () => {
        Swal.close();
        this.scannerRunning = true;
        Swal.fire('✅', 'Scanner iniciado correctamente', 'success');
      },
      error: (err) => Swal.fire('❌', err.error?.message || 'Error al iniciar scanner', 'error')
    });
  }

  stopScanner(): void {
    this.api.stopScanner().subscribe({
      next: () => {
        this.scannerRunning = false;
        Swal.fire('✅', 'Scanner detenido', 'success');
      },
      error: (err) => Swal.fire('❌', err.error?.message || 'Error al detener scanner', 'error')
    });
  }

  loadCategories(): void {
    this.api.getCategories().subscribe({ next: (cats: any) => this.categories = cats });
  }

  loadAllProducts(): void {
    this.api.getAllProducts().subscribe({ next: (res: any) => this.allProducts = res.products || [] });
  }

  loadCatalogProducts(): void {
    this.api.getScannerInventoryAssets().subscribe({
      next: (res: any) => {
        this.catalogProducts = res.categories || [];
      },
      error: () => { this.catalogProducts = []; }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire('⚠️', 'Selecciona un archivo de imagen', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.uploadedImage = reader.result as string;
      this.imagePreview = this.uploadedImage;
      this.scanResults = null;
    };
    reader.readAsDataURL(file);
  }

  validateImageForScanning(): boolean {
    if (!this.uploadedImage) {
      Swal.fire('⚠️', 'Primero selecciona una imagen', 'warning');
      return false;
    }
    return true;
  }

  scanImage(): void {
    if (!this.validateImageForScanning()) return;

    this.isScanning = true;
    this.scanResults = null;

    const imageData = this.uploadedImage!.split(',')[1];

    this.api.scanImage(imageData).subscribe({
      next: (res: any) => {
        this.isScanning = false;
        this.scanResults = res;

        if (!res.success) {
          Swal.fire('⚠️', res.message || res.error || 'Error en el escaneo', 'warning');
          return;
        }
      },
      error: (err) => {
        this.isScanning = false;
        Swal.fire('❌', err.error?.message || 'Error al procesar imagen', 'error');
      }
    });
  }

  confirmUpdateStock(): void {
    if (!this.scanResults?.success || !this.scanResults?.products?.length) return;

    const products = this.scanResults.products;
    const total = this.scanResults.total_products;

    Swal.fire({
      title: '📦 Actualizar Stock',
      html: `
        <p>Se detectaron <strong>${total}</strong> productos:</p>
        <div style="text-align:left; max-height:200px; overflow-y:auto; margin:1rem 0;">
          ${products.map((p: any) => `
            <div style="display:flex; justify-content:space-between; padding:0.4rem 0; border-bottom:1px solid #333;">
              <span>${p.name}</span>
              <strong style="color:#00E5FF">${p.count} unidades</strong>
            </div>
          `).join('')}
        </div>
        <p style="font-size:0.85rem; color:#888;">¿Deseas actualizar el stock en la base de datos?</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '✅ Sí, actualizar',
      cancelButtonText: '❌ Cancelar',
      confirmButtonColor: '#00E5FF',
      cancelButtonColor: '#666'
    }).then((result) => {
      if (result.isConfirmed) {
        this.applyStockUpdate();
      }
    });
  }

  applyStockUpdate(): void {
    const imageData = this.uploadedImage!.split(',')[1];

    this.api.scanAndUpdateInventory(imageData).subscribe({
      next: (res: any) => {
        this.scanResults = res;

        if (res.stock_updated && res.updated_products?.length) {
          Swal.fire({
            icon: 'success',
            title: '✅ Stock Actualizado',
            html: `
              <p>Se actualizaron <strong>${res.updated_products.length}</strong> productos:</p>
              <div style="text-align:left; max-height:150px; overflow-y:auto;">
                ${res.updated_products.map((u: any) => `
                  <div style="padding:0.3rem 0;">
                    <strong>${u.product}</strong>: ${u.old_stock} → ${u.new_stock}
                    <span style="color:${u.difference > 0 ? '#4CAF50' : '#F44336'};">
                      (${u.difference > 0 ? '+' : ''}${u.difference})
                    </span>
                  </div>
                `).join('')}
              </div>
              ${res.unmapped_products?.length ? `<p style="color:#FF9800; margin-top:1rem;">⚠️ ${res.unmapped_products.length} productos no reconocidos</p>` : ''}
            `
          });
        } else {
          Swal.fire('ℹ️', 'No hubo cambios en el stock', 'info');
        }
      },
      error: (err) => {
        Swal.fire('❌', err.error?.message || 'Error al actualizar stock', 'error');
      }
    });
  }

  openReferenceModal(product: any): void {
    this.referenceProduct = product;
    this.referenceImageBase64 = this.referenceImages.get(product._id) || null;
    this.showReferenceModal = true;
  }

  onReferenceFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.referenceImageBase64 = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  closeReferenceModal(): void {
    this.showReferenceModal = false;
    this.referenceProduct = null;
    this.referenceImageBase64 = null;
  }

  getProductByName(name: string): any {
    const normalized = name.toLowerCase().trim();
    return this.allProducts.find(p =>
      p.name.toLowerCase().includes(normalized) ||
      normalized.includes(p.name.toLowerCase())
    );
  }

  getUnmatchedProducts(): any[] {
    if (!this.scanResults?.unmapped_products) return [];
    return this.scanResults.unmapped_products;
  }

  getUpdatedProducts(): any[] {
    if (!this.scanResults?.updated_products) return [];
    return this.scanResults.updated_products;
  }

  getFilteredCatalogProducts(): any[] {
    if (!this.selectedCategory) return this.catalogProducts;
    return this.catalogProducts.filter(c => c.name === this.selectedCategory);
  }

  formatConfidence(value: number): string {
    return (value * 100).toFixed(1) + '%';
  }
}
