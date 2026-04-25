import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppService, getImageUrl } from '../../services/app.service';
import { ReviewSectionComponent } from '../review-section/review-section.component';
import { Product } from '../../models/models';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [ReviewSectionComponent],
  template: `
    @if (!product()) {
      <div class="text-center py-12" style="min-height:400px;font-weight:600">
        <p class="text-gray mb-4">Product not found</p>
        <button (click)="router.navigate(['/products'])" class="btn btn-primary">Back to Products</button>
      </div>
    } @else {
      <div>
        <button (click)="router.navigate(['/products'])" class="mb-6 text-blue"
          style="background:none;border:none;cursor:pointer;margin-bottom:1.5rem;display:flex;align-items:center;gap:0.5rem">
          <i class="fas fa-arrow-left mr-2"></i>Back to Products
        </button>

        <div class="card shadow-lg">
          <div class="grid grid-cols-1 md-grid-cols-2" style="padding:2rem;gap:2rem">
            <div class="flex items-center" style="justify-content:center;background:white;padding:2rem">
              <img [src]="getImageUrl(product()!.image)" [alt]="product()!.title"
                style="max-width:100%;max-height:384px;object-fit:contain"
                (error)="onImgError($event)" />
            </div>

            <div>
              <div class="text-sm text-blue font-semibold mb-2 capitalize" style="margin-bottom:0.5rem">
                {{ product()!.category }}
              </div>
              <h1 class="mb-4" style="font-size:1.75rem;font-weight:800;margin-bottom:1rem">{{ product()!.title }}</h1>

              @if (product()!.rating) {
                <div class="flex items-center mb-4" style="margin-bottom:1rem">
                  <span class="text-yellow mr-2" style="font-size:1.25rem">⭐</span>
                  <span style="font-size:1.125rem" class="font-semibold">{{ product()!.rating!.rate }}</span>
                  <span class="text-gray ml-2">({{ product()!.rating!.count }} reviews)</span>
                </div>
              }

              <div style="font-size:2.5rem;font-weight:900;color:#2563eb;margin-bottom:1.5rem">
                ₹{{ product()!.price.toFixed(2) }}
              </div>

              @if ((product()!.stock_quantity ?? 1) <= 0) {
                <div class="mb-6 p-3 rounded" style="background:#fef2f2; border-left:4px solid #dc2626; color:#dc2626; font-weight:700">
                  <i class="fas fa-exclamation-circle mr-2"></i> This product is currently Out of Stock
                </div>
              }

              <p class="text-gray mb-6" style="line-height:1.75;margin-bottom:1.5rem">{{ product()!.description }}</p>

              <div class="mb-6" style="margin-bottom:1.5rem">
                <label class="form-label">Quantity</label>
                <div class="flex items-center gap-4">
                  <button (click)="quantity.set(Math.max(1, quantity() - 1))" 
                    class="quantity-btn" [disabled]="(product()!.stock_quantity ?? 1) <= 0">-</button>
                  <span style="font-size:1.25rem" class="font-semibold">{{ (product()!.stock_quantity ?? 1) <= 0 ? 0 : quantity() }}</span>
                  <button (click)="quantity.set(quantity() + 1)" 
                    class="quantity-btn" [disabled]="(product()!.stock_quantity ?? 1) <= 0">+</button>
                </div>
              </div>

              <button (click)="addToCart()" class="btn btn-primary" style="width:100%;padding:0.75rem"
                [disabled]="(product()!.stock_quantity ?? 1) <= 0">
                <i class="fas fa-cart-plus mr-2"></i>
                {{ (product()!.stock_quantity ?? 1) <= 0 ? 'Out of Stock' : 'Add to Cart' }}
              </button>
            </div>
          </div>
        </div>

        <app-review-section [productId]="product()!.id"></app-review-section>
      </div>
    }
  `
})
export class ProductDetailComponent implements OnInit {
  app    = inject(AppService);
  router = inject(Router);
  route  = inject(ActivatedRoute);

  product  = signal<Product | null>(null);
  quantity = signal(1);
  Math     = Math;
  getImageUrl = getImageUrl;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    // First try from signal (navigation from product card)
    const selected = this.app.selectedProduct();
    if (selected && selected.id === id) {
      this.product.set(selected);
    } else {
      // Find from products list (direct URL access)
      const found = this.app.products().find(p => p.id === id);
      if (found) {
        this.product.set(found);
      } else {
        // Products might not be loaded yet; wait
        const check = setInterval(() => {
          const p = this.app.products().find(x => x.id === id);
          if (p) { this.product.set(p); clearInterval(check); }
        }, 200);
        setTimeout(() => clearInterval(check), 5000);
      }
    }
  }

  addToCart(): void {
    if (this.product()) {
      this.app.addToCart(this.product()!, this.quantity());
    }
  }

  onImgError(e: Event): void {
    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=No+Image';
  }
}
