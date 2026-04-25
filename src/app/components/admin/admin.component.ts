import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AppService, getImageUrl } from '../../services/app.service';
import { Product, Slide } from '../../models/models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    @if (!app.currentUser()?.isAdmin) {
      <div class="text-center py-12">
        <p class="text-gray mb-4">Access denied. Admin only.</p>
        <button (click)="router.navigate(['/'])" class="btn btn-primary">Go Home</button>
      </div>
    } @else {
      <div>
        <h1 class="mb-8">Admin Dashboard</h1>
        
        <!-- Stats Bar -->
        <style>
          .stat-card {
            border: 1px solid rgba(229, 231, 235, 0.5);
            background: #ffffff;
            position: relative;
            z-index: 1;
          }
          .stat-card .decor {
            position: absolute;
            top: -24px;
            right: -24px;
            width: 110px;
            height: 110px;
            border-radius: 50%;
            z-index: -1;
            transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            opacity: 0.5;
          }
          .stat-card:hover .decor {
            transform: scale(2) translate(-10%, 10%);
            opacity: 0.8;
          }
          .stat-icon {
            width: 52px;
            height: 52px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          }
            .tabs {
  border-bottom: 2px solid #f3f4f6;
  display: flex;
  gap: 2rem;
  padding: 0 1.5rem;
}

.tab.active {
  color: #2563eb; /* Bright highlight color */
  border-bottom: 2px solid #2563eb;
  font-weight: 700;
}

          .trend-badge {
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 4px;
          }
        </style>
        <div class="grid grid-cols-1 md-grid-cols-2 lg-grid-cols-4 mb-8" style="gap:1.5rem">
          <!-- Total Revenue -->
          <div class="card p-6 stat-card">
            <div class="decor" style="background: linear-gradient(135deg, #e0e7ff, #bfdbfe);"></div>
            <div class="flex justify-between items-start">
              <div>
                <div class="text-gray text-xs font-bold mb-1 uppercase tracking-wider">Total Revenue</div>
                <div style="font-size:2rem; font-weight:800; color:#111827; letter-spacing:-0.5px;">₹{{ calculateRevenue().toFixed(2) }}</div>
              </div>
              <div class="stat-icon" style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white;">
                <i class="fas fa-wallet"></i>
              </div>
            </div>
            <div class="mt-4 flex items-center" style="gap:0.75rem;">
              <span class="trend-badge" style="background:#def7ec; color:#03543f;">
                <i class="fas fa-arrow-trend-up"></i> ₹{{ (calculateRevenue() / (app.orders().length || 1)).toFixed(2) }} / order
              </span>
              <span class="text-gray text-xs font-medium">All time sales</span>
            </div>
          </div>

          <!-- Total Orders -->
          <div class="card p-6 stat-card">
            <div class="decor" style="background: linear-gradient(135deg, #d1fae5, #a7f3d0);"></div>
            <div class="flex justify-between items-start">
              <div>
                <div class="text-gray text-xs font-bold mb-1 uppercase tracking-wider">Total Orders</div>
                <div style="font-size:2rem; font-weight:800; color:#111827; letter-spacing:-0.5px;">{{ app.orders().length }}</div>
              </div>
              <div class="stat-icon" style="background: linear-gradient(135deg, #10b981, #059669); color: white;">
                <i class="fas fa-shopping-bag"></i>
              </div>
            </div>
            <div class="mt-4 flex items-center" style="gap:0.75rem;">
              <span class="trend-badge" style="background:#def7ec; color:#03543f;">
                <i class="fas fa-check-circle"></i> {{ app.orders().filter(getDelivered).length || 0 }} Delivered
              </span>
              <span class="text-gray text-xs font-medium">Managed orders</span>
            </div>
          </div>

          <!-- Active Users -->
          <div class="card p-6 stat-card">
            <div class="decor" style="background: linear-gradient(135deg, #ede9fe, #ddd6fe);"></div>
            <div class="flex justify-between items-start">
              <div>
                <div class="text-gray text-xs font-bold mb-1 uppercase tracking-wider">Active Users</div>
                <div style="font-size:2rem; font-weight:800; color:#111827; letter-spacing:-0.5px;">{{ app.users().length }}</div>
              </div>
              <div class="stat-icon" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white;">
                <i class="fas fa-users"></i>
              </div>
            </div>
            <div class="mt-4 flex items-center" style="gap:0.75rem;">
              <span class="trend-badge" style="background:#f3e8ff; color:#6b21a8;">
                <i class="fas fa-user-check"></i> {{ app.users().filter(getAdmin).length || 0 }} Admins
              </span>
              <span class="text-gray text-xs font-medium">Registered customers</span>
            </div>
          </div>

          <!-- Avg Order Value -->
          <div class="card p-6 stat-card">
            <div class="decor" style="background: linear-gradient(135deg, #fef3c7, #fde68a);"></div>
            <div class="flex justify-between items-start">
              <div>
                <div class="text-gray text-xs font-bold mb-1 uppercase tracking-wider">Avg Order Value</div>
                <div style="font-size:2rem; font-weight:800; color:#111827; letter-spacing:-0.5px;">₹{{ (calculateRevenue() / (app.orders().length || 1)).toFixed(2) }}</div>
              </div>
              <div class="stat-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white;">
                <i class="fas fa-chart-pie"></i>
              </div>
            </div>
            <div class="mt-4 flex items-center" style="gap:0.75rem;">
              <span class="trend-badge" style="background:#e0e7ff; color:#1e40af;">
                <i class="fas fa-bolt"></i> Based on {{ app.orders().length }} orders
              </span>
              <span class="text-gray text-xs font-medium">Efficiency per user</span>
            </div>
          </div>
        </div>

        <div class="card mb-8">
          <div class="tabs">
            <button class="tab" [class.active]="activeTab==='products'" (click)="activeTab='products'">
              Products ({{ app.products().length }})
            </button>
            <button class="tab" [class.active]="activeTab==='orders'" (click)="activeTab='orders'">
              Orders ({{ app.orders().length }})
            </button>
            <button class="tab" [class.active]="activeTab==='slides'" (click)="activeTab='slides'">
              Slides ({{ app.slides().length }})
            </button>
            <button class="tab" [class.active]="activeTab==='subscribers'" (click)="activeTab='subscribers'; app.fetchSubscribers()">
              Subscribers ({{ app.subscribers().length }})
            </button>
            <button class="tab" [class.active]="activeTab==='users'" (click)="activeTab='users'">
              Users ({{ app.users().length }})
            </button>
          </div>

          <div class="p-6">

            <!-- PRODUCTS TAB -->
            @if (activeTab === 'products') {
              <div>
                <h2 class="mb-6">{{ editingProduct ? 'Edit Product' : 'Add New Product' }}</h2>
                <form (ngSubmit)="handleProductSubmit()" style="background:#f9fafb;padding:1.5rem;border-radius:0.5rem;margin-bottom:2rem">
                  <div class="grid grid-cols-1 md-grid-cols-2 lg-grid-cols-3 mb-4" style="gap:1rem">
                    <input type="text" placeholder="Product Title" required [(ngModel)]="productForm.title" name="title" class="form-control" />
                    <input type="number" placeholder="Price" required [(ngModel)]="productForm.price" name="price" class="form-control" />
                    <input type="text" placeholder="Category" [(ngModel)]="productForm.category" name="category" class="form-control" />
                    <input type="number" placeholder="Stock Quantity" [(ngModel)]="productForm.stock_quantity" name="stock_quantity" class="form-control" />
                    <div class="flex flex-col gap-1">
                      <input type="text" placeholder="Image URL (optional if uploading file)" [(ngModel)]="productForm.image" name="image" class="form-control" />
                      <div class="flex items-center gap-2 mt-2">
                        <label class="btn btn-sm" style="background:#e5e7eb; cursor:pointer; font-size: 0.8rem; padding: 0.4rem 0.8rem;">
                          <i class="fas fa-upload mr-1"></i> Upload Image File
                          <input type="file" (change)="onFileSelected($event)" accept="image/*" style="display:none" />
                        </label>
                        @if (selectedFile) {
                          <span class="text-xs text-blue-600 font-medium line-clamp-1">{{ selectedFile.name }}</span>
                          <button type="button" (click)="removeSelectedFile()" class="text-red-500 hover:text-red-700" title="Remove file">
                            <i class="fas fa-times-circle"></i>
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                  <textarea placeholder="Description" [(ngModel)]="productForm.description" name="description" class="form-control mb-4" style="height:100px"></textarea>
                  <div class="flex gap-4">
                    <button type="submit" class="btn btn-primary">{{ editingProduct ? 'Update' : 'Add' }} Product</button>
                    @if (editingProduct) {
                      <button type="button" (click)="cancelEdit()" class="btn" style="background:#6b7280;color:white">Cancel</button>
                    }
                  </div>
                </form>

                <h3 class="mb-4">All Products</h3>
                <div class="alert alert-warning">
                  <p class="text-sm">
                    <i class="fas fa-info-circle mr-2"></i>
                    <strong>Note:</strong> API products cannot be edited/deleted. Only custom products can be managed.
                  </p>
                </div>

                <div style="max-height:24rem;overflow-y:auto">
                  @for (product of app.products(); track product.id) {
                    <div class="flex items-center gap-4 p-4 rounded mb-4" style="background:#f9fafb">
                      <img [src]="getImageUrl(product.image)" [alt]="product.title"
                        style="width:80px;height:80px;object-fit:contain"
                        (error)="onImgError($event)" />
                      <div style="flex:1">
                        <h4 class="font-semibold line-clamp-1">{{ product.title }}</h4>
                        <p class="text-sm text-gray capitalize">{{ product.category }} — ₹{{ (product.price || 0).toFixed(2) }}</p>
                      </div>
                      @if (product.isLocal) {
                        <button (click)="editProduct(product)" class="btn btn-primary">Edit</button>
                        <button (click)="deleteProduct(product.id)" class="btn btn-danger">Delete</button>
                      } @else {
                        <span class="text-sm text-gray" style="font-style:italic">API Product</span>
                      }
                    </div>
                  }
                </div>
              </div>
            }

            <!-- SLIDES TAB -->
            @if (activeTab === 'slides') {
              <div>
                <h2 class="mb-6">{{ editingSlide ? 'Edit Slide' : 'Add New Slide' }}</h2>
                <form (ngSubmit)="handleSlideSubmit()" style="background:#f9fafb;padding:1.5rem;border-radius:0.5rem;margin-bottom:2rem">
                  <div class="grid grid-cols-1 md-grid-cols-2 mb-4" style="gap:1rem">
                    <input type="text" placeholder="Title" required [(ngModel)]="slideForm.title" name="title" class="form-control" />
                    <input type="text" placeholder="Subtitle" [(ngModel)]="slideForm.subtitle" name="subtitle" class="form-control" />
                    <div class="flex flex-col gap-1">
                      <input type="text" placeholder="Image URL (optional if uploading file)" [(ngModel)]="slideForm.image" name="image" class="form-control" />
                      <div class="flex items-center gap-2 mt-2">
                        <label class="btn btn-sm" style="background:#e5e7eb; cursor:pointer; font-size: 0.8rem; padding: 0.4rem 0.8rem;">
                          <i class="fas fa-upload mr-1"></i> Upload Image File
                          <input type="file" (change)="onSlideFileSelected($event)" accept="image/*" style="display:none" />
                        </label>
                        <p class="text-xs text-gray mt-1" style="font-style: italic;">
                          * Recommended: 1920x800px (Wide Landscape)
                        </p>
                        @if (selectedSlideFile) {
                          <span class="text-xs text-blue-600 font-medium line-clamp-1">{{ selectedSlideFile.name }}</span>
                          <button type="button" (click)="removeSelectedSlideFile()" class="text-red-500 hover:text-red-700" title="Remove file">
                            <i class="fas fa-times-circle"></i>
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                  <div class="flex gap-4">
                    <button type="submit" class="btn btn-primary">{{ editingSlide ? 'Update' : 'Add' }} Slide</button>
                    @if (editingSlide) {
                      <button type="button" (click)="cancelSlideEdit()" class="btn" style="background:#6b7280;color:white">Cancel</button>
                    }
                  </div>
                </form>

                <h3 class="mb-4">All Slides</h3>
                <div style="max-height:30rem;overflow-y:auto">
                  @for (slide of app.slides(); track slide.id) {
                    <div class="flex items-center gap-4 p-4 rounded mb-4" style="background:#f9fafb">
                      <img [src]="getImageUrl(slide.image)" [alt]="slide.title"
                        style="width:120px;height:60px;object-fit:cover;border-radius:4px" />
                      <div style="flex:1">
                        <h4 class="font-semibold">{{ slide.title }}</h4>
                        <p class="text-sm text-gray">{{ slide.subtitle }}</p>
                      </div>
                      <div class="flex gap-2">
                        <button (click)="editSlide(slide)" class="btn btn-primary btn-sm">Edit</button>
                        <button (click)="deleteSlide(slide.id)" class="btn btn-danger btn-sm">Delete</button>
                      </div>
                    </div>
                  }
                  @if (app.slides().length === 0) {
                    <div class="text-center py-8 text-gray">
                      <i class="fas fa-images text-4xl mb-3 opacity-20"></i>
                      <p>No slides found. Add some slides to show on the homepage hero slider.</p>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- SUBSCRIBERS TAB -->
            @if (activeTab === 'subscribers') {
              <div>
                <h2 class="mb-6">Newsletter Subscribers</h2>
                <div style="background:#f9fafb; padding:1.5rem; border-radius:0.5rem; margin-bottom:2rem">
                  <div class="flex justify-between items-center mb-4">
                    <p class="text-gray">{{ app.subscribers().length }} people want to hear from you!</p>
                    <button class="btn btn-sm" style="background:#10b981; color:white" (click)="exportSubscribers()">
                      <i class="fas fa-file-export mr-1"></i> Export List
                    </button>
                  </div>
                  
                  <div style="max-height:30rem; overflow-y:auto">
                    <table style="width:100%; border-collapse:collapse; background:white; border-radius:0.5rem; overflow:hidden">
                      <thead style="background:#f3f4f6">
                        <tr>
                          <th style="padding:1rem; text-align:left; font-size:0.875rem; color:#4b5563">Email Address</th>
                          <th style="padding:1rem; text-align:left; font-size:0.875rem; color:#4b5563">Subscribed On</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (sub of app.subscribers(); track sub.id) {
                          <tr style="border-bottom:1px solid #f3f4f6">
                            <td style="padding:1rem; color:#111827">{{ sub.email }}</td>
                            <td style="padding:1rem; color:#6b7280; font-size:0.875rem">{{ sub.created_at | date:'mediumDate' }}</td>
                          </tr>
                        }
                        @if (app.subscribers().length === 0) {
                          <tr>
                            <td colspan="2" style="padding:2rem; text-align:center; color:#9ca3af">No subscribers yet.</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            }

            <!-- ORDERS TAB -->
            @if (activeTab === 'orders') {
              <div>
                <h2 class="mb-6">All Orders</h2>
                @if (app.orders().length === 0) {
                  <div class="text-center py-12 text-gray">No orders yet</div>
                } @else {
                  <div style="display:flex;flex-direction:column;gap:1rem">
                    @for (order of app.orders(); track order.id) {
                      <div class="p-6 rounded" style="background:#f9fafb">
                        <div class="flex justify-between items-start mb-4">
                          <div>
                            <h3 class="font-bold">Order #{{ order.id }}</h3>
                            <p class="text-sm text-gray">Customer: {{ getUserName(order.userId) }}</p>
                            <p class="text-sm text-gray mb-3">{{ order.date | date:'medium' }}</p>
                            
                            @if (order.shippingAddress) {
                              <div style="padding:0.6rem;background:white;border:1px solid #e5e7eb;border-radius:0.4rem;min-width:200px">
                                <p style="font-size:0.75rem;font-weight:700;color:#374151;margin-bottom:0.2rem;text-transform:uppercase;letter-spacing:0.05em">
                                  <i class="fas fa-map-marker-alt text-blue-500 mr-1"></i> Shipping Details
                                </p>
                                <p style="font-size:0.8rem;color:#4b5563">{{ order.shippingAddress.name }}</p>
                                <p style="font-size:0.8rem;color:#4b5563">{{ order.shippingAddress.address }}</p>
                                <p style="font-size:0.8rem;color:#4b5563">{{ order.shippingAddress.city }}, {{ order.shippingAddress.zipCode }}</p>
                                <p style="font-size:0.8rem;font-weight:bold;color:#1d4ed8;margin-top:0.2rem">
                                  <i class="fas fa-phone-alt mr-1"></i> {{ order.shippingAddress.phone || 'No Phone' }}
                                </p>
                              </div>
                            }
                          </div>
                          <div>
                            <div class="mb-3 text-right">
                              <span class="badge" [class.badge-primary]="order.paymentMethod === 'Razorpay'" [class.badge-blue]="order.paymentMethod === 'Cash on Delivery'" style="font-size:0.75rem">
                                {{ order.paymentMethod }}
                              </span>
                              @if (order.transactionId && order.transactionId !== 'COD') {
                                <p class="mt-1 text-gray" style="font-size:0.7rem">ID: {{ order.transactionId }}</p>
                              }
                            </div>
                            <div class="flex items-center gap-2">
                              <select [ngModel]="order.status" (ngModelChange)="app.updateOrderStatus(order.id, $event)"
                                name="status_{{order.id}}" class="form-control" style="width: auto;">
                                <option>Processing</option>
                                <option>Shipped</option>
                                <option>Delivered</option>
                                <option>Cancelled</option>
                              </select>
                              <button (click)="deleteOrder(order.id)" class="btn btn-danger" style="padding: 0.5rem 0.75rem; min-width: auto;" title="Delete Order">
                                <i class="fas fa-trash"></i>
                              </button>
                              <span class="font-bold">₹{{ (order.total || 0).toFixed(2) }}</span>
                            </div>
                          </div>
                        </div>
                        <div class="text-sm">
                          @for (item of order.items; track item.id) {
                            <div class="flex justify-between mb-1">
                              <span class="line-clamp-1" style="flex:1">{{ item.title }} x{{ item.quantity }}</span>
                              <span class="ml-2">₹{{ ((item.price * item.quantity) || 0).toFixed(2) }}</span>
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }

            <!-- USERS TAB -->
            @if (activeTab === 'users') {
              <div>
                <h2 class="mb-6">All Users</h2>
                <div style="display:flex;flex-direction:column;gap:1rem">
                  @for (user of app.users(); track user.id) {
                    <div class="p-4 rounded flex justify-between items-center" style="background:#f9fafb">
                      <div>
                        <h3 class="font-semibold">{{ user.name }}</h3>
                        <p class="text-sm text-gray">{{ user.email }}</p>
                      </div>
                      <span [class]="'badge ' + (user.isAdmin ? 'badge-purple' : 'badge-gray')">
                        {{ user.isAdmin ? 'Admin' : 'Customer' }}
                      </span>
                    </div>
                  }
                </div>
              </div>
            }

          </div>
        </div>
      </div>
    }
  `
})
export class AdminComponent {
  app = inject(AppService);
  router = inject(Router);
  
  activeTab = 'products';
  editingProduct: Product | null = null;
  productForm = { title: '', price: '', category: '', image: '', description: '', stock_quantity: 0 };
  selectedFile: File | null = null;

  editingSlide: Slide | null = null;
  slideForm = { title: '', subtitle: '', image: '' };
  selectedSlideFile: File | null = null;
  
  getImageUrl = getImageUrl;

  calculateRevenue(): number {
    return this.app.orders().reduce((sum, order) => sum + (order.total || 0), 0);
  }

  getDelivered(order: any): boolean {
    return order.status === 'Delivered';
  }

  getAdmin(user: any): boolean {
    return !!user.isAdmin;
  }


  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        this.app.showToast('File size should be less than 2MB', 'warning');
        return;
      }
      this.selectedFile = file;
    }
  }

  removeSelectedFile(): void {
    this.selectedFile = null;
  }

  handleProductSubmit(): void {
    if (!this.productForm.title || !this.productForm.price || !this.productForm.category || !this.productForm.description) {
      this.app.showToast('Please fill out all required fields', 'warning');
      return;
    }

    if (!this.productForm.image && !this.selectedFile) {
      this.app.showToast('Please provide an image URL or upload a file', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('title', this.productForm.title);
    formData.append('price', this.productForm.price.toString());
    formData.append('category', this.productForm.category);
    formData.append('description', this.productForm.description);
    formData.append('stock_quantity', this.productForm.stock_quantity.toString());
    
    if (this.selectedFile) {
      formData.append('imageFile', this.selectedFile);
    } else {
      formData.append('image', this.productForm.image);
    }

    if (this.editingProduct) {
      formData.append('id', this.editingProduct.id.toString());
      this.app.updateProduct(formData);
    } else {
      this.app.addProduct(formData);
    }
    this.cancelEdit();
  }

  editProduct(p: Product): void {
    this.editingProduct = p;
    this.productForm = {
      title: p.title,
      price: p.price.toString(),
      category: p.category,
      image: p.image,
      description: p.description,
      stock_quantity: p.stock_quantity || 0
    };
  }

  cancelEdit(): void {
    this.editingProduct = null;
    this.productForm = { title: '', price: '', category: '', image: '', description: '', stock_quantity: 0 };
    this.selectedFile = null;
  }

  deleteProduct(id: number): void {
    if (confirm('Are you sure you want to delete this product?')) {
      this.app.deleteProduct(id);
      console.log('Product deleted!' + id);
    }
  }

  deleteOrder(id: number): void {
    const reason = prompt(`Are you sure you want to cancel and delete order #${id}? Please provide a reason to notify the customer (or click cancel to abort):`);
    if (reason !== null) {
      if (reason.trim() === '') {
        this.app.showToast('You must provide a cancellation reason to notify the customer.', 'warning');
        return;
      }
      this.app.deleteOrder(id, reason);
    }
  }

  // Slide Management
  onSlideFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        this.app.showToast('File size should be less than 2MB', 'warning');
        return;
      }

      // Check Dimensions
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const width = img.width;
        const height = img.height;
        
        // Validation: Hero slides must be wide and high quality
        if (width < 1200) {
          this.app.showToast('Image width must be at least 1200px for a high-quality hero slider.', 'warning');
          return;
        }

        if (width < height) {
          this.app.showToast('Please upload a landscape (wide) image. Portrait images do not fit the hero slider.', 'warning');
          return;
        }

        this.selectedSlideFile = file;
        this.app.showToast(`Image accepted: ${width}x${height}px`, 'success');
      };
    }
  }

  removeSelectedSlideFile(): void {
    this.selectedSlideFile = null;
  }

  handleSlideSubmit(): void {
    if (!this.slideForm.title) {
      this.app.showToast('Title is required', 'warning');
      return;
    }

    if (!this.slideForm.image && !this.selectedSlideFile) {
      this.app.showToast('Please provide an image URL or upload a file', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('title', this.slideForm.title);
    formData.append('subtitle', this.slideForm.subtitle || '');
    
    if (this.selectedSlideFile) {
      formData.append('imageFile', this.selectedSlideFile);
    } else {
      formData.append('image', this.slideForm.image);
    }

    if (this.editingSlide) {
      formData.append('id', this.editingSlide.id.toString());
      this.app.updateSlide(formData);
    } else {
      this.app.addSlide(formData);
    }
    this.cancelSlideEdit();
  }

  editSlide(slide: any): void {
    this.editingSlide = slide;
    this.slideForm = {
      title: slide.title,
      subtitle: slide.subtitle || '',
      image: slide.image
    };
  }

  cancelSlideEdit(): void {
    this.editingSlide = null;
    this.slideForm = { title: '', subtitle: '', image: '' };
    this.selectedSlideFile = null;
  }

  deleteSlide(id: number): void {
    if (confirm('Are you sure you want to delete this slide?')) {
      this.app.deleteSlide(id);
    }
  }

  exportSubscribers(): void {
    const emails = this.app.subscribers().map(s => s.email).join('\n');
    const blob = new Blob([emails], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shophub_subscribers_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.app.showToast('Subscriber list exported as text file', 'success');
  }

  getUserName(userId: number): string {
    return this.app.users().find(u => u.id === userId)?.name || 'Unknown';
  }

  onImgError(e: Event): void {
    (e.target as HTMLImageElement).src = 'https://placehold.co/80x80?text=No+Image';
  }
}
