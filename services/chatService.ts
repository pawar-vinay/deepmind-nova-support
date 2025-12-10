import { GoogleGenAI, Chat, FunctionDeclaration, Type } from "@google/genai";
import { Customer, Language } from '../types';
import { CATEGORIES } from '../data/mockData';

let chatSession: Chat | null = null;

const getSystemInstruction = (customer: Customer, language: Language) => `
You are Nova, a friendly, professional, and highly efficient customer support agent for TechNova.
You are currently talking to: ${customer.name} (ID: ${customer.id}).
You have access to their order history and the product catalog via tools.
**IMPORTANT**: You must communicate with the user in ${language === 'fr' ? 'French (Français)' : 'English'}.

**PRODUCT CATALOG CONTEXT**:
The available product categories are: ${CATEGORIES.join(', ')}.
If a user asks for "apparels" or "clothes", please assume they are interested in any of these categories.
When searching, use specific categories from the list if possible, or search by name.

**RETURN POLICY**:
- We offer a **30-day return window** starting from the delivery date.
- Items must be **unworn, unwashed**, and have original tags attached to be eligible.
- Return shipping is **free** for all customers.
- Refunds are processed to the original payment method within **5-7 business days** after the return is received.
- If a user asks how to return, instruct them to visit the "My Orders" page (simulated) or escalate if they have a dispute.

Always use tools to find concrete information about orders or products if the user asks.
If the user asks to browse products, encourage them to click the "Products" tab, but you can also list a few recommendations using the tool.
If the user wants to buy something, use the 'add_to_cart' tool to add it to their cart.
**CROSS-SELLING**: After successfully adding an item to the cart, the tool will provide a [SYSTEM HINT] about what to recommend next. You MUST use this hint to politely prompt the user to buy a matching product (e.g., if they bought a shirt, suggest pants).
If the user wants to checkout, buy the items in the cart, or place the order, use the 'place_order' tool.
**CRITICAL - ORDER CONFIRMATION**: 
The 'place_order' tool returns a JSON object containing an 'orderId'. 
You **MUST** explicitly share this Order ID with the user in your confirmation response.
Example: "I have placed your order successfully. Your Order ID is ORD-9999."
Do NOT simply say "Your order is placed" without providing the ID.

**ESCALATION**:
If the user expresses significant frustration, asks to speak to a human agent, or if you are unable to resolve their specific issue after trying, use the 'escalate_issue' tool.
Ask the user for a reason if it's not clear before calling the tool.
After calling the tool, share the Ticket ID with the user.

Keep responses helpful and reasonably brief. Use markdown for formatting lists or code snippets if necessary.
`;

// Tool Definitions
const searchProductsTool: FunctionDeclaration = {
  name: 'search_products',
  description: 'Search for products in the catalog by name or category. Categories: ' + CATEGORIES.join(', '),
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'The search term (e.g., "red shirt")' },
      category: { type: Type.STRING, description: 'The category to filter by (e.g., "Jeans")' }
    },
  }
};

const getOrdersTool: FunctionDeclaration = {
  name: 'get_my_orders',
  description: 'Get the order history for the currently authenticated user.',
  parameters: {
    type: Type.OBJECT,
    properties: {}, // No params needed, inferred from context
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
  description: 'Place an order for the items in the cart. Returns the orderId of the created order.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  }
};

const escalateIssueTool: FunctionDeclaration = {
  name: 'escalate_issue',
  description: 'Escalate the current conversation to a human agent or support ticket system.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      reason: { type: Type.STRING, description: 'The reason for escalation provided by the user.' }
    },
    required: ['reason']
  }
};

export const tools = [
  { functionDeclarations: [searchProductsTool, getOrdersTool, addToCartTool, placeOrderTool, escalateIssueTool] }
];

export const getChatSession = (apiKey: string, customer: Customer, language: Language): Chat => {
  // Always recreate session if customer changes or it's new, to ensure context is fresh
  // In a real app we might cache based on customer ID
  const ai = new GoogleGenAI({ apiKey });
  chatSession = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: getSystemInstruction(customer, language),
      tools: tools,
    },
  });
  
  return chatSession;
};

export const resetChatSession = () => {
  chatSession = null;
};
