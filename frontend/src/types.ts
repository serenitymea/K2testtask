export type Client = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
};

export type Product = {
  id: number;
  name: string;
  description: string | null;
  price: string;
  created_at: string;
};

export type OrderItem = {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: string;
  product: Product;
};

export type Order = {
  id: number;
  client_id: number;
  total_amount: string;
  status: OrderStatus;
  created_at: string;
  client: Client;
  items: OrderItem[];
};

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'cancelled';
