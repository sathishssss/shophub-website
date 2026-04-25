import { Component, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppService, API_URL } from '../../services/app.service';

declare var Razorpay: any;

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (app.cart().length === 0) {
      <div class="text-center py-12">
        <p class="text-gray mb-4">Your cart is empty</p>
        <button (click)="router.navigate(['/products'])" class="btn btn-primary">Continue Shopping</button>
      </div>
    } @else {
      <div>
        <h1 class="mb-8">Checkout</h1>

        <form (ngSubmit)="handleSubmit()" class="grid grid-cols-1 lg-grid-cols-3" style="gap:2rem">
          <div style="grid-column:span 2 / span 2;display:flex;flex-direction:column;gap:1.5rem">

            <!-- Shipping Info -->
            <div class="card p-6">
              <h2 class="mb-4">Shipping Information</h2>
              <div class="grid grid-cols-1 md-grid-cols-2" style="gap:1rem">
                <input type="text" placeholder="Full Name" required [(ngModel)]="form.name" name="name" class="form-control" />
                <input type="email" placeholder="Email" required [(ngModel)]="form.email" name="email" class="form-control" />
                <input type="text" placeholder="Address" required [(ngModel)]="form.address" name="address" class="form-control" style="grid-column:span 2" />
                <input type="tel" placeholder="Mobile Number" required [(ngModel)]="form.phone" name="phone" class="form-control" />
                <input type="text" placeholder="City" required [(ngModel)]="form.city" name="city" class="form-control" />
                <input type="text" placeholder="ZIP Code" required [(ngModel)]="form.zipCode" name="zipCode" class="form-control" />
              </div>
            </div>

            <!-- Payment -->
            <div class="card p-6">
              <h2 class="mb-4">Payment Method</h2>
              <div class="flex gap-4 mb-6">
                <label
                  (click)="paymentMethod='Online Payment'"
                  style="padding:0.75rem;border:2px solid;border-radius:0.5rem;cursor:pointer;display:flex;align-items:center;gap:0.5rem"
                  [style.borderColor]="paymentMethod==='Online Payment'?'#2563eb':'#e5e7eb'"
                  [style.background]="paymentMethod==='Online Payment'?'#eff6ff':'white'">
                  <input type="radio" name="payment" [checked]="paymentMethod==='Online Payment'" (change)="paymentMethod='Online Payment'" />
                  <span>Online Payment (Razorpay)</span>
                </label>
                <label
                  (click)="paymentMethod='Cash on Delivery'"
                  style="padding:0.75rem;border:2px solid;border-radius:0.5rem;cursor:pointer;display:flex;align-items:center;gap:0.5rem"
                  [style.borderColor]="paymentMethod==='Cash on Delivery'?'#2563eb':'#e5e7eb'"
                  [style.background]="paymentMethod==='Cash on Delivery'?'#eff6ff':'white'">
                  <input type="radio" name="payment" [checked]="paymentMethod==='Cash on Delivery'" (change)="paymentMethod='Cash on Delivery'" />
                  <span>Cash on Delivery</span>
                </label>
              </div>

              @if (paymentMethod === 'Online Payment') {
                <div class="text-center p-4 rounded-lg" style="background:#eff6ff;border:1px solid #bfdbfe">
                  <p style="color:#1d4ed8">You will be securely redirected to Razorpay to complete your payment.</p>
                </div>
              } @else {
                <div class="text-center p-4 rounded-lg" style="background:#f0fdf4;border:1px solid #bbf7d0">
                  <p style="color:#166534">Pay with cash when your order is delivered to your address.</p>
                </div>
              }
            </div>
          </div>

          <!-- Order Summary -->
          <div>
            <div class="card p-6" style="position:sticky;top:1rem">
              <h2 class="mb-4">Order Summary</h2>
              <div style="max-height:16rem;overflow:auto;margin-bottom:1rem">
                @for (item of app.cart(); track item.id) {
                  <div class="flex justify-between text-sm mb-2">
                    <span class="line-clamp-1" style="flex:1">{{ item.title }} x{{ item.quantity }}</span>
                    <span class="ml-2">₹{{ ((item.price * item.quantity) || 0).toFixed(2) }}</span>
                  </div>
                }
              </div>
              <div style="border-top:1px solid #e5e7eb;padding-top:1rem">
                <div class="flex justify-between mb-2"><span>Subtotal</span><span>₹{{ subtotal().toFixed(2) }}</span></div>
                <div class="flex justify-between mb-2"><span>Shipping</span><span>₹10.00</span></div>
                <div class="flex justify-between" style="border-top:1px solid #e5e7eb;padding-top:0.5rem;font-size:1.125rem;font-weight:bold">
                  <span>Total</span><span>₹{{ total().toFixed(2) }}</span>
                </div>
              </div>
              <button type="submit" class="btn btn-success" style="width:100%;padding:0.75rem;margin-top:1.5rem" [disabled]="isLoading">
                @if (isLoading) {
                  <i class="fas fa-spinner fa-spin mr-2"></i> Processing...
                } @else {
                  {{ paymentMethod === 'Online Payment' ? 'Proceed to Payment' : 'Place Order' }}
                }
              </button>
            </div>
          </div>
        </form>
      </div>
    }
  `
})
export class CheckoutComponent {
  app = inject(AppService);
  router = inject(Router);

  paymentMethod = 'Online Payment';
  isLoading = false;

  form = {
    name: this.app.currentUser()?.name || '',
    email: this.app.currentUser()?.email || '',
    address: '',
    city: '',
    zipCode: '',
    phone: this.app.currentUser()?.phone || ''
  };

  subtotal = computed(() => this.app.cart().reduce((s, i) => s + i.price * i.quantity, 0));
  total = computed(() => this.subtotal() + 10);

  async handleSubmit(): Promise<void> {
    if (!this.app.currentUser()) {
      this.app.showToast('Please login to place an order', 'error');
      this.router.navigate(['/login']);
      return;
    }

    if (this.isLoading) return;
    this.isLoading = true;

    if (this.paymentMethod === 'Online Payment') {
      await this.initRazorpayCheckout();
    } else {
      await this.placeOrder('Cash on Delivery', 'COD');
    }
  }

  async initRazorpayCheckout() {
    try {
      const token = localStorage.getItem('token') || this.app.currentUser()?.token || '';
      const createOrderRes = await fetch(`${API_URL}/payment/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: this.total(), currency: 'INR' })
      });

      if (!createOrderRes.ok) {
        throw new Error('Failed to initialize payment');
      }

      const orderData = await createOrderRes.json();

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'ShopHub',
        description: 'Store Purchase',
        order_id: orderData.id,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch(`${API_URL}/payment/verify-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(response)
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              await this.placeOrder('Razorpay', response.razorpay_payment_id);
            } else {
              this.app.showToast('Payment verification failed', 'error');
              this.isLoading = false;
            }
          } catch {
            this.app.showToast('Payment verification error', 'error');
            this.isLoading = false;
          }
        },
        modal: {
          ondismiss: () => {
            this.isLoading = false;
          }
        },
        prefill: {
          name: this.form.name,
          email: this.form.email,
          contact: this.form.phone
        },
        theme: {
          color: '#2563eb'
        }
      };

      const rzp = new Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        this.app.showToast('Payment failed: ' + response.error.description, 'error');
      });
      rzp.open();

    } catch (e) {
      console.error(e);
      this.app.showToast('Error connecting to payment gateway', 'error');
      this.isLoading = false;
    }
  }

  async placeOrder(paymentMethodString: string, transactionId: string | null) {
    const order = {
      userId: this.app.currentUser()!.id,
      items: this.app.cart(),
      total: this.total(),
      shippingAddress: {
        name: this.form.name,
        email: this.form.email,
        address: this.form.address,
        city: this.form.city,
        zipCode: this.form.zipCode,
        phone: this.form.phone
      },
      paymentMethod: paymentMethodString,
      transactionId: transactionId,
      date: new Date().toISOString(),
      status: 'Processing'
    };

    try {
      const token = localStorage.getItem('token') || this.app.currentUser()?.token;
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(order)
      });

      if (res.ok) {
        this.app.clearCart();
        this.app.fetchOrders(this.app.currentUser()!);
        this.app.showToast('Order placed successfully! 🎉', 'success');
        this.router.navigate(['/orders']);
      } else {
        const err = await res.json();
        this.app.showToast(err.error || 'Failed to place order.', 'error');
      }
    } catch {
      this.app.showToast('Server error. Backend might be down.', 'error');
    } finally {
      this.isLoading = false;
    }
  }
}
