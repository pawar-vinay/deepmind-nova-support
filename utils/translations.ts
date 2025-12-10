import { Language } from '../types';

export const translations = {
  en: {
    simulatingUser: "Simulating User",
    tabs: {
      products: "Products",
      chat: "Chat",
      live: "Live Voice",
      reports: "Reports"
    },
    chat: {
      placeholder: "Type your message...",
      welcome: (name: string) => `Hello ${name}! I'm Nova. How can I help you with your TechNova products today?`,
      error: "I'm having trouble connecting right now. Please try again later.",
      send: "Send",
      endChat: "End Chat",
      survey: {
        title: "Rate your experience",
        placeholder: "Any additional feedback?",
        submit: "Submit Feedback",
        thankYou: "Thank you for your feedback!"
      },
      proactive: {
        trackOrder: "Track my order",
        browseProducts: "Browse Products",
        returnPolicy: "Return Policy"
      },
      escalation: {
        success: (id: string) => `I've escalated your issue to a human specialist. Your Ticket ID is ${id}. They will contact you shortly.`
      }
    },
    live: {
      title: "Nova Voice Support",
      loggedInAs: "Logged in as",
      status: {
        connected: "Live • Listening",
        connecting: "Establishing Connection...",
        error: "Connection Failed",
        ready: "Ready to Call"
      },
      button: {
        start: "Start Call",
        stop: "End Call"
      }
    },
    products: {
      searchPlaceholder: "Search products...",
      allCategory: "All",
      outOfStock: "OUT OF STOCK",
      noProducts: "No products found",
      price: "Price"
    },
    cart: {
      title: "Your Cart",
      empty: "Your cart is empty.",
      total: "Total",
      checkout: "Checkout",
      close: "Close"
    },
    reports: {
      dashboardTitle: "Analytics Dashboard",
      personalTitle: "My Activity Report",
      totalChats: "Total Chats",
      validChats: "Valid Chats",
      invalidChats: "Invalid Chats",
      engagement: "Engagement Score",
      integrations: "System Integrations",
      connected: "Connected",
      latency: "High Latency",
      disconnected: "Disconnected"
    }
  },
  fr: {
    simulatingUser: "Utilisateur",
    tabs: {
      products: "Produits",
      chat: "Chat",
      live: "Voix en direct",
      reports: "Rapports"
    },
    chat: {
      placeholder: "Écrivez votre message...",
      welcome: (name: string) => `Bonjour ${name} ! Je suis Nova. Comment puis-je vous aider avec vos produits TechNova aujourd'hui ?`,
      error: "Je rencontre des problèmes de connexion pour le moment. Veuillez réessayer plus tard.",
      send: "Envoyer",
      endChat: "Fin du Chat",
      survey: {
        title: "Évaluez votre expérience",
        placeholder: "Des commentaires supplémentaires ?",
        submit: "Envoyer",
        thankYou: "Merci pour votre avis !"
      },
      proactive: {
        trackOrder: "Suivre ma commande",
        browseProducts: "Voir les produits",
        returnPolicy: "Politique de retour"
      },
      escalation: {
        success: (id: string) => `J'ai transmis votre dossier à un spécialiste humain. Votre numéro de ticket est ${id}. Ils vous contacteront sous peu.`
      }
    },
    live: {
      title: "Support Vocal Nova",
      loggedInAs: "Connecté en tant que",
      status: {
        connected: "En direct • Écoute",
        connecting: "Connexion en cours...",
        error: "Échec de connexion",
        ready: "Prêt à appeler"
      },
      button: {
        start: "Appeler",
        stop: "Raccrocher"
      }
    },
    products: {
      searchPlaceholder: "Rechercher des produits...",
      allCategory: "Tous",
      outOfStock: "RUPTURE",
      noProducts: "Aucun produit trouvé",
      price: "Prix"
    },
    cart: {
      title: "Votre Panier",
      empty: "Votre panier est vide.",
      total: "Total",
      checkout: "Payer",
      close: "Fermer"
    },
    reports: {
      dashboardTitle: "Tableau de Bord Analytique",
      personalTitle: "Mon Rapport d'Activité",
      totalChats: "Total des Chats",
      validChats: "Chats Valides",
      invalidChats: "Chats Invalides",
      engagement: "Score d'Engagement",
      integrations: "Intégrations Système",
      connected: "Connecté",
      latency: "Latence Élevée",
      disconnected: "Déconnecté"
    }
  }
};