export type StorePlan = {
  id: string;
  kind: "monthly" | "yearly";
  price: string;
  trialDays: number;
  trialEligible: boolean;
};
export async function storePlans(): Promise<StorePlan[]> {
  return [];
}
export async function purchasePlan(_id: string): Promise<void> {
  throw Error("purchases_unavailable");
}
export async function restorePurchases(): Promise<void> {
  throw Error("purchases_unavailable");
}
export async function managePurchases(): Promise<void> {
  throw Error("purchases_unavailable");
}
