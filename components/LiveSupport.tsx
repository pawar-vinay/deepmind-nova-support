import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, FunctionDeclaration, Type, Modality } from '@google/genai';
import { createBlob, decodeAudioData, decode } from '../utils/audioUtils';
import { ConnectionStatus, Customer, Language, Product, CartItem } from '../types';
import { searchProducts, getCustomerOrders, PRODUCTS, CATEGORIES } from '../data/mockData';
import { translations } from '../utils/translations';
import { createEscalationTicket } from '../services/integrationService';

interface LiveSupportProps {
  apiKey: string;
  currentUser: Customer;
  language: Language;
  cart: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  placeOrder: () => string;
}

const LiveSupport: React.FC<LiveSupportProps> = ({ 
  apiKey, 
  currentUser, 
  language, 
  cart, 
  addToCart, 
  placeOrder 
}) => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.Disconnected);
  const [volume, setVolume] = useState(0);
  const t = translations[language].live;
  
  // Refs for audio and stream management
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Track the active session
  const activeSessionPromiseRef = useRef<Promise<any> | null>(null);
  const isSessionReadyRef = useRef(false);

  // State Refs to ensure callbacks access latest props without re-binding
  const cartRef = useRef(cart);
  const addToCartRef = useRef(addToCart);
  const placeOrderRef = useRef(placeOrder);

  useEffect(() => {
    cartRef.current = cart;
    addToCartRef.current = addToCart;
    placeOrderRef.current = placeOrder;
  }, [cart, addToCart, placeOrder]);

  // Tools for Live API
  const searchProductsTool: FunctionDeclaration = {
    name: 'search_products',
    description: 'Search for products in the catalog by name or category. Available Categories: ' + CATEGORIES.join(', '),
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'The search term (e.g., "red shirt")' },
        category: { type: Type.STRING, description: 'The category to filter by' }
      },
      required: ['query']
    }
  };

  const getOrdersTool: FunctionDeclaration = {
    name: 'get_my_orders',
    description: 'Get the order history for the current user.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        check: { type: Type.STRING, description: "Verification param" }
      },
      required: ['check']
    }
  };

  const addToCartTool: FunctionDeclaration = {
    name: 'add_to_cart',
    description: 'Add a product to the customer shopping cart.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        productName: { type: Type.STRING, description: 'The name of the product to add.' },
        quantity: { type: Type.NUMBER, description: 'The quantity to add (default 1).' }
      },
      required: ['productName']
    }
  };

  const placeOrderTool: FunctionDeclaration = {
    name: 'place_order',
    description: 'Place an order for the items currently in the cart. Returns the orderId.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        confirm: { type: Type.BOOLEAN, description: "Confirm order placement" }
      },
      required: ['confirm']
    }
  };

  const escalateIssueTool: FunctionDeclaration = {
    name: 'escalate_issue',
    description: 'Escalate the current conversation to a human agent.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        reason: { type: Type.STRING, description: 'The reason for escalation.' }
      },
      required: ['reason']
    }
  };

  const startSession = async () => {
    if (activeSessionPromiseRef.current || status === ConnectionStatus.Connecting) return;
    if (!apiKey) {
        console.error("API Key is missing");
        setStatus(ConnectionStatus.Error);
        return;
    }

    try {
      setStatus(ConnectionStatus.Connecting);
      console.log('Starting Live Session...');
      
      const ai = new GoogleGenAI({ apiKey });
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      let inputCtx: AudioContext;
      let outputCtx: AudioContext;

      try {
        inputCtx = new AudioContextClass({ sampleRate: 16000 });
        outputCtx = new AudioContextClass({ sampleRate: 24000 });
      } catch (e) {
        console.warn("Could not create AudioContext with specific sample rate, falling back to default.", e);
        inputCtx = new AudioContextClass();
        outputCtx = new AudioContextClass();
      }
      
      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();

      inputContextRef.current = inputCtx;
      audioContextRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const systemInstruction = `You are Nova, a helpful phone support agent for TechNova.
      You are speaking with ${currentUser.name}.
      You must speak in ${language === 'fr' ? 'French (Français)' : 'English'}.
      
      **PRODUCT CATALOG CONTEXT**:
      The available product categories are: ${CATEGORIES.join(', ')}.
      If a user asks for "apparels" or "clothes", please assume they are interested in any of these categories.
      
      **RETURN POLICY**:
      - 30-day return window.
      - Items must be unworn with tags.
      - Free shipping on returns.
      - Refunds within 5-7 business days.
      
      You have access to their orders and the product catalog via tools.
      You can also add items to their cart and place orders.
      **ESCALATION**: If the user asks for a human or you cannot resolve the issue, use the 'escalate_issue' tool.
      
      Keep responses short and conversational, like a real phone call.
      If you need to perform an action, say "One moment please" and call the tool.
      When placing an order, explicitly read out the Order ID returned by the tool.`;

      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Live Session Opened');
            setStatus(ConnectionStatus.Connected);

            const source = inputCtx.createMediaStreamSource(stream);
            sourceNodeRef.current = source;
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              if (!isSessionReadyRef.current || !activeSessionPromiseRef.current) return;

              const inputData = e.inputBuffer.getChannelData(0);
              
              // Volume visualization
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolume(Math.min(Math.sqrt(sum / inputData.length) * 5, 1));

              const currentSampleRate = Math.floor(inputCtx.sampleRate);
              const pcmBlob = createBlob(inputData, currentSampleRate);
              
              activeSessionPromiseRef.current?.then((session: any) => {
                try {
                   session.sendRealtimeInput({ media: pcmBlob });
                } catch (e) {
                   // ignore
                }
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.toolCall) {
              console.log('Live Tool Call:', message.toolCall);
              const functionResponses = [];

              for (const fc of message.toolCall.functionCalls) {
                 let result: any = { error: 'Unknown tool' };
                 
                 if (fc.name === 'search_products') {
                    const { query, category } = fc.args as any;
                    result = { products: searchProducts(query, category) };
                 } else if (fc.name === 'get_my_orders') {
                    result = { orders: getCustomerOrders(currentUser.id) };
                 } else if (fc.name === 'add_to_cart') {
                    const { productName, quantity } = fc.args as any;
                    const foundProduct = PRODUCTS.find(p => p.name.toLowerCase().includes(productName.toLowerCase()));
                    
                    if (foundProduct) {
                        const qty = quantity || 1;
                        addToCartRef.current(foundProduct, qty);
                        
                        const cat = foundProduct.category;
                        let recommendation = "";
                        if (['T-Shirt', 'Jacket', 'Hoodie'].includes(cat)) recommendation = "Suggest Jeans.";
                        else if (cat === 'Jeans') recommendation = "Suggest a T-Shirt.";
                        
                        result = { 
                            success: true, 
                            message: `Added ${qty} x ${foundProduct.name} to cart. Total: $${foundProduct.price * qty}. [SYSTEM HINT: The user bought ${cat}. ${recommendation}]` 
                        };
                    } else {
                        result = { success: false, message: `Product "${productName}" not found.` };
                    }
                 } else if (fc.name === 'place_order') {
                    if (cartRef.current.length === 0) {
                        result = { success: false, message: "Cart is empty. Cannot place order." };
                    } else {
                        const orderId = placeOrderRef.current();
                        result = { 
                            success: true, 
                            orderId: orderId,
                            message: `Order placed successfully. Order ID: ${orderId}. You MUST tell the user this ID.`
                        };
                    }
                 } else if (fc.name === 'escalate_issue') {
                    const { reason } = fc.args as any;
                    const ticketId = await createEscalationTicket(currentUser.id, reason);
                    result = {
                        success: true,
                        ticketId: ticketId,
                        message: `Escalation successful. Ticket ID: ${ticketId}. Inform the user.`
                    };
                 }
                 
                 functionResponses.push({
                    id: fc.id,
                    name: fc.name,
                    response: { result }
                 });
              }

              if (activeSessionPromiseRef.current && functionResponses.length > 0) {
                   activeSessionPromiseRef.current.then((session: any) => {
                     try {
                        session.sendToolResponse({ functionResponses });
                     } catch(e) {
                        console.error("Error sending tool response", e);
                     }
                   });
              }
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              const ctx = audioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

              try {
                const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.addEventListener('ended', () => sourcesRef.current.delete(source));
                source.start(nextStartTimeRef.current);
                sourcesRef.current.add(source);
                nextStartTimeRef.current += audioBuffer.duration;
              } catch (err) {
                console.error("Audio decoding error", err);
              }
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
             console.log('Live Session Closed');
             setStatus(ConnectionStatus.Disconnected);
             setVolume(0);
             isSessionReadyRef.current = false;
          },
          onerror: (e: any) => {
            console.error('Live Session Error', e);
            setStatus(ConnectionStatus.Error);
            setVolume(0);
            isSessionReadyRef.current = false;
            stopSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [searchProductsTool, getOrdersTool, addToCartTool, placeOrderTool, escalateIssueTool] }],
          systemInstruction: systemInstruction,
        }
      };

      const sessionPromise = ai.live.connect(config);
      activeSessionPromiseRef.current = sessionPromise;
      
      await sessionPromise;
      isSessionReadyRef.current = true;
      console.log('Live Session Ready');
      
      // Trigger initial greeting
      if (activeSessionPromiseRef.current) {
        activeSessionPromiseRef.current.then((session: any) => {
            try {
                session.sendRealtimeInput({
                    content: {
                        role: 'user',
                        parts: [{ text: language === 'fr' ? "Bonjour" : "Hello" }]
                    }
                });
            } catch (e) {
                console.error("Error sending greeting trigger:", e);
            }
        });
      }

    } catch (error) {
      console.error('Failed to start session:', error);
      setStatus(ConnectionStatus.Error);
      stopSession();
    }
  };

  const stopSession = () => {
    isSessionReadyRef.current = false;
    
    if (inputContextRef.current && inputContextRef.current.state !== 'closed') { 
        inputContextRef.current.close().catch(e => console.warn(e)); 
    }
    inputContextRef.current = null; 

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') { 
        audioContextRef.current.close().catch(e => console.warn(e)); 
    }
    audioContextRef.current = null; 

    if (streamRef.current) { 
        streamRef.current.getTracks().forEach(track => track.stop()); 
        streamRef.current = null; 
    }
    if (processorRef.current) { 
        try { processorRef.current.disconnect(); } catch(e) {}
        processorRef.current = null; 
    }
    if (sourceNodeRef.current) { 
        try { sourceNodeRef.current.disconnect(); } catch(e) {}
        sourceNodeRef.current = null; 
    }
    
    if (activeSessionPromiseRef.current) {
        activeSessionPromiseRef.current.then((session: any) => {
            try {
                session.close();
            } catch(e) {
                // ignore
            }
        });
        activeSessionPromiseRef.current = null;
    }
    
    setStatus(ConnectionStatus.Disconnected);
    setVolume(0);
  };

  useEffect(() => {
    return () => { stopSession(); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-b from-gray-900 to-slate-900 rounded-2xl shadow-xl overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-md p-8">
        <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">{t.title}</h2>
            <p className="text-blue-300 text-sm mb-4">{t.loggedInAs}: {currentUser.name}</p>
            <p className={`text-sm font-medium transition-colors duration-300 ${
                status === ConnectionStatus.Connected ? 'text-green-400' :
                status === ConnectionStatus.Connecting ? 'text-yellow-400' :
                status === ConnectionStatus.Error ? 'text-red-400' :
                'text-gray-400'
            }`}>
                {status === ConnectionStatus.Connected ? t.status.connected :
                 status === ConnectionStatus.Connecting ? t.status.connecting :
                 status === ConnectionStatus.Error ? t.status.error :
                 t.status.ready}
            </p>
        </div>

        <div className="relative mb-16">
            {status === ConnectionStatus.Connected && (
                <>
                    <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 animate-ping" style={{ animationDuration: '2s' }}></div>
                    <div className="absolute inset-0 bg-blue-400 rounded-full opacity-10 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }}></div>
                </>
            )}
            <div 
                className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_0_40px_rgba(0,0,0,0.3)] ${
                    status === ConnectionStatus.Connected 
                        ? 'bg-gradient-to-tr from-blue-600 to-indigo-500 scale-105 shadow-[0_0_60px_rgba(59,130,246,0.4)]'
                        : 'bg-gray-800 border-4 border-gray-700'
                }`}
                style={{ transform: status === ConnectionStatus.Connected ? `scale(${1 + volume * 0.2})` : 'scale(1)' }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className={`w-20 h-20 transition-colors ${status === ConnectionStatus.Connected ? 'text-white' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
            </div>
        </div>

        <div className="flex gap-6">
            {status === ConnectionStatus.Connected || status === ConnectionStatus.Connecting ? (
                <button
                    onClick={stopSession}
                    className="flex items-center justify-center w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full text-white shadow-lg transition-transform hover:scale-105 focus:outline-none"
                    title={t.button.stop}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13.5 2c-5.621 0-10.211 4.443-10.475 10h-3.025l5 6.625 5-6.625h-2.975c.257-3.351 3.06-6 6.475-6 3.584 0 6.5 2.916 6.5 6.5s-2.916 6.5-6.5 6.5c-1.863 0-3.542-.793-4.728-2.053l-2.427 3.216c1.877 1.754 4.389 2.837 7.155 2.837 5.799 0 10.5-4.701 10.5-10.5s-4.701-10.5-10.5-10.5z" opacity="0" /> 
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            ) : (
                <button
                    onClick={startSession}
                    className="flex items-center gap-3 px-8 py-4 bg-white text-blue-900 rounded-full font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:scale-105 transition-all focus:outline-none"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {t.button.start}
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default LiveSupport;