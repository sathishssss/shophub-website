import { Component, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AppService, getImageUrl } from '../../services/app.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  template: `
    @if (app.cart().length === 0) {
      <div class="text-center py-12">
        <div style="font-size:4rem;margin-bottom:1rem">🛒</div>
        <h2 class="mb-4">Your cart is empty</h2>
        <button (click)="router.navigate(['/products'])" class="btn btn-primary" style="padding:0.75rem 1.5rem">
          Start Shopping
        </button>
      </div>
    } @else {
      <div>
        <h1 class="mb-8">Shopping Cart</h1>

        <div class="grid grid-cols-1 lg-grid-cols-3" style="gap:2rem">
          <div style="grid-column:span 2 / span 2">
            <div class="card">
              @for (item of app.cart(); track item.id) {
                <div class="cart-item">
                  <img [src]="getImageUrl(item.image)" [alt]="item.title" class="cart-item-image"
                    (error)="onImgError($event)" />
                  <div class="cart-item-info">
                    <h3 class="font-semibold line-clamp-2" style="font-size:1.125rem">{{ item.title }}</h3>
                    <p class="text-gray">₹{{ (item.price || 0).toFixed(2) }}</p>
                  </div>
                  <div class="quantity-controls">
                    <button (click)="app.updateCartQuantity(item.id, item.quantity - 1)" class="quantity-btn">-</button>
                    <span class="font-semibold" style="width:32px;text-align:center">{{ item.quantity }}</span>
                    <button (click)="app.updateCartQuantity(item.id, item.quantity + 1)" class="quantity-btn">+</button>
                  </div>
                  <div class="font-bold" style="font-size:1.125rem;width:96px;text-align:right">
                    ₹{{ ((item.price * item.quantity) || 0).toFixed(2) }}
                  </div>
                  <button (click)="app.removeFromCart(item.id)" class="text-red"
                    style="background:none;border:none;cursor:pointer">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              }
            </div>
          </div>

          <div>
            <div class="card sticky p-6">
              <h2 class="mb-4">Order Summary</h2>
              <div style="margin-bottom:1rem">
                <div class="flex justify-between mb-2">
                  <span>Subtotal</span><span>₹{{ subtotal().toFixed(2) }}</span>
                </div>
                <div class="flex justify-between mb-2">
                  <span>Shipping</span><span>₹{{ shipping().toFixed(2) }}</span>
                </div>
                <div class="flex justify-between border-t" style="padding-top:0.5rem;font-size:1.125rem;font-weight:bold">
                  <span>Total</span><span>₹{{ total().toFixed(2) }}</span>
                </div>
              </div>
              <button (click)="router.navigate(['/checkout'])" class="btn btn-primary" style="width:100%;padding:0.75rem">
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class CartComponent {
  app = inject(AppService);
  router = inject(Router);
  getImageUrl = getImageUrl;

  subtotal = computed(() => this.app.cart().reduce((s, i) => s + i.price * i.quantity, 0));
  shipping = computed(() => this.subtotal() > 0 ? 10 : 0);
  total = computed(() => this.subtotal() + this.shipping());

  onImgError(e: Event): void {
    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80x80?text=Img';
  }
}
