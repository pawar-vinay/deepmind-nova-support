import { Customer, Product, Order, AnalyticsMetrics, IntegrationStatus } from '../types';

// --- Product Generation ---
export const CATEGORIES = ['T-Shirt', 'Jeans', 'Jacket', 'Sneakers', 'Hat', 'Dress', 'Hoodie'];
const ADJECTIVES = ['Vintage', 'Modern', 'Classic', 'Urban', 'Cozy', 'Premium', 'Essential'];
const COLORS = ['Red', 'Blue', 'Black', 'White', 'Green', 'Navy', 'Grey'];

const generateProducts = (): Product[] => {
  return Array.from({ length: 100 }, (_, i) => {
    const category = CATEGORIES[i % CATEGORIES.length];
    const adj = ADJECTIVES[i % ADJECTIVES.length];
    const color = COLORS[i % COLORS.length];
    
    return {
      id: `P${1000 + i}`,
      name: `${adj} ${color} ${category}`,
      category: category,
      price: Math.floor(Math.random() * 150) + 20, // Price between 20 and 170
      inStock: Math.random() > 0.1, // 90% in stock
      image: `https://placehold.co/300x300/e2e8f0/1e293b?text=${encodeURIComponent(category)}`,
      rating: parseFloat((3 + Math.random() * 2).toFixed(1)), // Rating between 3.0 and 5.0
      reviewCount: Math.floor(Math.random() * 500) + 10 // Reviews between 10 and 510
    };
  });
};

export const PRODUCTS: Product[] = generateProducts();

// --- Customer & Order Generation ---

// Helper to get random products
const getRandomProducts = (count: number) => {
  const shuffled = [...PRODUCTS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map(p => ({
    productId: p.id,
    quantity: Math.floor(Math.random() * 2) + 1
  }));
};

const calcTotal = (items: {productId: string, quantity: number}[]) => {
  return items.reduce((acc, item) => {
    const product = PRODUCTS.find(p => p.id === item.productId);
    return acc + (product ? product.price * item.quantity : 0);
  }, 0);
};

export const CUSTOMERS: Customer[] = [
  {
    id: 'ADMIN',
    name: 'System Admin',
    email: 'admin@technova.com',
    role: 'admin',
    orders: []
  },
  {
    id: 'C1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'customer',
    orders: [
      {
        id: 'ORD-7782',
        date: '2023-10-15',
        status: 'Delivered',
        items: getRandomProducts(2),
        total: 0 // Calculated below
      },
      {
        id: 'ORD-9921',
        date: '2023-11-02',
        status: 'Processing',
        items: getRandomProducts(1),
        total: 0
      }
    ]
  },
  {
    id: 'C2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    role: 'customer',
    orders: [] // New customer
  },
  {
    id: 'C3',
    name: 'Charlie Davis',
    email: 'charlie@example.com',
    role: 'customer',
    orders: [
      {
        id: 'ORD-1102',
        date: '2023-09-10',
        status: 'Returned',
        items: getRandomProducts(3),
        total: 0
      },
      {
        id: 'ORD-2231',
        date: '2023-10-01',
        status: 'Delivered',
        items: getRandomProducts(1),
        total: 0
      },
       {
        id: 'ORD-3341',
        date: '2023-11-05',
        status: 'Shipped',
        items: getRandomProducts(2),
        total: 0
      }
    ]
  }
];

// Calculate totals for orders
CUSTOMERS.forEach(c => {
  c.orders.forEach(o => {
    o.total = calcTotal(o.items);
  });
});

// --- API Helper Functions for Tools ---

export const searchProducts = (query?: string, category?: string): Product[] => {
  let results = PRODUCTS;
  if (category) {
    // Handle generic "apparel" or "clothing" requests by ignoring category filter
    // or mapping it. For now, if it's generic, we just show everything matching the query (if any) or top items.
    const lowerCat = category.toLowerCase();
    if (lowerCat !== 'apparel' && lowerCat !== 'clothing' && lowerCat !== 'apparels') {
       results = results.filter(p => p.category.toLowerCase().includes(lowerCat));
    }
  }
  if (query) {
    const lowerQuery = query.toLowerCase();
    results = results.filter(p => p.name.toLowerCase().includes(lowerQuery));
  }
  return results.slice(0, 5); // Limit to 5 for AI context
};

export const getCustomerOrders = (customerId: string): Order[] => {
  const customer = CUSTOMERS.find(c => c.id === customerId);
  return customer ? customer.orders : [];
};

// --- Mock Analytics Data ---

export const MOCK_ADMIN_METRICS: AnalyticsMetrics = {
  totalChats: 1250,
  validChats: 1100,
  invalidChats: 150,
  avgEngagementScore: 85,
  csatScore: 4.7
};

export const MOCK_CUSTOMER_METRICS: AnalyticsMetrics = {
  totalChats: 12,
  validChats: 12,
  invalidChats: 0,
  avgEngagementScore: 92,
  csatScore: 5.0
};

export const MOCK_INTEGRATIONS: IntegrationStatus[] = [
  { id: 'erp', name: 'SAP ERP Cloud', status: 'connected', lastSync: new Date() },
  { id: 'crm', name: 'Salesforce CRM', status: 'connected', lastSync: new Date(Date.now() - 1000 * 60 * 5) },
  { id: 'payment', name: 'Stripe Gateway', status: 'connected', lastSync: new Date() },
  { id: 'inventory', name: 'Oracle NetSuite', status: 'latency', lastSync: new Date(Date.now() - 1000 * 60 * 60) },
];