import type { Client, Order, OrderStatus, Product } from './types';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const raw = await response.text();
  const data = raw ? parseJson(raw) : null;

  if (!response.ok) {
    throw new Error(data?.detail || `Request failed with status ${response.status}`);
  }

  return data as T;
}

function parseJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const api = {
  clients: () => request<Client[]>('/api/clients/'),
  products: () => request<Product[]>('/api/products/'),
  orders: () => request<Order[]>('/api/orders/'),
  createClient: (payload: { name: string; email: string; phone: string | null }) =>
    request<Client>('/api/clients/', { method: 'POST', body: JSON.stringify(payload) }),
  createProduct: (payload: { name: string; price: number; description: string | null }) =>
    request<Product>('/api/products/', { method: 'POST', body: JSON.stringify(payload) }),
  createOrder: (payload: { client_id: number; items: Array<{ product_id: number; quantity: number }> }) =>
    request<Order>('/api/orders/', { method: 'POST', body: JSON.stringify(payload) }),
  updateOrderStatus: (orderId: number, status: OrderStatus) =>
    request<Order>(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};
