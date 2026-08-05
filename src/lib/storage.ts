// The storage seam.
//
// THIS FILE IS THE WHOLE POINT of the port. The site's supabaseClient.ts and
// portalClient.ts are ~1,400 lines of plain fetch and cache logic with no DOM
// in them — except that they reach for `localStorage` directly. Give them this
// interface instead and both run unchanged on a phone.
//
// Two stores, because two kinds of thing:
//
//   secure   the GoTrue token pair. Goes to the OS keychain / Keystore via
//            expo-secure-store, so it survives app restarts but not a device
//            handover, and never lands in a plaintext backup.
//   cache    the portal's working model (`rr-account`, `rr-account-state`).
//            Not secret — it is a mirror of rows the server will re-serve —
//            so AsyncStorage, which is faster and has no 2KB value ceiling.
//
// SecureStore *does* have a practical value ceiling (~2KB on iOS) and refuses
// keys outside [A-Za-z0-9._-]. Both are fine for tokens and for nothing else,
// which is why the split is enforced by the interface rather than by comment.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

export type Store = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
};

/** Keychain-backed. Tokens only. */
export const secure: Store = {
  async get(key) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      // A corrupt or unreadable keychain entry is a signed-out state, not a
      // crash — the reader signs in again and it is overwritten.
      return null;
    }
  },
  async set(key, value) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {}
  },
  async remove(key) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {}
  },
};

/** Plain device storage. The portal's cached working model. */
export const cache: Store = {
  async get(key) {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  async remove(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

/** Everything this reader owns on this device. Sign-out calls it. */
export async function clearAll(keys: { secure: string[]; cache: string[] }) {
  await Promise.all([
    ...keys.secure.map((k) => secure.remove(k)),
    ...keys.cache.map((k) => cache.remove(k)),
  ]);
}
