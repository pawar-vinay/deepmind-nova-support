import React, { useEffect, useState } from 'react';
import { Customer, Language, AnalyticsMetrics, IntegrationStatus } from '../types';
import { getAnalyticsReport, getSystemIntegrations } from '../services/integrationService';
import { translations } from '../utils/translations';

interface AnalyticsDashboardProps {
  currentUser: Customer;
  language: Language;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ currentUser, language }) => {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const t = translations[language].reports;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [m, i] = await Promise.all([
          getAnalyticsReport(currentUser.id, currentUser.role),
          getSystemIntegrations()
        ]);
        setMetrics(m);
        setIntegrations(i);
      } catch (error) {
        console.error("Failed to fetch analytics", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6 rounded-2xl border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {currentUser.role === 'admin' ? t.dashboardTitle : t.personalTitle}
      </h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard 
          title={t.totalChats} 
          value={metrics.totalChats} 
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />}
          color="blue"
        />
        <KpiCard 
          title={t.validChats} 
          value={metrics.validChats} 
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
          color="green"
        />
        {currentUser.role === 'admin' && (
          <KpiCard 
            title={t.invalidChats} 
            value={metrics.invalidChats} 
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
            color="red"
          />
        )}
        <KpiCard 
          title={t.engagement} 
          value={`${metrics.avgEngagementScore}%`} 
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Engagement Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 text-gray-700">Performance Overview</h3>
          <div className="h-64 flex items-end justify-between space-x-2 px-2">
            {[65, 78, 85, 92, 88, 76, 95].map((val, idx) => (
               <div key={idx} className="w-full bg-blue-100 rounded-t-md relative group hover:bg-blue-200 transition-colors" style={{ height: `${val}%` }}>
                 <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                   {val}%
                 </div>
               </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-xs text-gray-400">
             <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </div>

        {/* Integration Status (Visible for everyone to show connectivity, but strictly Admin's domain) */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 text-gray-700">{t.integrations}</h3>
          <div className="space-y-4">
            {integrations.map((integration) => (
              <div key={integration.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    integration.status === 'connected' ? 'bg-green-100 text-green-600' : 
                    integration.status === 'latency' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'
                  }`}>
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                     </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{integration.name}</h4>
                    <p className="text-xs text-gray-500">Last sync: {integration.lastSync.toLocaleTimeString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                     integration.status === 'connected' ? 'bg-green-500' : 
                     integration.status === 'latency' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></span>
                  <span className={`text-sm font-medium ${
                     integration.status === 'connected' ? 'text-green-600' : 
                     integration.status === 'latency' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {integration.status === 'connected' ? t.connected : 
                     integration.status === 'latency' ? t.latency : t.disconnected}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const KpiCard = ({ title, value, icon, color }: any) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-lg ${(colorClasses as any)[color]}`}>
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {icon}
        </svg>
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;