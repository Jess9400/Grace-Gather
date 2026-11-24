import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { usePathname } from "expo-router";
import Store from "expo-sqlite/kv-store";
import * as StoreReview from "expo-store-review";
import { useCommunity } from "../lib/discussion-state";
import { inBibleStudy, readyForRating, recordVisit, type RatingHistory } from "../lib/app-rating";

function visit(key: string) {
  const raw = Store.getItemSync(key);
  const previous: RatingHistory | null = raw ? JSON.parse(raw) : null;
  const current = recordVisit(previous, new Date());
  if (current !== previous) Store.setItemSync(key, JSON.stringify(current));
  return current;
}

function RatingForMember({ member }: { member: string }) {
  const path = usePathname();
  const studying = useRef(false);
  const key = "app-rating-v1." + member;

  useEffect(() => {
    const onActive = () => {
      try { visit(key); } catch { /* Optional prompt; storage failure skips it. */ }
    };
    if (AppState.currentState === "active") onActive();
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") onActive();
    });
    return () => subscription.remove();
  }, [key]);

  useEffect(() => {
    const returnedHome = path === "/" && studying.current;
    studying.current = inBibleStudy(path, studying.current);
    if (!returnedHome || AppState.currentState !== "active") return;

    let cancelled = false;
    const requestIfEligible = async () => {
      try {
        if (!readyForRating(visit(key), new Date()) || !(await StoreReview.isAvailableAsync())) return;
        if (cancelled || AppState.currentState !== "active") return;
        // Apple does not disclose whether the sheet appeared. Count the attempt once.
        const history = visit(key);
        if (history.requested) return;
        Store.setItemSync(key, JSON.stringify({ ...history, requested: true }));
        await StoreReview.requestReview();
      } catch { /* Keep Home usable if the store or ratings service is unavailable. */ }
    };
    const timer = setTimeout(() => void requestIfEligible(), 1800);
    const subscription = AppState.addEventListener("change", state => {
      if (state !== "active") { cancelled = true; clearTimeout(timer); }
    });
    return () => { cancelled = true; clearTimeout(timer); subscription.remove(); };
  }, [key, path]);

  return null;
}

export default function AppRatingListener() {
  const { userId } = useCommunity();
  return userId ? <RatingForMember key={userId} member={userId} /> : null;
}
