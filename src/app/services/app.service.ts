import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Product, User, CartItem, Order, Toast, Slide } from '../models/models';
import { environment } from '../../environments/environment';

export const API_URL = environment.apiUrl;
export const BACKEND_URL = environment.backendUrl;
export const DEFAULT_AVATAR = 'https://img.freepik.com/premium-photo/profile-icon-white-background_941097-162371.jpg';

export function getImageUrl(img: string | undefined): string {
  // If no image, return placeholder
  if (!img) return 'https://via.placeholder.com/400x300?text=No+Image';

  // If already a full URL (http/https), return as-is
  if (img.startsWith('http://') || img.startsWith('https://')) return img;

  // If data URL, return as-is
  if (img.startsWith('data:image')) return img;

  // For local product images (filenames), they are served from /products
  const cleanImg = img.startsWith('/') ? img : '/products/' + img;

  return BACKEND_URL + cleanImg;
}

@Injectable({ providedIn: 'root' })
export class AppService {
  currentUser = signal<User | null>(null);
  products = signal<Product[]>([]);
  slides = signal<Slide[]>([]);
  subscribers = signal<any[]>([]);
  cart = signal<CartItem[]>([]);
  orders = signal<Order[]>([]);
  users = signal<User[]>([]);
  loading = signal<boolean>(true);
  toasts = signal<Toast[]>([]);
  selectedProduct = signal<Product | null>(null);
  notifications = signal<any[]>([]);

  cartItemCount = computed(() =>
    this.cart().reduce((sum, item) => sum + item.quantity, 0)
  );

  constructor(private http: HttpClient, private router: Router) {
    this.init();
  }

  private init(): void {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const user: User = JSON.parse(userStr);
      this.currentUser.set(user);
      this.fetchOrders(user);
      this.fetchNotifications(user);
    }
    const cartStr = localStorage.getItem('cart');
    if (cartStr) this.cart.set(JSON.parse(cartStr));
    this.fetchProducts();
    this.fetchSlides();
  }

  // ─── PRODUCTS ───────────────────────────────────────
  fetchProducts(): void {
    this.loading.set(true);
    this.http.get<Product[]>(`${API_URL}/products`).subscribe({
      next: (data) => {
        this.products.set(Array.isArray(data) ? data : []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching Products:', err);
        this.products.set([]);
        this.loading.set(false);
        this.showToast('Failed to load local products', 'error');
      }
    });
  }

  addProduct(product: any): void {
    const token = localStorage.getItem('token') || this.currentUser()?.token;
    
    // Check if it's FormData (for file uploads) or regular object
    const isFormData = product instanceof FormData;
    
    this.http.post(`${API_URL}/products`, product, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: () => { this.fetchProducts(); this.showToast('Product added successfully', 'success'); },
      error: () => this.showToast('Failed to add product', 'error')
    });
  }

  updateProduct(product: any): void {
    const token = localStorage.getItem('token') || this.currentUser()?.token;
    
    // For updates, if it's FormData, the ID must be part of the URL
    // We extracted ID in the component before calling this if it's FormData
    const id = product instanceof FormData ? product.get('id') : product.id;

    this.http.put(`${API_URL}/products/${id}`, product, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: () => { this.fetchProducts(); this.showToast('Product updated successfully', 'success'); },
      error: () => this.showToast('Failed to update product', 'error')
    });
  }

  deleteProduct(id: number): void {
    const token = localStorage.getItem('token') || this.currentUser()?.token;
    this.http.delete(`${API_URL}/products/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: () => { this.fetchProducts(); this.showToast('Product deleted successfully', 'success'); },
      error: () => this.showToast('Failed to delete product', 'error')
    });
  }

  // ─── SLIDES ──────────────────────────────────────────
  fetchSlides(): void {
    this.http.get<Slide[]>(`${API_URL}/slides`).subscribe({
      next: (data) => this.slides.set(data),
      error: (err) => console.error('Error fetching slides:', err)
    });
  }

  addSlide(slide: any): void {
    const token = localStorage.getItem('token') || this.currentUser()?.token;
    this.http.post(`${API_URL}/slides`, slide, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: () => { this.fetchSlides(); this.showToast('Slide added successfully', 'success'); },
      error: () => this.showToast('Failed to add slide', 'error')
    });
  }

  updateSlide(slide: any): void {
    const token = localStorage.getItem('token') || this.currentUser()?.token;
    const id = slide instanceof FormData ? slide.get('id') : slide.id;
    this.http.put(`${API_URL}/slides/${id}`, slide, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: () => { this.fetchSlides(); this.showToast('Slide updated successfully', 'success'); },
      error: () => this.showToast('Failed to update slide', 'error')
    });
  }

  deleteSlide(id: number): void {
    const token = localStorage.getItem('token') || this.currentUser()?.token;
    this.http.delete(`${API_URL}/slides/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: () => { this.fetchSlides(); this.showToast('Slide deleted successfully', 'success'); },
      error: () => this.showToast('Failed to delete slide', 'error')
    });
  }

  // ─── SUBSCRIBERS ─────────────────────────────────────
  subscribe(email: string): void {
    this.http.post(`${API_URL}/subscribers`, { email }).subscribe({
      next: (res: any) => this.showToast(res.message, 'success'),
      error: (err) => this.showToast(err.error.message || 'Subscription failed', 'error')
    });
  }

  fetchSubscribers(): void {
    const token = localStorage.getItem('token') || this.currentUser()?.token;
    this.http.get<any[]>(`${API_URL}/subscribers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (data) => this.subscribers.set(data),
      error: (err) => console.error('Error fetching subscribers:', err)
    });
  }

  // ─── AUTH ────────────────────────────────────────────
  login(user: User): void {
    this.currentUser.set(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    if (user.token) localStorage.setItem('token', user.token);
    this.fetchOrders(user);
    this.fetchNotifications(user);
  }

  logout(): void {
    this.currentUser.set(null);
    this.orders.set([]);
    this.users.set([]);
    this.notifications.set([]);
    localStorage.removeItem('currentUser');
    this.router.navigate(['/']);
  }

  async updateProfile(id: number, name: string, profileImage: string, phone?: string, location?: string): Promise<boolean> {
    const token = localStorage.getItem('token') || this.currentUser()?.token;
    try {
      const res = await fetch(`${API_URL}/auth/profile/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, profileImage, phone, location })
      });
      if (res.ok) {
        const updated: User = await res.json();
        this.currentUser.set(updated);
        localStorage.setItem('currentUser', JSON.stringify(updated));
        if (updated.token) localStorage.setItem('token', updated.token);
        this.showToast('Profile updated successfully!', 'success');
        return true;
      } else {
        const err = await res.json();
        this.showToast(err.message || 'Failed to update profile', 'error');
        return false;
      }
    } catch {
      this.showToast('Error updating profile', 'error');
      return false;
    }
  }

  // ─── CART ────────────────────────────────────────────
  addToCart(product: Product, quantity = 1): void {
    const qty = typeof quantity === 'number' ? quantity : 1;
    const existing = this.cart().find(i => i.id === product.id);
    let newCart: CartItem[];
    if (existing) {
      newCart = this.cart().map(i =>
        i.id === product.id ? { ...i, quantity: i.quantity + qty } : i
      );
    } else {
      newCart = [...this.cart(), { ...product, quantity: qty }];
    }
    this.cart.set(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    this.showToast(`${product.title} added to cart!`, 'success', 'Cart Updated');
  }

  updateCartQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) { this.removeFromCart(productId); return; }
    const newCart = this.cart().map(i =>
      i.id === productId ? { ...i, quantity } : i
    );
    this.cart.set(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  }

  removeFromCart(productId: number): void {
    const newCart = this.cart().filter(i => i.id !== productId);
    this.cart.set(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  }

  clearCart(): void {
    this.cart.set([]);
    localStorage.setItem('cart', JSON.stringify([]));
  }

  // ─── ORDERS ──────────────────────────────────────────
  fetchOrders(user: User): void {
    const token = localStorage.getItem('token') || user.token;
    this.http.get<Order[]>(`${API_URL}/orders`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        this.orders.set(data);
        if (user.isAdmin) {
          this.fetchUsers();
        }
      },
      error: (err) => console.error('Error fetching orders:', err)
    });
  }

  updateOrderStatus(orderId: number, status: string): void {
    const token = localStorage.getItem('token') || this.currentUser()?.token;
    this.http.put(`${API_URL}/orders/${orderId}/status`, { status }, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: () => {
        this.orders.update(orders =>
          orders.map(o => o.id === orderId ? { ...o, status: status as Order['status'] } : o)
        );
        this.showToast(`Order #${orderId} updated to ${status}`, 'success');
      },
      error: () => this.showToast('Failed to update order status', 'error')
    });
  }

  deleteOrder(id: number, reason?: string): void {
    const token = localStorage.getItem('token') || this.currentUser()?.token;
    this.http.delete(`${API_URL}/orders/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      body: { reason }
    }).subscribe({
      next: () => {
        this.orders.update(orders => orders.filter(o => o.id !== id));
        this.showToast(`Order #${id} deleted successfully`, 'success');
      },
      error: () => this.showToast('Failed to delete order', 'error')
    });
  }

  // ─── USERS ───────────────────────────────────────────
  fetchUsers(): void {
    this.http.get<User[]>(`${API_URL}/users`).subscribe({
      next: (data) => this.users.set(data),
      error: (err) => console.error('Error fetching users:', err)
    });
  }

  fetchNotifications(user: User): void {
    const token = localStorage.getItem('token') || user.token;
    if (!token) return;
    this.http.get<any[]>(`${API_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (data) => this.notifications.set(data),
      error: (err) => console.error('Error fetching notifications:', err)
    });
  }

  // ─── TOASTS ──────────────────────────────────────────
  showToast(message: string, type: Toast['type'] = 'info', title = ''): void {
    const id = Date.now();
    this.toasts.update(t => [...t, { id, message, type, title }]);
    setTimeout(() => this.removeToast(id), 3000);
  }

  removeToast(id: number): void {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }
}
