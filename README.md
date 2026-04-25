[README.md](https://github.com/user-attachments/files/27079383/README.md)
# shophub-website
ShopHub is a full-stack e-commerce web application built using Angular and Node.js. It provides a complete online shopping experience with product browsing, filtering, cart management, and checkout functionality.
# 🛍️ ShopHub — Angular 20 E-Commerce App

> Converted from React (CDN) to a full Angular 20 standalone component architecture.

---

## 📁 Project Structure

```
angular-shophub/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── navbar/           → Sticky navbar with cart badge & auth
│   │   │   ├── footer/           → Footer with newsletter & links
│   │   │   ├── scroll-to-top/    → Floating scroll button
│   │   │   ├── toast/            → Global toast notifications
│   │   │   ├── home/             → Hero slider, categories, promo, features
│   │   │   ├── products/         → Product grid with filter/sort/search
│   │   │   ├── product-card/     → Reusable product card
│   │   │   ├── product-detail/   → Full product page + reviews
│   │   │   ├── review-section/   → Customer reviews with ratings
│   │   │   ├── cart/             → Cart page with quantity controls
│   │   │   ├── checkout/         → Checkout with credit card & UPI
│   │   │   ├── login/            → Login / Register page
│   │   │   ├── profile/          → User profile with tabs
│   │   │   ├── orders/           → Order history
│   │   │   ├── admin/            → Admin dashboard (products/orders/users)
│   │   │   └── contact/          → Contact form + map
│   │   ├── models/
│   │   │   └── models.ts         → TypeScript interfaces
│   │   ├── services/
│   │   │   └── app.service.ts    → Global state (signals) + API calls
│   │   ├── app.component.ts      → Root component
│   │   ├── app.config.ts         → Angular providers
│   │   └── app.routes.ts         → Route definitions
│   ├── index.html
│   ├── main.ts
│   └── styles.scss               → Global CSS (2800+ lines)
├── server/                       → Express Backend
│   ├── config/                   → DB initialization & connection
│   ├── server.js                 → Main Express entry point
│   └── .env                      → Database credentials
├── package.json
├── angular.json
└── tsconfig.json
```

---

## ⚙️ Setup Instructions

### 1. Install Frontend Dependencies
```bash
cd angular-shophub
npm install
```

### 2. Setup & Start the Backend
```bash
cd server
npm install
npm start
# Runs on http://localhost:5000 (Connected to TiDB Cloud)
```

### 3. Run the Angular App
```bash
# In the root project folder
npm start
# Opens at http://localhost:4200
```

### 4. Build for Production
```bash
npm run build
# Output in dist/angular-shophub/
```

---

## 🔄 React → Angular 20 Conversion Map

| React Pattern | Angular 20 Equivalent |
|---|---|
| `useState(val)` | `signal(val)` |
| `useEffect(() => {}, [])` | `ngOnInit()` |
| `useEffect(() => {}, [dep])` | `effect(() => { ... })` |
| `useMemo(() => ...)` | `computed(() => ...)` |
| `useContext(AppContext)` | `inject(AppService)` |
| `createContext()` | `@Injectable({ providedIn: 'root' })` |
| React Router `<Route>` | `app.routes.ts` + `RouterOutlet` |
| JSX `{list.map(...)}` | `@for (item of list; track item.id) { }` |
| JSX `{condition && <X/>}` | `@if (condition) { }` |
| `fetch()` in component | `HttpClient` via `AppService` |
| Props `{ product }` | `@Input() product!: Product` |
| Callback props | `@Output() event = new EventEmitter()` |
| `className=` | `class=` / `[class]=` / `[ngClass]` |
| `onChange={e => set(e.target.value)}` | `[(ngModel)]="field"` |
| `onSubmit={handleSubmit}` | `(ngSubmit)="handleSubmit()"` |
| `onClick={fn}` | `(click)="fn()"` |

---

## 🔑 Key Angular 20 Features Used

- **Standalone Components** — No NgModules needed
- **Signals** — Reactive state with `signal()`, `computed()`, `effect()`
- **New Control Flow** — `@for`, `@if`, `@switch`
- **Inject Function** — Modern dependency injection
- **HttpClient** — Typed API interaction
- **FormsModule** — Two-way data binding

---

## 🧪 Test Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@shop.com | admin123 |
| User  | user@shop.com  | user123  |

---

## 🌐 API Endpoints

Base URL: `http://localhost:5000/api`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/products` | Fetch all products |
| POST | `/products` | Add product (admin) |
| PUT | `/products/:id` | Update product (admin) |
| DELETE | `/products/:id` | Delete product (admin) |
| GET | `/orders` | Fetch orders |
| POST | `/orders` | Place order |
| PUT | `/orders/:id/status` | Update order status |
| GET | `/users` | Fetch users (admin) |
| POST | `/auth/login` | Login |
| POST | `/auth/register` | Register |
| PUT | `/auth/profile/:id` | Update profile |
| GET | `/products/:id/reviews` | Get product reviews |
| POST | `/reviews` | Submit review |

---

## 📬 Contact & Support

Email: sathishkumar822022@gmail.com
License: MIT
