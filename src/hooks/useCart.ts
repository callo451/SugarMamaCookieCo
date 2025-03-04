import { create } from 'zustand';

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface CartStore {
  items: CartItem[];
  itemCount: number;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
}

export const useCart = create<CartStore>((set) => ({
  items: [],
  itemCount: 0,
  addItem: (item) =>
    set((state) => {
      const existingItem = state.items.find((i) => i.id === item.id);
      if (existingItem) {
        return {
          items: state.items.map((i) =>
            i.id === item.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
          itemCount: state.itemCount + 1,
        };
      }
      return {
        items: [...state.items, { ...item, quantity: 1 }],
        itemCount: state.itemCount + 1,
      };
    }),
  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
      itemCount: state.itemCount - (state.items.find((i) => i.id === id)?.quantity || 0),
    })),
  updateQuantity: (id, quantity) =>
    set((state) => {
      const oldQuantity = state.items.find((i) => i.id === id)?.quantity || 0;
      return {
        items: state.items.map((i) =>
          i.id === id ? { ...i, quantity } : i
        ),
        itemCount: state.itemCount + (quantity - oldQuantity),
      };
    }),
  clearCart: () => set({ items: [], itemCount: 0 }),
}));