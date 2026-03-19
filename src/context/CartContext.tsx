import React, { createContext, useContext, useState, useEffect } from 'react';

interface CartItem {
  stock_id: string;
  medicament_nom: string;
  pharmacie_id: string;
  pharmacie_nom: string;
  prix: number;
  quantite: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (stockId: string) => void;
  clearCart: () => void;
  totalAmount: number;
  appCommission: number; // Tes 1%
  pharmaciesParts: Record<string, number>; // Ce qui revient à chaque pharmacie (99%)
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Charger le panier depuis le stockage local au démarrage
  useEffect(() => {
    const savedCart = localStorage.getItem('medoc_cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  // Sauvegarder le panier quand il change
  useEffect(() => {
    localStorage.setItem('medoc_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (newItem: CartItem) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.stock_id === newItem.stock_id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.stock_id === newItem.stock_id
            ? { ...item, quantite: item.quantite + 1 }
            : item
        );
      }
      return [...prevCart, { ...newItem, quantite: 1 }];
    });
  };

  const removeFromCart = (stockId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.stock_id !== stockId));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('medoc_cart');
  };

  // CALCULS FINANCIERS
  const totalAmount = cart.reduce((sum, item) => sum + item.prix * item.quantite, 0);
  const appCommission = Math.floor(totalAmount * 0.01); // 1% de commission pour toi
  
  // Répartir les 99% restants par pharmacie
  const pharmaciesParts = cart.reduce((acc, item) => {
    const partBrute = item.prix * item.quantite;
    const partNet = Math.floor(partBrute * 0.99); // 99% pour la pharmacie
    acc[item.pharmacie_id] = (acc[item.pharmacie_id] || 0) + partNet;
    return acc;
  }, {} as Record<string, number>);

  return (
    <CartContext.Provider value={{ 
      cart, 
      addToCart, 
      removeFromCart, 
      clearCart, 
      totalAmount, 
      appCommission,
      pharmaciesParts 
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
