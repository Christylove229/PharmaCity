import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import type { Database } from './types';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Stockage sécurisé : Keychain iOS / Keystore Android
// Au lieu de localStorage (accessible sur appareil rooté)
const secureStorage = {
  getItem: async (key: string) => {
    if (!Capacitor.isNativePlatform()) {
      return localStorage.getItem(key);
    }
    try {
      const { value } = await SecureStoragePlugin.get({ key });
      return value;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    if (!Capacitor.isNativePlatform()) {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStoragePlugin.set({ key, value });
  },
  removeItem: async (key: string) => {
    if (!Capacitor.isNativePlatform()) {
      localStorage.removeItem(key);
      return;
    }
    await SecureStoragePlugin.remove({ key });
  }
};

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: secureStorage,  // ✅ remplace localStorage
    persistSession: true,
    autoRefreshToken: true,
  }
});