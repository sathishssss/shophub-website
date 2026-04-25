import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';

import { AppService, getImageUrl } from '../../services/app.service';


@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [DatePipe],
  template: `
    @if (!app.currentUser()) {
      <div class="text-center py-12">
        <p class="text-gray mb-4">Please login to view orders</p>
        <button (click)="router.navigate(['/login'])" class="btn btn-primary">Login</button>
      </div>
    } @else if (app.orders().length === 0) {
      <div class="text-center py-12">
        <div style="font-size:4rem;margin-bottom:1rem">📦</div>
        <h2 class="mb-4">No orders yet</h2>
        <button (click)="router.navigate(['/products'])" class="btn btn-primary" style="padding:0.75rem 1.5rem">
          Start Shopping
        </button>
      </div>
    } @else {
      <div>
        <h1 class="mb-8">My Orders</h1>
        <div style="display:flex;flex-direction:column;gap:1.5rem">
          @for (order of app.orders(); track order.id) {
            <div class="card p-6">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <h3 class="font-bold">Order #{{ order.id }}</h3>
                  <p class="text-sm text-gray">{{ order.date | date:'mediumDate' }}</p>
                </div>
                <span class="badge badge-blue">{{ order.status }}</span>
              </div>

              <div style="margin-bottom:1rem">
                @for (item of order.items; track item.id) {
                  <div class="flex justify-between items-center text-sm mb-3">
                    <div class="flex items-center gap-3" style="flex:1">
                      <img [src]="getImageUrl(item.image)" style="width:32px;height:32px;object-fit:contain;border-radius:4px" alt="Product Image" />
                      <span class="line-clamp-1">{{ item.title }} x{{ item.quantity }}</span>
                    </div>
                    <div class="flex items-center gap-3">
                      @if (order.status === 'Delivered') {
                        <button (click)="rateProduct(item.id)" class="text-blue font-bold"
                          style="font-size:0.7rem;padding:0.25rem 0.75rem;border-radius:50px;background:#eff6ff;border:none;cursor:pointer">
                          Rate Product
                        </button>
                      }
                      <span class="ml-2 font-semibold">₹{{ ((item.price * item.quantity) || 0).toFixed(2) }}</span>
                    </div>
                  </div>
                }
              </div>

              <div style="border-top:1px solid #e5e7eb;padding-top:1rem">
                <div class="flex justify-between font-bold">
                  <span>Total</span>
                  <span>₹{{ (order.total || 0).toFixed(2) }}</span>
                </div>
              </div>

              <div class="mt-4 grid grid-cols-1 md-grid-cols-2" style="gap:1rem;font-size:0.875rem">
                <div class="text-gray">
                  <p class="font-bold text-black mb-1">Shipping Details</p>
                  <p>{{ order.shippingAddress.name }}</p>
                  <p>{{ order.shippingAddress.address }}</p>
                  <p>{{ order.shippingAddress.city }}, {{ order.shippingAddress.zipCode }}</p>
                  <p class="mt-1"><i class="fas fa-phone-alt mr-1"></i> {{ order.shippingAddress.phone || 'N/A' }}</p>
                </div>
                <div class="text-gray">
                  <p class="font-bold text-black mb-1">Payment Method</p>
                  <div class="flex items-center gap-2">
                    <span class="badge" [class.badge-primary]="order.paymentMethod === 'Razorpay'" [class.badge-blue]="order.paymentMethod === 'Cash on Delivery'" style="font-size:0.75rem">
                      {{ order.paymentMethod }}
                    </span>
                  </div>
                  @if (order.transactionId && order.transactionId !== 'COD') {
                    <p class="mt-2" style="font-size:0.75rem">Trans ID: <span class="font-mono">{{ order.transactionId }}</span></p>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `
})
export class OrdersComponent {
  app = inject(AppService);
  router = inject(Router);
  getImageUrl = getImageUrl;

  rateProduct(itemId: number): void {
    const product = this.app.products().find(p => p.id === itemId);
    if (product) {
      this.app.selectedProduct.set(product);
      this.router.navigate(['/product', itemId]);
    }
  }
}
