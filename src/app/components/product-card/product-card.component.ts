import { Component, Input, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Product } from '../../models/models';
import { AppService, getImageUrl } from '../../services/app.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  template: `
    <div class="card" [class.out-of-stock]="(product.stock_quantity ?? 1) <= 0">
      <div class="image-container relative">
        <img
          [src]="imageUrl()"
          [alt]="product.title"
          class="card-image"
          (click)="viewDetails()"
          (error)="handleImageError()"
        />
        @if ((product.stock_quantity ?? 1) <= 0) {
          <div class="out-of-stock-badge">Out of Stock</div>
        }
      </div>
      <div class="card-body">
        <div class="text-xs text-gray mb-1 capitalize">{{ product.category }}</div>
        <h3 class="product-card-title" (click)="viewDetails()">{{ product.title }}</h3>
        <div class="flex items-center justify-between mt-4">
          <span class="price">₹{{ (product.price || 0).toFixed(2) }}</span>
          <button (click)="app.addToCart(product)" 
            class="btn btn-primary" 
            [disabled]="(product.stock_quantity ?? 1) <= 0"
            [title]="(product.stock_quantity ?? 1) <= 0 ? 'Out of Stock' : 'Add to Cart'">
            <i class="fas fa-cart-plus"></i>
          </button>
        </div>
        @if (product.rating) {
          <div class="mt-2 flex items-center text-sm text-gray">
            <span class="text-yellow mr-1">⭐</span>
            <span>{{ product.rating.rate }} ({{ product.rating.count }})</span>
          </div>
        }
      </div>
    </div>
  `
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  app = inject(AppService);
  router = inject(Router);

  retryCount = signal(0);
  imageUrl = signal<string>('');

  constructor() {
    setTimeout(() => {
      this.imageUrl.set(getImageUrl(this.product?.image));
    }, 0);
  }

  handleImageError(): void {
    this.retryCount.update(count => count + 1);
    if (this.retryCount() >= 2) {
      this.imageUrl.set('https://via.placeholder.com/400x300?text=Image+Not+Found');
    } else {
      this.imageUrl.set(getImageUrl(this.product?.image));
    }
  }

  viewDetails(): void {
    this.app.selectedProduct.set(this.product);
    this.router.navigate(['/product', this.product.id]);
  }
}
