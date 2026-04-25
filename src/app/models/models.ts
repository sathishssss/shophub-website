export interface Product {
  id: number;
  title: string;
  price: number;
  category: string;
  description: string;
  image: string;
  stock_quantity?: number;
  rating?: { rate: number; count: number };
  isLocal?: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  isAdmin: boolean;
  profileImage?: string;
  coverImage?: string;
  phone?: string;
  location?: string;
  token?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface ShippingAddress {
  name: string;
  email?: string;
  address: string;
  city: string;
  zipCode: string;
  phone?: string;
}

export interface Order {
  id: number;
  userId: number;
  items: CartItem[];
  total: number;
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  transactionId?: string | null;
  date: string;
  status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
}

export interface Review {
  id: number;
  productId: number;
  user_id: number;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface Slide {
  id: number;
  title: string;
  subtitle?: string;
  image: string;
  created_at?: string;
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
}

export type PageName =
  | 'home' | 'products' | 'product-detail' | 'cart'
  | 'checkout' | 'login' | 'admin' | 'orders'
  | 'Contact-us' | 'profile';
