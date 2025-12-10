import React, { useState, useRef, useEffect } from 'react';
import { GenerateContentResponse, Part } from "@google/genai";
import { Message, Sender, Customer, Language, Product, CartItem } from '../types';
import { getChatSession, resetChatSession } from '../services/chatService';
import { searchProducts, getCustomerOrders, PRODUCTS } from '../data/mockData';
import { translations } from '../utils/translations';
import { submitSurvey, createEscalationTicket } from '../services/integrationService';

interface ChatInterfaceProps {
  apiKey: string;
  currentUser: Customer;
  language: Language;
  addToCart: (product: Product, quantity: number) => void;
  onCheckout: () => string;
  cartItems: CartItem[];
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ apiKey, currentUser, language, addToCart, onCheckout, cartItems }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyRating, setSurveyRating] = useState(0);
  const [surveyFeedback, setSurveyFeedback] = useState('');
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Use a ref to track cart items to avoid stale closures in async tool loop
  const cartItemsRef = useRef(cartItems);
  useEffect(() => {
    cartItemsRef.current = cartItems;
  }, [cartItems]);

  const t = translations[language].chat;

  // Reset chat when user ID or language changes. 
  // IMPORTANT: Do not depend on the whole 'currentUser' object, as it changes when orders are added.
  useEffect(() => {
    resetChatSession();
    setShowSurvey(false);
    setSurveySubmitted(false);
    setSurveyRating(0);
    setSurveyFeedback('');
    
    setMessages([{
      id: 'welcome',
      text: t.welcome(currentUser.name.split(' ')[0]),
      sender: Sender.Bot,
      timestamp: new Date(),
      options: ['trackOrder', 'browseProducts', 'returnPolicy']
    }]);
  }, [currentUser.id, language]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleOptionClick = (option: string) => {
    let text = "";
    switch(option) {
      case 'trackOrder': text = t.proactive.trackOrder; break;
      case 'browseProducts': text = t.proactive.browseProducts; break;
      case 'returnPolicy': text = t.proactive.returnPolicy; break;
    }
    handleSendMessage(text);
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputText;
    if (!messageText.trim() || isLoading) return;

    // 1. Immediate check for missing API Key
    if (!apiKey) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: messageText,
        sender: Sender.User,
        timestamp: new Date()
      }, {
        id: (Date.now() + 1).toString(),
        text: "Configuration Error: API Key is missing. Please provide a valid Gemini API Key.",
        sender: Sender.System,
        timestamp: new Date()
      }]);
      setInputText('');
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: Sender.User,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const chat = getChatSession(apiKey, currentUser, language);
      
      const botMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: botMsgId,
        text: '',
        sender: Sender.Bot,
        timestamp: new Date(),
        isStreaming: true
      }]);

      let currentResponse: GenerateContentResponse | null = null;
      currentResponse = await chat.sendMessage({ message: userMsg.text });

      let turns = 0;
      while (currentResponse && currentResponse.functionCalls && currentResponse.functionCalls.length > 0 && turns < 5) {
        turns++;
        const functionCalls = currentResponse.functionCalls;
        const functionResponseParts: Part[] = [];

        for (const call of functionCalls) {
          let result: any = { error: 'Unknown tool' };

          if (call.name === 'search_products') {
            const { query, category } = call.args as any;
            result = { products: searchProducts(query, category) };
          } else if (call.name === 'get_my_orders') {
            result = { orders: getCustomerOrders(currentUser.id) };
          } else if (call.name === 'add_to_cart') {
            const { productName, quantity } = call.args as any;
            const foundProduct = PRODUCTS.find(p => p.name.toLowerCase().includes(productName.toLowerCase()));
            
            if (foundProduct) {
              const qty = quantity || 1;
              addToCart(foundProduct, qty);

              // Cross-selling / Upselling Logic based on category
              const cat = foundProduct.category;
              let recommendation = "";
              
              if (['T-Shirt', 'Jacket', 'Hoodie'].includes(cat)) {
                  recommendation = "Recommend matching Jeans or Sneakers to complete the outfit.";
              } else if (cat === 'Jeans') {
                  recommendation = "Recommend a matching T-Shirt or Hoodie.";
              } else if (cat === 'Sneakers') {
                  recommendation = "Recommend a Hoodie or Hat to match.";
              } else if (cat === 'Dress') {
                  recommendation = "Recommend a matching Jacket.";
              } else {
                  recommendation = "Recommend checking out our other accessories.";
              }

              result = { 
                  success: true, 
                  message: `Added ${qty} x ${foundProduct.name} to cart. Total price: $${foundProduct.price * qty}. [SYSTEM HINT: The user bought ${cat}. ${recommendation}]` 
              };
            } else {
              result = { success: false, message: `Product "${productName}" not found.` };
            }
          } else if (call.name === 'place_order') {
            // Check using ref to ensure we have latest cart state
            if (cartItemsRef.current.length === 0) {
                 result = { success: false, message: "The cart is empty. Cannot place an order. Please add items first." };
            } else {
                 const orderId = onCheckout();
                 console.log("Chat: Order placed with ID:", orderId);
                 result = { 
                   success: true, 
                   orderId: orderId,
                   system_note: `The order was placed successfully with ID: ${orderId}. You MUST tell the user: "I have placed your order. Your Order ID is ${orderId}".`,
                   message: `Order placed successfully. Order ID: ${orderId}` 
                 };
            }
          } else if (call.name === 'escalate_issue') {
            const { reason } = call.args as any;
            const ticketId = await createEscalationTicket(currentUser.id, reason);
            result = {
              success: true,
              ticketId: ticketId,
              message: `Ticket created with ID ${ticketId}. The agent should confirm this to the user.`
            };
          }

          functionResponseParts.push({
            functionResponse: {
              id: call.id,
              name: call.name,
              response: { result }
            }
          });
        }
        
        currentResponse = await chat.sendMessage({ message: functionResponseParts });
      }

      if (currentResponse && currentResponse.text) {
          const finalText = currentResponse.text;
          setMessages(prev => 
            prev.map(msg => 
              msg.id === botMsgId 
                ? { ...msg, text: finalText, isStreaming: false } 
                : msg
            )
          );
      } else {
        throw new Error("No response text generated");
      }

    } catch (error: any) {
      console.error('Chat error:', error);
      
      let errorMessage = t.error;
      const errorString = error.toString().toLowerCase();
      
      // 2. Detect specific API Key errors
      if (errorString.includes('api key') || errorString.includes('403') || errorString.includes('permission_denied')) {
        errorMessage = "Authentication Error: The API Key provided is invalid or expired. Please check your configuration.";
      } else if (errorString.includes('400')) {
        errorMessage = "Request Error: There was an issue with the request. Please try again.";
      }

      setMessages(prev => {
          // Remove the loading "Nova is typing" message
          const filtered = prev.filter(msg => msg.id !== (Date.now() + 1).toString());
          return [...filtered, {
            id: Date.now().toString(),
            text: errorMessage,
            sender: Sender.System,
            timestamp: new Date()
          }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndChat = () => {
    setShowSurvey(true);
  };

  const handleSubmitSurvey = async () => {
    await submitSurvey(currentUser.id, surveyRating, surveyFeedback);
    setSurveySubmitted(true);
    setTimeout(() => {
      setShowSurvey(false);
      // Optional: Reset chat or just leave it
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
      {/* Header Actions */}
      <div className="absolute top-4 right-4 z-10">
        <button 
          onClick={handleEndChat}
          className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold hover:bg-red-100 transition-colors"
        >
          {t.endChat}
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col">
            <div className={`flex ${msg.sender === Sender.User ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap ${
                  msg.sender === Sender.User
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : msg.sender === Sender.System
                    ? 'bg-red-50 text-red-600 border border-red-100 text-center w-full font-medium'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                }`}
              >
                {msg.isStreaming && !msg.text ? (
                   <div className="flex items-center gap-2 py-1">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">Nova is typing...</span>
                   </div>
                ) : (
                   msg.text
                )}
              </div>
            </div>
            
            {/* Proactive Options Chips */}
            {msg.options && (
              <div className="flex flex-wrap gap-2 mt-2 ml-2 animate-fadeIn">
                {msg.options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => handleOptionClick(opt)}
                    className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-xs font-medium border border-blue-100 hover:bg-blue-100 hover:border-blue-200 transition-all"
                  >
                     {opt === 'trackOrder' && t.proactive.trackOrder}
                     {opt === 'browseProducts' && t.proactive.browseProducts}
                     {opt === 'returnPolicy' && t.proactive.returnPolicy}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="relative flex items-end gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.placeholder}
            className="w-full max-h-32 bg-transparent border-none focus:ring-0 resize-none py-2 px-2 text-gray-700 placeholder-gray-400 text-[15px]"
            rows={1}
            style={{ minHeight: '44px' }}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isLoading}
            className={`p-2.5 rounded-lg mb-1 transition-all flex items-center justify-center ${
              inputText.trim() && !isLoading
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Survey Modal */}
      {showSurvey && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm animate-bounce-in">
             {!surveySubmitted ? (
               <>
                 <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">{t.survey.title}</h3>
                 <div className="flex justify-center gap-2 mb-6">
                   {[1, 2, 3, 4, 5].map((star) => (
                     <button
                       key={star}
                       onClick={() => setSurveyRating(star)}
                       className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                         surveyRating >= star ? 'bg-yellow-400 text-white scale-110' : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
                       }`}
                     >
                       <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                     </button>
                   ))}
                 </div>
                 <textarea
                   className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 mb-4 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                   rows={3}
                   placeholder={t.survey.placeholder}
                   value={surveyFeedback}
                   onChange={(e) => setSurveyFeedback(e.target.value)}
                 />
                 <div className="flex gap-2">
                   <button 
                     onClick={() => setShowSurvey(false)} 
                     className="flex-1 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-medium"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={handleSubmitSurvey}
                     disabled={surveyRating === 0}
                     className={`flex-1 py-2 rounded-lg text-sm font-bold text-white transition-all ${
                        surveyRating > 0 ? 'bg-blue-600 hover:bg-blue-700 shadow-md' : 'bg-gray-300 cursor-not-allowed'
                     }`}
                   >
                     {t.survey.submit}
                   </button>
                 </div>
               </>
             ) : (
               <div className="text-center py-8">
                 <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                 </div>
                 <h3 className="text-xl font-bold text-gray-900">{t.survey.thankYou}</h3>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;