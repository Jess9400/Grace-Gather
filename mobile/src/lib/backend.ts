import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as storage from "./storage";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const backend =
  url && key
    ? createClient(url, key, {
        auth: {
          storage,
          persistSession: storage.persistent,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;
export function requireBackend() {
  if (!backend)
    throw new Error(
      "Account services are not connected yet. Your private journal is available.",
    );
  return backend;
}
export async function requireUser() {
  const client = requireBackend();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user)
    throw new Error("Sign in to take part in the community.");
  return { client, user: data.user };
}
