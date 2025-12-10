import React, { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import LiveSupport from './components/LiveSupport';
import ProductBrowser from './components/ProductBrowser';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import CartDrawer from './components/CartDrawer';
import { CUSTOMERS } from './data/mockData';
import { Customer, Language, CartItem, Product, Order } from './types';
import { translations } from './utils/translations';

// In a real app, this would be handled more securely, but for the requirement:
const API_KEY = process.env.API_KEY || '';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'live' | 'products' | 'reports'>('chat');
  const [currentUser, setCurrentUser] = useState<Customer>(CUSTOMERS[0]); // Default to Admin for demo
  const [language, setLanguage] = useState<Language>('en');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const t = translations[language];

  const addToCart = (product: Product, quantity: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
    setIsCartOpen(true); // Auto open cart to show feedback
  };

  const updateCartItemQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleCheckout = (): string => {
    // Create new order
    const orderId = `ORD-${Math.floor(Math.random() * 10000)}`;
    const newOrder: Order = {
        id: orderId,
        date: new Date().toISOString().split('T')[0],
        status: 'Processing',
        items: cart.map(item => ({ productId: item.product.id, quantity: item.quantity })),
        total: cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
    };

    // Update customer history (in state, and conceptually in mock DB)
    const updatedUser = { ...currentUser, orders: [newOrder, ...currentUser.orders] };
    setCurrentUser(updatedUser);
    
    // Update the CUSTOMERS mock data reference to persist for this session if user switches back and forth
    const customerIndex = CUSTOMERS.findIndex(c => c.id === currentUser.id);
    if (customerIndex >= 0) {
        CUSTOMERS[customerIndex].orders = [newOrder, ...CUSTOMERS[customerIndex].orders];
    }

    setCart([]);
    return orderId;
  };

  const cartTotalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  if (!API_KEY) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="p-8 bg-white rounded-xl shadow-lg border border-red-100 max-w-md text-center">
          <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
             <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">API Key Missing</h2>
          <p className="text-gray-600">Please provide a valid Gemini API Key in the environment variables to use Nova Support.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white relative overflow-hidden">
      {/* Cart Drawer */}
      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        cart={cart}
        language={language}
        onCheckout={handleCheckout}
        updateQuantity={updateCartItemQuantity}
        removeFromCart={removeFromCart}
        clearCart={clearCart}
      />

      {/* Header */}
      <header className="flex-none h-16 border-b border-gray-100 px-6 flex items-center justify-between bg-white z-10 relative">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Nova<span className="text-blue-600">Support</span></h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
             <div className="hidden md:flex items-center gap-1 p-1 bg-gray-50 rounded-lg border border-gray-100">
               <button 
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${language === 'en' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
               >
                 EN
               </button>
               <button 
                  onClick={() => setLanguage('fr')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${language === 'fr' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
               >
                 FR
               </button>
             </div>

            {/* User Switcher */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
               <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{t.simulatingUser}:</span>
               <select 
                 className="bg-transparent text-sm font-semibold text-gray-700 outline-none cursor-pointer"
                 value={currentUser.id}
                 onChange={(e) => {
                   const user = CUSTOMERS.find(c => c.id === e.target.value);
                   if (user) setCurrentUser(user);
                 }}
               >
                 {CUSTOMERS.map(c => (
                   <option key={c.id} value={c.id}>
                      {c.name} {c.role === 'admin' ? '(Admin)' : ''}
                   </option>
                 ))}
               </select>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Cart Icon */}
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative group cursor-pointer p-2 rounded-full hover:bg-gray-100 transition-all"
          >
            <div className="text-gray-500 hover:text-blue-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            {cartTotalItems > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full shadow-sm">
                {cartTotalItems}
              </span>
            )}
          </button>

          {/* Tab Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'products'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className="hidden sm:inline">{t.tabs.products}</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'chat'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span className="hidden sm:inline">{t.tabs.chat}</span>
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'live'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span className="hidden sm:inline">{t.tabs.live}</span>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'reports'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="hidden sm:inline">{t.tabs.reports}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area - Keeping components mounted to preserve state */}
      <main className="flex-1 p-4 md:p-6 lg:px-8 max-w-7xl mx-auto w-full h-[calc(100vh-64px)] overflow-hidden relative">
        <div className={`h-full max-w-6xl mx-auto ${activeTab === 'products' ? 'block' : 'hidden'}`}>
           <ProductBrowser language={language} addToCart={addToCart} />
        </div>
        
        <div className={`h-full max-w-4xl mx-auto ${activeTab === 'chat' ? 'block' : 'hidden'}`}>
           <ChatInterface 
              apiKey={API_KEY} 
              currentUser={currentUser} 
              language={language} 
              addToCart={addToCart}
              onCheckout={handleCheckout}
              cartItems={cart}
           />
        </div>

        <div className={`h-full max-w-4xl mx-auto ${activeTab === 'live' ? 'block' : 'hidden'}`}>
           <LiveSupport 
              apiKey={API_KEY} 
              currentUser={currentUser} 
              language={language} 
              cart={cart}
              addToCart={addToCart}
              placeOrder={handleCheckout}
           />
        </div>

        <div className={`h-full max-w-6xl mx-auto ${activeTab === 'reports' ? 'block' : 'hidden'}`}>
          <AnalyticsDashboard currentUser={currentUser} language={language} />
        </div>
      </main>
    </div>
  );
};

export default App;