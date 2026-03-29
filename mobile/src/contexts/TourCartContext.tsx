import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CartProperty {
  id: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: string;
  squareFootage?: number;
  imageUrl?: string;
}

interface TourCartContextType {
  cartItems: CartProperty[];
  addToCart: (property: CartProperty) => void;
  removeFromCart: (propertyId: string) => void;
  clearCart: () => Promise<void>;
  isInCart: (propertyId: string) => boolean;
  cartCount: number;
}

const TourCartContext = createContext<TourCartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'tour_cart_items';

export function TourCartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartProperty[]>([]);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setCartItems(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  const saveCart = async (items: CartProperty[]) => {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const addToCart = (property: CartProperty) => {
    setCartItems((prev) => {
      if (prev.some((item) => item.id === property.id)) {
        return prev;
      }
      const newItems = [...prev, property];
      saveCart(newItems);
      return newItems;
    });
  };

  const removeFromCart = (propertyId: string) => {
    setCartItems((prev) => {
      const newItems = prev.filter((item) => item.id !== propertyId);
      saveCart(newItems);
      return newItems;
    });
  };

  const clearCart = async () => {
    setCartItems([]);
    try {
      await AsyncStorage.removeItem(CART_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const isInCart = (propertyId: string) => {
    return cartItems.some((item) => item.id === propertyId);
  };

  return (
    <TourCartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        clearCart,
        isInCart,
        cartCount: cartItems.length,
      }}
    >
      {children}
    </TourCartContext.Provider>
  );
}

export function useTourCart() {
  const context = useContext(TourCartContext);
  if (context === undefined) {
    throw new Error('useTourCart must be used within a TourCartProvider');
  }
  return context;
}
