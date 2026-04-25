import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AppService, DEFAULT_AVATAR } from '../../services/app.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    @if (!app.currentUser()) {
      <div class="text-center py-12">
        <p class="text-gray mb-4">Please login to view your profile</p>
        <button (click)="router.navigate(['/login'])" class="btn btn-primary">Login</button>
      </div>
    } @else {
      <div class="profile-page-container fade-in">
        <!-- Profile Header -->
        <div class="profile-header">
          <div class="cover-photo" (click)="coverInput.click()">
            @if (coverImg()) { <img [src]="coverImg()" alt="Cover" /> }
            <div class="cover-overlay"><i class="fas fa-camera"></i> Change Cover</div>
            <input #coverInput type="file" hidden accept="image/*" (change)="onCoverChange($event)" />
          </div>
          <div class="profile-info-bar">
            <div class="profile-avatar" (click)="avatarInput.click()">
              <img [src]="profileImg()" alt="Profile" />
              <div class="avatar-overlay"><i class="fas fa-camera"></i></div>
              <input #avatarInput type="file" hidden accept="image/*" (change)="onAvatarChange($event)" />
            </div>
            <div class="profile-details">
              <h1>{{ app.currentUser()!.name }}</h1>
              <span>{{ app.currentUser()!.email }}</span>
              <span [class]="'role-badge ' + (app.currentUser()!.isAdmin ? 'admin' : 'user')">
                {{ app.currentUser()!.isAdmin ? 'Administrator' : 'Verified Customer' }}
              </span>
            </div>
            <div class="profile-actions">
              <button class="btn-edit-profile" (click)="activeTab = 'settings'">
                <i class="fas fa-pen mr-2"></i> Edit Profile
              </button>
              <button class="btn-settings" (click)="activeTab = 'settings'" title="Account Settings">
                <i class="fas fa-cog"></i>
              </button>
            </div>
          </div>
        </div>

        <div class="profile-content-grid">
          <!-- Sidebar -->
          <div class="profile-sidebar">
            <button class="sidebar-link" [class.active]="activeTab==='overview'" (click)="activeTab='overview'">
              <i class="fas fa-home"></i> Overview
            </button>
            <button class="sidebar-link" [class.active]="activeTab==='orders'" (click)="activeTab='orders'">
              <i class="fas fa-list-alt"></i> {{ app.currentUser()!.isAdmin ? 'Recent Activity' : 'My Orders' }}
            </button>
            <button class="sidebar-link" [class.active]="activeTab==='settings'" (click)="activeTab='settings'">
              <i class="fas fa-user-cog"></i> Account Settings
            </button>
            <button class="sidebar-link logout" (click)="app.logout()">
              <i class="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>

          <!-- Main Content -->
          <div class="profile-main">
            <!-- Overview Tab -->
            @if (activeTab === 'overview') {
              <div class="slide-up">
                <h2 class="section-title-sm mb-6">Dashboard Overview</h2>
                <div class="stats-grid">
                  @for (stat of stats(); track stat.label) {
                    <div class="stat-card">
                      <div class="stat-icon" [class]="stat.color"><i [class]="'fas ' + stat.icon"></i></div>
                      <div class="stat-info">
                        <span class="stat-value">{{ stat.value }}</span>
                        <span class="stat-label">{{ stat.label }}</span>
                      </div>
                    </div>
                  }
                </div>
                <div class="recent-section mt-8">
                  <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:1rem">
                    {{ app.currentUser()!.isAdmin ? 'System Notifications' : 'Your Notifications' }}
                  </h3>
                  <div class="card-simple p-6">
                    @if (app.currentUser()!.isAdmin) {
                      <ul class="activity-list">
                        <li><i class="fas fa-check-circle text-green mr-2"></i> System update completed.</li>
                        <li><i class="fas fa-user-plus text-blue mr-2"></i> New user registration: Sarah Connor.</li>
                        <li><i class="fas fa-exclamation-triangle text-yellow mr-2"></i> Server load warning (resolved).</li>
                      </ul>
                    } @else {
                      @if (app.notifications() && app.notifications().length > 0) {
                        <ul class="activity-list" style="list-style:none; padding:0; margin:0">
                          @for (notif of app.notifications(); track notif.id) {
                            <li style="margin-bottom:1rem; padding-bottom:1rem; border-bottom:1px solid #1f293715">
                              <i class="fas fa-bell text-blue-500 mr-2" style="font-size:1.1rem; color:#3b82f6"></i> 
                              <span style="font-weight:500">{{ notif.message }}</span>
                              <div style="margin-left:1.75rem; margin-top:0.2rem">
                                <small class="text-gray">{{ notif.created_at | date:'medium' }}</small>
                              </div>
                            </li>
                          }
                        </ul>
                      } @else {
                        <p class="text-gray" style="text-align:center; padding: 2rem 0;">You have no new notifications.</p>
                      }
                    }
                  </div>
                </div>
              </div>
            }

            <!-- Orders Tab -->
            @if (activeTab === 'orders') {
              <div class="slide-up">
                <h2 class="section-title-sm mb-6">{{ app.currentUser()!.isAdmin ? 'Recent Activity' : 'Order History' }}</h2>
                <div class="card-simple">
                  @if (myOrders().length === 0 && !app.currentUser()!.isAdmin) {
                    <div class="text-center p-8 text-gray">No orders found. Start shopping!</div>
                  } @else {
                    <table class="modern-table">
                      <thead><tr><th>ID</th><th>Date</th><th>Status</th><th>Total</th></tr></thead>
                      <tbody>
                        @if (app.currentUser()!.isAdmin) {
                          <tr><td>#LOG-001</td><td>2 mins ago</td><td><span class="badge badge-green">Success</span></td><td>-</td></tr>
                          <tr><td>#LOG-002</td><td>1 hour ago</td><td><span class="badge badge-blue">Info</span></td><td>-</td></tr>
                        } @else {
                          @for (order of myOrders(); track order.id) {
                            <tr>
                              <td>#{{ order.id }}</td>
                              <td>{{ order.date | date:'shortDate' }}</td>
                              <td>
                                <span [class]="'badge badge-' + (order.status === 'Delivered' ? 'green' : 'yellow')">
                                  {{ order.status }}
                                </span>
                              </td>
                              <td>₹{{ (order.total || 0).toFixed(2) }}</td>
                            </tr>
                          }
                        }
                      </tbody>
                    </table>
                  }
                </div>
              </div>
            }

            <!-- Settings Tab -->
            @if (activeTab === 'settings') {
              <div class="slide-up">
                <h2 class="section-title-sm mb-6">Account Settings</h2>
                <div class="settings-container">
                  <!-- Personal Info -->
                  <div class="settings-section-card">
                    <div class="settings-header"><i class="fas fa-user"></i><h3>Personal Information</h3></div>
                    <div class="settings-form">
                      <div class="grid grid-cols-1 md-grid-cols-2" style="gap:1.5rem">
                        <div class="form-group">
                          <label class="form-label">Full Name</label>
                          <input type="text" [(ngModel)]="profileName" class="form-control" name="profileName" />
                        </div>
                        <div class="form-group">
                          <label class="form-label">Email Address</label>
                          <input type="email" [value]="app.currentUser()!.email" class="form-control" readonly />
                        </div>
                        <div class="form-group">
                          <label class="form-label">Phone Number</label>
                          <input type="text" [(ngModel)]="profilePhone" placeholder="+1 (555) 123-4567" class="form-control" name="profilePhone" />
                        </div>
                        <div class="form-group">
                          <label class="form-label">Location</label>
                          <input type="text" [(ngModel)]="profileLocation" placeholder="New York, USA" class="form-control" name="profileLocation" />
                        </div>
                      </div>
                      <div style="margin-top:2rem;display:flex;justify-content:flex-end">
                        <button class="btn btn-primary" (click)="saveProfile()" [disabled]="isSaving()">
                          {{ isSaving() ? 'Updating...' : 'Update Profile' }}
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Security -->
                  <div class="settings-section-card">
                    <div class="settings-header"><i class="fas fa-shield-alt"></i><h3>Security &amp; Password</h3></div>
                    <div class="settings-form">
                      <div class="grid grid-cols-1 md-grid-cols-2" style="gap:1.5rem">
                        <div class="form-group">
                          <label class="form-label">Current Password</label>
                          <input type="password" placeholder="••••••••" class="form-control" />
                        </div>
                        <div class="form-group">
                          <label class="form-label">New Password</label>
                          <input type="password" placeholder="••••••••" class="form-control" />
                        </div>
                      </div>
                      <div style="margin-top:2rem;display:flex;justify-content:flex-end">
                        <button class="btn btn-secondary" (click)="app.showToast('Password changed successfully', 'success')">
                          Change Password
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Notifications -->
                  <div class="settings-section-card">
                    <div class="settings-header"><i class="fas fa-bell"></i><h3>Notification Preferences</h3></div>
                    @for (pref of notifPrefs; track pref.title) {
                      <div class="settings-row">
                        <div class="settings-info">
                          <h4>{{ pref.title }}</h4>
                          <p>{{ pref.desc }}</p>
                        </div>
                        <label class="switch">
                          <input type="checkbox" [checked]="pref.checked" />
                          <span class="slider"></span>
                        </label>
                      </div>
                    }
                  </div>

                  <!-- Danger Zone -->
                  <div class="settings-section-card danger-zone">
                    <div class="settings-header"><i class="fas fa-exclamation-triangle"></i><h3>Danger Zone</h3></div>
                    <div class="settings-row">
                      <div class="settings-info">
                        <h4>Delete Account</h4>
                        <p>Permanently delete your account and all associated data. This action cannot be undone.</p>
                      </div>
                      <button class="btn-outline-danger" (click)="confirmDelete()">Delete Account</button>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `
})
export class ProfileComponent implements OnInit {
  app = inject(AppService);
  router = inject(Router);

  activeTab = 'overview';
  profileName = '';
  profilePhone = '';
  profileLocation = '';
  isSaving = signal(false);
  profileImg = signal(DEFAULT_AVATAR);
  coverImg = signal('');

  notifPrefs = [
    { title: 'Order Updates', desc: 'Receive notifications about your order status and shipping.', checked: true },
    { title: 'Promotional Emails', desc: 'Get notified about sales, new arrivals, and special offers.', checked: false },
    { title: 'Desktop Notifications', desc: 'Allow ShopHub to send alert notifications to your desktop.', checked: true },
  ];

  myOrders = computed(() => {
    const u = this.app.currentUser();
    return u ? this.app.orders().filter(o => o.userId === u.id) : [];
  });

  stats = computed(() => {
    const u = this.app.currentUser();
    if (!u) return [];
    return u.isAdmin
      ? [
        { label: 'Total Sales', value: '₹' + this.app.orders().reduce((sum, o) => sum + (o.total || 0), 0).toFixed(2), icon: 'fa-chart-line', color: 'bg-blue-100 text-blue-600' },
        { label: 'Total Products', value: this.app.products().length.toString(), icon: 'fa-box', color: 'bg-green-100 text-green-600' },
        { label: 'Total Users', value: this.app.users().length.toString(), icon: 'fa-users', color: 'bg-purple-100 text-purple-600' },
        { label: 'Pending Orders', value: this.app.orders().filter(o => o.status === 'Processing').length.toString(), icon: 'fa-clock', color: 'bg-yellow-100 text-yellow-600' },
      ]
      : [
        { label: 'Total Orders', value: this.myOrders().length, icon: 'fa-shopping-bag', color: 'bg-blue-100 text-blue-600' },
        { label: 'Wishlist', value: '5', icon: 'fa-heart', color: 'bg-red-100 text-red-600' },
        { label: 'Reviews', value: '3', icon: 'fa-star', color: 'bg-yellow-100 text-yellow-600' },
        { label: 'Points', value: '120', icon: 'fa-coins', color: 'bg-green-100 text-green-600' },
      ];
  });

  ngOnInit(): void {
    const u = this.app.currentUser();
    if (u) {
      this.profileName = u.name;
      this.profilePhone = u.phone || '';
      this.profileLocation = u.location || '';
      this.profileImg.set(u.profileImage || DEFAULT_AVATAR);
      this.coverImg.set(u.coverImage || '');
    }
  }

  onAvatarChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      this.app.showToast('Image too large. Max 2MB', 'error'); return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      this.profileImg.set(reader.result as string);
      // Auto-save the new picture to the database instantly
      await this.saveProfile();
    };
    reader.readAsDataURL(file);
  }

  onCoverChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      this.coverImg.set(reader.result as string);
      this.app.showToast('Cover photo updated!', 'success');
    };
    reader.readAsDataURL(file);
  }

  async saveProfile(): Promise<void> {
    this.isSaving.set(true);
    const success = await this.app.updateProfile(
      this.app.currentUser()!.id,
      this.profileName,
      this.profileImg(),
      this.profilePhone,
      this.profileLocation
    );
    if (!success) {
      // Revert the profile picture in the UI to the last saved one if update failed
      const u = this.app.currentUser();
      this.profileImg.set(u ? (u.profileImage || DEFAULT_AVATAR) : DEFAULT_AVATAR);
      if (u) {
        this.profileName = u.name; // also revert name
        this.profilePhone = u.phone || '';
        this.profileLocation = u.location || '';
      }
    }
    this.isSaving.set(false);
  }

  confirmDelete(): void {
    if (confirm('Delete account?')) {
      this.app.showToast('Account deletion request sent', 'warning');
    }
  }
}
