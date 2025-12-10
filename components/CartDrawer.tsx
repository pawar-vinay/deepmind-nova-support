import React, { useState } from 'react';
import { CartItem, Language } from '../types';
import { translations } from '../utils/translations';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  language: Language;
  onCheckout: () => string;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ 
  isOpen, 
  onClose, 
  cart, 
  language, 
  onCheckout,
  updateQuantity,
  removeFromCart,
  clearCart
}) => {
  const t = translations[language].cart;
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'review' | 'success'>('cart');
  const [lastOrderId, setLastOrderId] = useState<string>('');

  if (!isOpen) return null;

  const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const handleCheckoutClick = () => {
    setCheckoutStep('review');
  };

  const handleConfirmOrder = () => {
    const orderId = onCheckout();
    setLastOrderId(orderId);
    setCheckoutStep('success');
  };

  const handleFinalize = () => {
    setCheckoutStep('cart');
    onClose();
  };

  const closeDrawer = () => {
    setCheckoutStep('cart');
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={closeDrawer}></div>
      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md bg-white shadow-xl flex flex-col h-full animate-slide-in-right">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-gray-900">
                {checkoutStep === 'cart' && t.title}
                {checkoutStep === 'review' && 'Review Order'}
                {checkoutStep === 'success' && 'Success'}
              </h2>
              {checkoutStep === 'cart' && cart.length > 0 && (
                <button 
                  onClick={clearCart}
                  className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                >
                  Clear Cart
                </button>
              )}
            </div>
            <button 
              onClick={closeDrawer}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content based on Step */}
          {checkoutStep === 'cart' && (
            <>
              <div className="flex-1 overflow-y-auto p-6">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 font-medium">{t.empty}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {cart.map((item, index) => (
                      <div key={`${item.product.id}-${index}`} className="flex gap-4 items-start bg-white group">
                        <div className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                          <img 
                            src={item.product.image} 
                            alt={item.product.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between h-20">
                          <div className="flex justify-between items-start">
                             <div>
                                <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{item.product.name}</h3>
                                <p className="text-xs text-gray-500">{item.product.category}</p>
                             </div>
                             <button 
                                onClick={() => removeFromCart(item.product.id)}
                                className="text-gray-300 hover:text-red-500 transition-colors p-1 -mr-2"
                                title="Remove item"
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                             </button>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            {/* Quantity Stepper */}
                            <div className="flex items-center gap-1 bg-gray-50 rounded-lg border border-gray-200 p-0.5">
                               <button 
                                  onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                  className="w-6 h-6 flex items-center justify-center bg-white rounded text-gray-600 shadow-sm hover:text-blue-600 disabled:opacity-50"
                                  disabled={item.quantity <= 1}
                               >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg>
                               </button>
                               <span className="w-6 text-center text-xs font-bold text-gray-700">{item.quantity}</span>
                               <button 
                                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                  className="w-6 h-6 flex items-center justify-center bg-white rounded text-gray-600 shadow-sm hover:text-blue-600"
                               >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                               </button>
                            </div>
                            
                            {/* Price */}
                            <span className="text-sm font-bold text-blue-600">
                                ${(item.product.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {cart.length > 0 && (
                <div className="border-t border-gray-100 p-6 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-base font-medium text-gray-600">{t.total}</span>
                    <span className="text-xl font-bold text-gray-900">${total.toFixed(2)}</span>
                  </div>
                  <button 
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all transform active:scale-95"
                    onClick={handleCheckoutClick}
                  >
                    {t.checkout}
                  </button>
                </div>
              )}
            </>
          )}

          {checkoutStep === 'review' && (
            <div className="flex flex-col h-full p-6">
                <div className="flex-1 space-y-6">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-2">Shipping Address</h3>
                        <p className="text-sm text-gray-600">123 Tech Nova Blvd</p>
                        <p className="text-sm text-gray-600">San Francisco, CA 94105</p>
                    </div>
                    
                    <div>
                        <h3 className="font-bold text-gray-900 mb-3">Order Summary</h3>
                        <div className="space-y-3">
                            {cart.map((item) => (
                                <div key={item.product.id} className="flex justify-between text-sm">
                                    <span className="text-gray-600">{item.quantity}x {item.product.name}</span>
                                    <span className="font-medium">${(item.product.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                            <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-base">
                                <span>Total</span>
                                <span>${total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex gap-3 mt-auto pt-6 border-t border-gray-100">
                    <button 
                        onClick={() => setCheckoutStep('cart')}
                        className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl"
                    >
                        Back
                    </button>
                    <button 
                        onClick={handleConfirmOrder}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg"
                    >
                        Buy Now
                    </button>
                </div>
            </div>
          )}

          {checkoutStep === 'success' && (
             <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                 <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6 animate-bounce">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                 </div>
                 <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h2>
                 <p className="text-gray-500 mb-2">Thank you for your purchase.</p>
                 <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 mb-8 inline-block">
                     <span className="text-sm text-gray-500 mr-2">Order ID:</span>
                     <span className="font-mono font-bold text-gray-900">{lastOrderId}</span>
                 </div>
                 <button 
                    onClick={handleFinalize}
                    className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition-all"
                 >
                    Continue Shopping
                 </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartDrawer;