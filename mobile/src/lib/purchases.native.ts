import Purchases, {
  INTRO_ELIGIBILITY_STATUS,
  type PurchasesPackage,
} from "react-native-purchases";
import { Platform, Linking } from "react-native";
import { requireUser } from "./backend";
import { syncPurchases } from "./membership";
import type { StorePlan } from "./purchases";
let configured = false;
let packages: PurchasesPackage[] = [];
let queue: Promise<unknown> = Promise.resolve();
async function account() {
  const { user } = await requireUser();
  const key =
    Platform.OS === "ios"
      ? process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY;
  if (!key) throw Error("purchases_unavailable");
  if (!configured) {
    Purchases.configure({ apiKey: key, appUserID: user.id });
    configured = true;
  } else if ((await Purchases.getAppUserID()) !== user.id)
    await Purchases.logIn(user.id);
  return user.id;
}
function serialized<T>(action: () => Promise<T>): Promise<T> {
  const pending = queue.then(action, action);
  queue = pending.catch(() => {});
  return pending;
}
export async function storePlans(): Promise<StorePlan[]> {
  return serialized(async () => {
    await account();
    const offer = (await Purchases.getOfferings()).current;
    packages = (offer?.availablePackages ?? []).filter((p) =>
      ["MONTHLY", "ANNUAL"].includes(p.packageType),
    );
    const eligibility =
      await Purchases.checkTrialOrIntroductoryPriceEligibility(
        packages.map((p) => p.product.identifier),
      );
    return packages.map((p) => {
      const intro = p.product.introPrice;
      return {
        id: p.identifier,
        kind:
          p.packageType === "ANNUAL"
            ? ("yearly" as const)
            : ("monthly" as const),
        price: p.product.priceString,
        trialDays:
          intro?.price === 0 && intro.periodUnit === "DAY"
            ? intro.periodNumberOfUnits
            : 0,
        trialEligible:
          eligibility[p.product.identifier]?.status ===
          INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE,
      };
    });
  });
}
export async function purchasePlan(id: string) {
  return serialized(async () => {
    const owner = await account();
    const chosen = packages.find((p) => p.identifier === id);
    if (!chosen) throw Error("purchases_unavailable");
    await Purchases.purchasePackage(chosen);
    if ((await requireUser()).user.id !== owner) throw Error("account_changed");
    await syncPurchases();
  });
}
export async function restorePurchases() {
  return serialized(async () => {
    const owner = await account();
    await Purchases.restorePurchases();
    if ((await requireUser()).user.id !== owner) throw Error("account_changed");
    await syncPurchases();
  });
}
export async function managePurchases() {
  await account();
  const info = await Purchases.getCustomerInfo();
  if (info.managementURL) await Linking.openURL(info.managementURL);
  else if (Platform.OS === "ios")
    await Linking.openURL("https://apps.apple.com/account/subscriptions");
}
