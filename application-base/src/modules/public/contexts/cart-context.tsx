'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

// Types
interface CartItem {
  variantId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: { variantId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { variantId: string; quantity: number } }
  | { type: 'SET_STATE'; payload: CartState };

// Reducer
const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.variantId === action.payload.variantId);
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.variantId === action.payload.variantId
              ? { ...item, quantity: item.quantity + action.payload.quantity }
              : item
          ),
        };
      }
      return { ...state, items: [...state.items, action.payload] };
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.variantId !== action.payload.variantId),
      };
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(item =>
          item.variantId === action.payload.variantId
            ? { ...item, quantity: action.payload.quantity }
            : item
        ).filter(item => item.quantity > 0), // Remove if quantity is 0
      };
    case 'SET_STATE':
        return action.payload;
    default:
      return state;
  }
};

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
  addItem: (item: CartItem) => Promise<void>;
  removeItem: (variantId: string) => Promise<void>;
  updateQuantity: (variantId: string, quantity: number) => Promise<void>;
}>({
  state: { items: [] },
  dispatch: () => null,
  addItem: async () => {},
  removeItem: async () => {},
  updateQuantity: async () => {},
});

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const { data: session, status } = useSession();
  const mergeAttempted = React.useRef(false);

  const fetchAndSetCart = useCallback(async () => {
    if (status === 'authenticated') {
      try {
        const res = await fetch('/api/cart');
        const serverCart = await res.json();
        const adaptedItems = serverCart.items.map((item: any) => ({
            variantId: item.variant.id,
            productId: item.variant.product.id,
            name: item.variant.product.name,
            price: item.variant.price,
            quantity: item.quantity,
            image: item.variant.images[0]?.url,
        }));
        dispatch({ type: 'SET_STATE', payload: { items: adaptedItems } });
      } catch (error) {
        console.error("Failed to fetch persistent cart", error);
      }
    } else if (status === 'unauthenticated') {
      try {
        const storedCart = localStorage.getItem('aurora-cart');
        dispatch({ type: 'SET_STATE', payload: storedCart ? JSON.parse(storedCart) : { items: [] } });
      } catch (error) {
        console.error("Failed to load cart from localStorage", error);
      }
    }
  }, [status]);

  useEffect(() => {
    const mergeCarts = async () => {
      const localCartRaw = localStorage.getItem('aurora-cart');
      if (localCartRaw) {
        const localCart = JSON.parse(localCartRaw);
        if (localCart.items && localCart.items.length > 0) {
          await fetch('/api/cart/merge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: localCart.items }),
          });
          localStorage.removeItem('aurora-cart');
        }
      }
      await fetchAndSetCart();
    };

    if (status === 'authenticated' && !mergeAttempted.current) {
      mergeAttempted.current = true;
      mergeCarts();
    } else if (status !== 'loading') {
        fetchAndSetCart();
    }
  }, [status, fetchAndSetCart]);

  // For unauthenticated users, save to localStorage
  useEffect(() => {
    if (status === 'unauthenticated') {
      try {
        localStorage.setItem('aurora-cart', JSON.stringify(state));
      } catch (error) {
        console.error("Failed to save cart to localStorage", error);
      }
    }
  }, [state, status]);

  const addItem = async (item: CartItem) => {
    if (status === 'authenticated') {
        await fetch('/api/cart/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variantId: item.variantId, quantity: item.quantity }),
        });
        await fetchAndSetCart();
    } else {
        dispatch({ type: 'ADD_ITEM', payload: item });
    }
  };

  const removeItem = async (variantId: string) => {
    if (status === 'authenticated') {
        await fetch(`/api/cart/items/${variantId}`, { method: 'DELETE' });
        await fetchAndSetCart();
    } else {
        dispatch({ type: 'REMOVE_ITEM', payload: { variantId } });
    }
  };
  
  const updateQuantity = async (variantId: string, quantity: number) => {
    if (status === 'authenticated') {
        await fetch(`/api/cart/items/${variantId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity }),
        });
        await fetchAndSetCart();
    } else {
        dispatch({ type: 'UPDATE_QUANTITY', payload: { variantId, quantity } });
    }
  };


  return (
    <CartContext.Provider value={{ state, dispatch, addItem, removeItem, updateQuantity }}>
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
