import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

import { api } from './api';
import type { Client, Order, OrderStatus, Product } from './types';

type Page = 'dashboard' | 'clients' | 'products' | 'orders';
type DraftItem = { id: number; productId: string; quantity: number };

const statuses: Record<OrderStatus, string> = {
  pending: 'У роботі',
  paid: 'Оплачено',
  shipped: 'Відправлено',
  cancelled: 'Скасовано',
};

const emptyItem = (): DraftItem => ({ id: Date.now(), productId: '', quantity: 1 });

export function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterClient, setFilterClient] = useState('');
  const [message, setMessage] = useState('');

  const [clientForm, setClientForm] = useState({ name: '', email: '', phone: '' });
  const [productForm, setProductForm] = useState({ name: '', price: '', description: '' });
  const [orderClientId, setOrderClientId] = useState('');
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);

  async function load() {
    const [clientList, productList, orderList] = await Promise.all([
      api.clients(),
      api.products(),
      api.orders(),
    ]);
    setClients(clientList);
    setProducts(productList);
    setOrders(orderList);
  }

  useEffect(() => {
    load().catch(notify);
  }, []);

  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      const product = products.find((p) => p.id === Number(item.productId));
      return sum + (product ? Number(product.price) * item.quantity : 0);
    }, 0);
  }, [items, products]);

  const revenue = orders.reduce((sum, order) => sum + Number(order.total_amount), 0);
  const pending = orders.filter((order) => order.status === 'pending').length;
  const shownOrders = filterClient
    ? orders.filter((order) => order.client_id === Number(filterClient))
    : orders;

  function notify(error: unknown) {
    setMessage(error instanceof Error ? error.message : 'Помилка');
    window.setTimeout(() => setMessage(''), 3000);
  }

  async function submitClient(event: FormEvent) {
    event.preventDefault();
    try {
      await api.createClient({ ...clientForm, phone: clientForm.phone || null });
      setClientForm({ name: '', email: '', phone: '' });
      await load();
    } catch (error) {
      notify(error);
    }
  }

  async function submitProduct(event: FormEvent) {
    event.preventDefault();
    try {
      await api.createProduct({
        name: productForm.name,
        price: Number(productForm.price),
        description: productForm.description || null,
      });
      setProductForm({ name: '', price: '', description: '' });
      await load();
    } catch (error) {
      notify(error);
    }
  }

  async function submitOrder(event: FormEvent) {
    event.preventDefault();
    const orderItems = items
      .filter((item) => item.productId)
      .map((item) => ({ product_id: Number(item.productId), quantity: item.quantity }));

    if (!orderClientId || !orderItems.length) {
      notify(new Error('Оберіть клієнта і товар'));
      return;
    }

    try {
      await api.createOrder({ client_id: Number(orderClientId), items: orderItems });
      setOrderClientId('');
      setItems([emptyItem()]);
      await load();
    } catch (error) {
      notify(error);
    }
  }

  async function changeStatus(orderId: number, status: OrderStatus) {
    try {
      await api.updateOrderStatus(orderId, status);
      await load();
    } catch (error) {
      notify(error);
    }
  }

  function updateItem(id: number, patch: Partial<DraftItem>) {
    setItems((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  return (
    <>
      <header className="topbar">
        <div>
          <div className="brand">Order Desk</div>
          <h1>Облік замовлень</h1>
        </div>
      </header>

      <div className="shell">
        <aside>
          <Nav active={page === 'dashboard'} onClick={() => setPage('dashboard')}>Огляд</Nav>
          <Nav active={page === 'clients'} onClick={() => setPage('clients')}>Клієнти</Nav>
          <Nav active={page === 'products'} onClick={() => setPage('products')}>Товари</Nav>
          <Nav active={page === 'orders'} onClick={() => setPage('orders')}>Замовлення</Nav>
        </aside>

        <main>
          {page === 'dashboard' && (
            <>
              <Title>Огляд</Title>
              <div className="stats">
                <Stat label="Клієнти" value={clients.length} />
                <Stat label="Товари" value={products.length} />
                <Stat label="Замовлення" value={orders.length} />
                <Stat label="Сума" value={`${money(revenue)} UAH`} />
              </div>
              <Panel title="Останні замовлення" aside={`${pending} у роботі`}>
                <Orders orders={orders.slice(0, 8)} onStatusChange={changeStatus} compact />
              </Panel>
            </>
          )}

          {page === 'clients' && (
            <>
              <Title>Клієнти</Title>
              <Panel title="Новий клієнт">
                <form className="form-grid" onSubmit={submitClient}>
                  <label>Ім'я<input value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} /></label>
                  <label>Email<input value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} /></label>
                  <label className="wide">Телефон<input value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} /></label>
                  <button className="primary">Додати</button>
                </form>
              </Panel>
              <Panel title="Список клієнтів"><Clients clients={clients} /></Panel>
            </>
          )}

          {page === 'products' && (
            <>
              <Title>Товари</Title>
              <Panel title="Новий товар">
                <form className="form-grid" onSubmit={submitProduct}>
                  <label>Назва<input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} /></label>
                  <label>Ціна<input type="number" min="0.01" step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} /></label>
                  <label className="wide">Опис<input value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} /></label>
                  <button className="primary">Додати</button>
                </form>
              </Panel>
              <Panel title="Каталог"><Products products={products} /></Panel>
            </>
          )}

          {page === 'orders' && (
            <>
              <Title>Замовлення</Title>
              <Panel title="Нове замовлення">
                <form onSubmit={submitOrder}>
                  <label className="field">Клієнт
                    <select value={orderClientId} onChange={(e) => setOrderClientId(e.target.value)}>
                      <option value="">Оберіть клієнта</option>
                      {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                    </select>
                  </label>

                  <div className="items">
                    {items.map((item) => (
                      <div className="item-row" key={item.id}>
                        <select value={item.productId} onChange={(e) => updateItem(item.id, { productId: e.target.value })}>
                          <option value="">Оберіть товар</option>
                          {products.map((product) => <option key={product.id} value={product.id}>{product.name} - {money(product.price)} UAH</option>)}
                        </select>
                        <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })} />
                        <button type="button" className="icon-btn" onClick={() => setItems((list) => list.filter((x) => x.id !== item.id))}>x</button>
                      </div>
                    ))}
                  </div>

                  <div className="actions">
                    <button type="button" className="secondary" onClick={() => setItems((list) => [...list, emptyItem()])}>Додати товар</button>
                    <strong>Разом: {money(total)} UAH</strong>
                    <button className="primary">Оформити</button>
                  </div>
                </form>
              </Panel>

              <Panel
                title="Усі замовлення"
                aside={(
                  <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
                    <option value="">Усі клієнти</option>
                    {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                  </select>
                )}
              >
                <Orders orders={shownOrders} onStatusChange={changeStatus} />
              </Panel>
            </>
          )}
        </main>
      </div>

      {message && <div className="toast">{message}</div>}
    </>
  );
}

function Nav({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return <button className={active ? 'active' : ''} onClick={onClick}>{children}</button>;
}

function Title({ children }: { children: ReactNode }) {
  return <div className="title"><h2>{children}</h2></div>;
}

function Panel({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return <section className="panel"><div className="panel-head"><h3>{title}</h3>{aside}</div>{children}</section>;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="stat"><span>{value}</span><small>{label}</small></div>;
}

function Clients({ clients }: { clients: Client[] }) {
  return clients.length ? (
    <Table headers={['#', "Ім'я", 'Email', 'Телефон', 'Створено']} rows={clients.map((c) => [c.id, c.name, c.email, c.phone || '-', date(c.created_at)])} />
  ) : <Empty text="Клієнтів поки немає" />;
}

function Products({ products }: { products: Product[] }) {
  return products.length ? (
    <Table headers={['#', 'Назва', 'Опис', 'Ціна', 'Створено']} rows={products.map((p) => [p.id, p.name, p.description || '-', `${money(p.price)} UAH`, date(p.created_at)])} />
  ) : <Empty text="Товарів поки немає" />;
}

function Orders({ orders, onStatusChange, compact = false }: { orders: Order[]; onStatusChange: (id: number, status: OrderStatus) => void; compact?: boolean }) {
  if (!orders.length) return <Empty text="Замовлень поки немає" />;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>#</th><th>Клієнт</th><th>Позиції</th><th>Сума</th><th>Статус</th>{!compact && <th>Створено</th>}</tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td><span className="badge">{order.id}</span></td>
              <td>{order.client.name}</td>
              <td>{order.items.map((item) => <span className="chip" key={item.id}>{item.product.name} x{item.quantity}</span>)}</td>
              <td><strong>{money(order.total_amount)} UAH</strong></td>
              <td>
                <select value={order.status} onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)}>
                  {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </td>
              {!compact && <td>{date(order.created_at)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: Array<Array<string | number>> }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => <td key={cellIndex}>{cellIndex ? cell : <span className="badge">{cell}</span>}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}

function money(value: string | number) {
  return Number(value).toFixed(2);
}

function date(value: string) {
  return new Date(value).toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
