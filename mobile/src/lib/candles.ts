import { useSyncExternalStore } from "react";
import * as storage from "./storage";
import { localDay } from "./church-calendar";

export type CandleIntention = "me" | "love" | "memory" | "carry" | "thanks";
export type Candle = {
  id: string;
  intention: CandleIntention;
  name: string;
  litAt: string;
};

// Candles burn until midnight. They are kept in the same encrypted on-device
// storage as the journal and are never sent anywhere.
const KEY = "church-candles";
let candles: Candle[] = [];
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

function today(list: Candle[]) {
  const day = localDay(new Date());
  return list.filter((c) => localDay(new Date(c.litAt)) === day);
}

export async function loadCandles() {
  if (loaded) return;
  loaded = true;
  try {
    const stored = await storage.getItem(KEY);
    if (stored) {
      candles = today(JSON.parse(stored) as Candle[]);
      emit();
    }
  } catch {
    candles = [];
  }
}

export async function lightCandle(intention: CandleIntention, name: string) {
  const candle: Candle = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    intention,
    name: name.trim().slice(0, 60),
    litAt: new Date().toISOString(),
  };
  candles = [...today(candles), candle];
  emit();
  try {
    await storage.setItem(KEY, JSON.stringify(candles));
  } catch {
    // The candle still burns for this visit if storage is unavailable.
  }
  return candle;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
const snapshot = () => candles;

export function useCandles() {
  const all = useSyncExternalStore(subscribe, snapshot, snapshot);
  return today(all);
}
