import { create } from "zustand";

interface FavoritesState {
  favorites: string[];
  loading: boolean;

  loadFavorites: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;

  // used on logout to prevent cross-user bleed
  resetFavorites: () => void;
}

export const useFavorites = create<FavoritesState>((set, get) => ({
  favorites: [],
  loading: false,

  resetFavorites: () => set({ favorites: [] }),

  loadFavorites: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/favorites", { cache: "no-store" });
      if (!res.ok) {
        set({ favorites: [] });
        return;
      }
      const data = await res.json();
      set({ favorites: Array.isArray(data.favorites) ? data.favorites : [] });
    } finally {
      set({ loading: false });
    }
  },

  toggleFavorite: async (id: string) => {
    const isFav = get().favorites.includes(id);

    // optimistic update
    set({
      favorites: isFav
        ? get().favorites.filter((f) => f !== id)
        : [...get().favorites, id],
    });

    const res = await fetch(`/api/favorites/${id}`, {
      method: isFav ? "DELETE" : "POST",
    });

    // rollback on failure
    if (!res.ok) {
      set({
        favorites: isFav
          ? [...get().favorites, id] // re-add
          : get().favorites.filter((f) => f !== id), // remove again
      });
    }
  },

  removeFavorite: async (id: string) => {
    // optimistic
    set({ favorites: get().favorites.filter((f) => f !== id) });

    const res = await fetch(`/api/favorites/${id}`, { method: "DELETE" });
    if (!res.ok) {
      // reload from server to be safe
      await get().loadFavorites();
    }
  },
}));
