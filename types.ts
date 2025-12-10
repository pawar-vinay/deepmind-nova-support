export enum Sender {
  User = 'user',
  Bot = 'bot',
  System = 'system'
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: Date;
  isStreaming?: boolean;
  options?: string[]; // For proactive support chips
}

export enum ConnectionStatus {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Error = 'error'
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  inStock: boolean;
  rating: number;
  reviewCount: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface Order {
  id: string;
  date: string;
  status: 'Delivered' | 'Processing' | 'Shipped' | 'Returned';
  items: OrderItem[];
  total: number;
}

export type UserRole = 'customer' | 'admin';

export interface Customer {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  orders: Order[];
}

export type Language = 'en' | 'fr';

// Analytics & Integrations
export interface AnalyticsMetrics {
  totalChats: number;
  validChats: number;
  invalidChats: number;
  avgEngagementScore: number; // 0-100
  csatScore: number; // 0-5
}

export interface IntegrationStatus {
  id: string;
  name: string; // e.g., 'SAP ERP', 'Salesforce CRM'
  status: 'connected' | 'disconnected' | 'latency';
  lastSync: Date;
}

export interface SurveyResponse {
  rating: number;
  feedback: string;
}

export interface EscalationTicket {
  ticketId: string;
  userId: string;
  reason: string;
  status: 'Open';
  createdAt: Date;
}