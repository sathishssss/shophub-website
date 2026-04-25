import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AppService } from '../../services/app.service';
import { ProductCardComponent } from '../product-card/product-card.component';
import { getImageUrl } from '../../services/app.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ProductCardComponent],
  template: `
    <!-- Hero Slider -->
    <div class="modern-hero-slider">
      @for (slide of app.slides(); track slide.id; let i = $index) {
        <div class="hero-slide" [class.active]="i === activeHero()"
             [style.backgroundImage]="'url(' + getImageUrl(slide.image) + ')'"
             [style.display]="i === activeHero() ? 'block' : 'none'">
          <div class="hero-overlay">
            <div class="hero-content">
              <h1 class="hero-title">{{ slide.title }}</h1>
              <p class="hero-subtitle">{{ slide.subtitle }}</p>
              <button (click)="router.navigate(['/products'])" class="cta-button">
                Shop Now <i class="fas fa-arrow-right ml-2"></i>
              </button>
            </div>
          </div>
        </div>
      }
      @if (app.slides().length === 0) {
        <div class="hero-slide active" style="background-image: url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop')">
          <div class="hero-overlay">
            <div class="hero-content">
              <h1 class="hero-title">Welcome to ShopHub</h1>
              <p class="hero-subtitle">Discover our exclusive collection</p>
              <button (click)="router.navigate(['/products'])" class="cta-button">
                Shop Now <i class="fas fa-arrow-right ml-2"></i>
              </button>
            </div>
          </div>
        </div>
      }
      <div class="hero-dots">
        @for (slide of app.slides(); track slide.id; let i = $index) {
          <span class="dot" [class.active]="i === activeHero()" (click)="activeHero.set(i)"></span>
        }
      </div>
    </div>

    <!-- Categories -->
    <div class="section-container">
      <h2 class="section-title">Shop by Category</h2>
      <div class="categories-grid" style="grid-template-columns:repeat(3,1fr);gap:1.5rem">
        @for (cat of categories; track cat.name) {
          <div class="category-card-modern" (click)="router.navigate(['/products'])">
            <div class="cat-image-wrapper">
              <img [src]="cat.img" [alt]="cat.name" />
            </div>
            <div class="cat-info">
              <h3>{{ cat.name }}</h3>
              <span style="font-size:0.78rem;color:#9ca3af;display:block;margin-bottom:4px">{{ cat.tag }}</span>
              <span>Shop Now <i class="fas fa-arrow-right"></i></span>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- Promo Banner -->
    <div class="promo-banner-modern">
      <div class="promo-content">
        <span class="promo-tag">Limited Time Offer</span>
        <h2>Flash Sale: 40% Off</h2>
        <p>Get premium items at unbeatable prices. Offer ends soon!</p>
        <button (click)="router.navigate(['/products'])" class="promo-btn">Grab Deal</button>
      </div>
      <div class="promo-image">
        <img src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1000&auto=format&fit=crop" alt="Sale" />
      </div>
    </div>

    <!-- Featured Products -->
    <div class="section-container">
      <div class="flex justify-between items-end mb-8">
        <div>
          <h2 class="section-title" style="margin-bottom:0.5rem">Trending Now</h2>
          <p class="text-gray">Top picks for you this week</p>
        </div>
        <button (click)="router.navigate(['/products'])" class="view-all-btn">
          View All <i class="fas fa-long-arrow-alt-right ml-2"></i>
        </button>
      </div>
      <div class="grid grid-cols-1 md-grid-cols-2 lg-grid-cols-4 gap-6">
        @for (p of featuredProducts(); track p.id) {
          <app-product-card [product]="p"></app-product-card>
        }
      </div>
    </div>

    <!-- Features -->
    <div class="features-section">
      @for (f of features; track f.title) {
        <div class="feature-item">
          <div class="feature-icon"><i [class]="f.icon"></i></div>
          <h3>{{ f.title }}</h3>
          <p>{{ f.desc }}</p>
        </div>
      }
    </div>

    <!-- Newsletter -->
    <div class="newsletter-section">
      <div class="newsletter-content">
        <h2>Subscribe &amp; Get 10% Off</h2>
        <p>Join our email list for exclusive offers and the latest news.</p>
        <div class="newsletter-form">
          <input type="email" #subEmail placeholder="Enter your email address" (keyup.enter)="subscribe(subEmail)" />
          <button (click)="subscribe(subEmail)">Subscribe</button>
        </div>
      </div>
    </div>
  `
})
export class HomeComponent implements OnInit, OnDestroy {
  app = inject(AppService);
  router = inject(Router);

  activeHero = signal(0);
  getImageUrl = getImageUrl;
  private timer?: ReturnType<typeof setInterval>;

  featuredProducts = () => this.app.products().slice(0, 4);

  categories = [
    { name: "Men's Clothing", img: 'https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?q=80&w=600&auto=format&fit=crop', tag: 'Shirts, Jeans, Hoodies & More' },
    { name: "Women's Clothing", img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop', tag: 'Dresses, Tops, Skirts & More' },
    { name: "Kids' Clothing", img: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=600&auto=format&fit=crop', tag: 'Comfortable & Playful Styles' },
  ];

  features = [
    { icon: 'fas fa-shipping-fast', title: 'Free Shipping', desc: 'On all orders over $50' },
    { icon: 'fas fa-undo', title: 'Easy Returns', desc: '30-day money back guarantee' },
    { icon: 'fas fa-headset', title: '24/7 Support', desc: 'We are here to help' },
    { icon: 'fas fa-shield-alt', title: 'Secure Payment', desc: '100% focused on security' },
  ];

  ngOnInit(): void {
    this.timer = setInterval(() => {
      const slideCount = this.app.slides().length || 1;
      this.activeHero.update(v => (v + 1) % slideCount);
    }, 5000);
  }

  subscribe(input: HTMLInputElement): void {
    const email = input.value.trim();
    if (!email || !email.includes('@')) {
      this.app.showToast('Please enter a valid email address', 'warning');
      return;
    }
    this.app.subscribe(email);
    input.value = '';
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}
