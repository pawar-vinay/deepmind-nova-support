import { IntegrationStatus, AnalyticsMetrics, EscalationTicket } from '../types';
import { MOCK_INTEGRATIONS, MOCK_ADMIN_METRICS } from '../data/mockData';

// Simulate latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getSystemIntegrations = async (): Promise<IntegrationStatus[]> => {
  await delay(800); // Simulate API call
  // Randomly flicker status for realism
  return MOCK_INTEGRATIONS.map(i => ({
    ...i,
    status: Math.random() > 0.9 ? 'latency' : 'connected'
  }));
};

export const getAnalyticsReport = async (userId: string, role: 'admin' | 'customer'): Promise<AnalyticsMetrics> => {
  await delay(600);
  // In a real app, we would fetch specific user stats
  if (role === 'admin') {
      return MOCK_ADMIN_METRICS;
  }
  // Return a slightly randomized version for the customer view
  return {
      totalChats: Math.floor(Math.random() * 20) + 1,
      validChats: Math.floor(Math.random() * 20) + 1,
      invalidChats: 0,
      avgEngagementScore: 90,
      csatScore: 5.0
  };
};

export const submitSurvey = async (userId: string, rating: number, feedback: string) => {
    console.log(`[Integration Layer] Survey received from ${userId}: ${rating}/5 - ${feedback}`);
    await delay(500);
    return true;
};

export const createEscalationTicket = async (userId: string, reason: string): Promise<string> => {
    await delay(1000); // Simulate CRM connection
    const ticketId = `TKT-${Math.floor(Math.random() * 90000) + 10000}`;
    console.log(`[Integration Layer] Escalation Ticket created for ${userId}. Reason: ${reason}. ID: ${ticketId}`);
    return ticketId;
};