import { membershipPresentation } from "../lib/membership-presentation";
import BrandMark from "./BrandMark";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Platform,
  Modal,
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
  AppState,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../lib/state";
import {
  closeUpgrade,
  onUpgrade,
  upgradeSnapshot,
  membershipStatus,
  subscribeMembershipAccount,
  type Membership,
} from "../lib/membership";
import {
  storePlans,
  purchasePlan,
  restorePurchases,
  managePurchases,
  type StorePlan,
} from "../lib/purchases";
import copy from "../lib/membership-copy.json";
import { colors, serif } from "./quiet-ui";
export default function ProPaywall() {
  const { profile } = useApp();
  const c = copy[profile.language];
  const reason = useSyncExternalStore(onUpgrade, upgradeSnapshot, () => null);
  const [member, setMember] = useState<Membership | null>(null),
    [plans, setPlans] = useState<StorePlan[]>([]),
    [chosen, setChosen] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(false);
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const ticket = ++sequence.current;
    setLoading(true);
    setNotice("");
    setMember(null);
    setPlans([]);
    try {
      const m = await membershipStatus();
      if (ticket !== sequence.current) return;
      setMember(m);
      const p =
        Platform.OS === "ios" && !m.admin && m.plan !== "pro"
          ? await storePlans().catch(() => [])
          : [];
      if (ticket !== sequence.current) return;
      setPlans(p);
      setChosen(p.find((x) => x.kind === "monthly")?.id ?? p[0]?.id ?? "");
    } catch {
      if (ticket === sequence.current) setNotice(c.statusUnavailable);
    } finally {
      if (ticket === sequence.current) setLoading(false);
    }
  }, [c]);
  useEffect(() => {
    let active = true;
    if (reason)
      void Promise.resolve().then(() => {
        if (active) return load();
      });
    return () => {
      active = false;
    };
  }, [reason, load]);
  useEffect(() => {
    const sub = subscribeMembershipAccount(() => {
      sequence.current++;
      setMember(null);
      setPlans([]);
      closeUpgrade();
    });
    return () => sub?.unsubscribe();
  }, []);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && reason) void load();
    });
    return () => sub.remove();
  }, [reason, load]);
  const selected = plans.find((p) => p.id === chosen);
  const limit =
    reason === "study_monthly_limit"
      ? c.studyLimit
      : reason === "journal_entry_limit"
        ? c.entryLimit
        : reason === "journal_followup_limit"
          ? c.followupLimit
          : null;
  const reset =
    reason === "study_monthly_limit" ? member?.studyResetsAt : member?.resetsAt;
  const view = membershipPresentation(reason, member, Platform.OS);
  const paid = view.paid;
  async function purchase(restore = false) {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      if (restore) await restorePurchases();
      else await purchasePlan(chosen);
      const value = await membershipStatus();
      setMember(value);
      if (value.plan === "pro" || value.admin) closeUpgrade();
      else setNotice(c.none);
    } catch (error) {
      if (!(
        error &&
        typeof error === "object" &&
        "userCancelled" in error &&
        error.userCancelled
      ))
        setNotice(c.failed);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      transparent
      visible={!!reason}
      animationType="fade"
      onRequestClose={closeUpgrade}
    >
      <View style={s.scrim}>
        <View style={s.sheet} accessibilityViewIsModal>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={c.close}
            onPress={closeUpgrade}
            style={s.close}
          >
            <Ionicons name="close" size={23} color={colors.ink} />
          </Pressable>
          <ScrollView contentContainerStyle={s.content}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <BrandMark size={32} />
              <Text style={s.eyebrow}>GRACE &amp; GATHER · PRO</Text>
            </View>
            <Text style={s.title} accessibilityRole="header">
              {limit ?? (reason === "membership" ? c.membership : c.title)}
            </Text>
            {limit && reset && (
              <Text style={s.description}>
                {c.reset.replace(
                  "{date}",
                  new Date(reset).toLocaleString(profile.language, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                )}
              </Text>
            )}
            {view.paused ? (
              <Pressable
                accessibilityRole="button"
                onPress={closeUpgrade}
                style={s.textAction}
              >
                <Text style={s.link}>{c.done}</Text>
              </Pressable>
            ) : (
              <>
                <Text style={s.description}>
                  {member?.admin
                    ? c.adminStatus
                    : paid
                      ? c.active
                      : reason === "membership" && member
                        ? c.freeStatus
                        : c.intro}
                </Text>
                {paid && !member?.admin && member?.expiresAt && (
                  <Text style={s.description}>
                    {c.accessUntil.replace(
                      "{date}",
                      new Date(member.expiresAt).toLocaleDateString(
                        profile.language,
                      ),
                    )}
                  </Text>
                )}
                <View style={s.benefits}>
                  {[c.tools, c.journal, c.study].map((text, i) => (
                    <View key={text} style={s.benefit}>
                      <Ionicons
                        name={
                          (
                            [
                              "library-outline",
                              "book-outline",
                              "chatbubbles-outline",
                            ] as const
                          )[i]
                        }
                        size={20}
                        color={colors.goldInk}
                      />
                      <Text style={s.benefitText}>{text}</Text>
                    </View>
                  ))}
                </View>
                {loading ? (
                  <ActivityIndicator color={colors.goldInk} />
                ) : (
                  view.showOffers && (
                    <>
                      <View style={s.plans}>
                        {plans.map((plan) => (
                          <Pressable
                            key={plan.id}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: chosen === plan.id }}
                            onPress={() => setChosen(plan.id)}
                            style={[s.plan, chosen === plan.id && s.selected]}
                          >
                            <Text style={s.planLabel}>
                              {plan.kind === "monthly" ? c.monthly : c.yearly}
                            </Text>
                            <Text style={s.price}>{plan.price}</Text>
                            <Text style={s.muted}>
                              {plan.kind === "monthly"
                                ? c.monthlyUnit
                                : c.yearlyUnit}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      {!!selected && (
                        <>
                          <Pressable
                            disabled={busy}
                            onPress={() => void purchase()}
                            style={s.cta}
                            accessibilityRole="button"
                          >
                            {busy ? (
                              <ActivityIndicator color={colors.paper} />
                            ) : (
                              <Text style={s.ctaLabel}>
                                {selected.trialDays === 3 &&
                                selected.trialEligible
                                  ? c.trial
                                  : c.continue}
                              </Text>
                            )}
                          </Pressable>
                          <Text style={s.legal}>
                            {selected.trialDays === 3 && selected.trialEligible
                              ? `${c.trial}. ${selected.price} ${selected.kind === "monthly" ? c.monthlyUnit : c.yearlyUnit}. `
                              : ""}
                            {c.renew}
                          </Text>
                        </>
                      )}
                      {!plans.length && (
                        <Text style={s.description}>{c.unavailable}</Text>
                      )}
                    </>
                  )
                )}
              </>
            )}
            {view.showWebNotice && (
              <Text style={s.description}>{c.webOnly}</Text>
            )}
            {!!notice && (
              <Text style={s.description} accessibilityRole="alert">
                {notice}
              </Text>
            )}
            {!view.paused && (
              <Text style={s.legal}>
                {c.free} {c.keep}
              </Text>
            )}
            <View style={s.links}>
              {view.showManage && (
                <Pressable
                  onPress={() =>
                    void (
                      Platform.OS === "web"
                        ? Linking.openURL(
                            "https://apps.apple.com/account/subscriptions",
                          )
                        : managePurchases()
                    ).catch(() => setNotice(c.failed))
                  }
                  accessibilityRole="button"
                >
                  <Text style={s.link}>{c.manage}</Text>
                </Pressable>
              )}
              {view.showRestore && (
                <Pressable
                  disabled={busy}
                  onPress={() => void purchase(true)}
                  accessibilityRole="button"
                >
                  <Text style={s.link}>{c.restore}</Text>
                </Pressable>
              )}
              {!!notice && (
                <Pressable
                  disabled={loading || busy}
                  onPress={() => void load()}
                  accessibilityRole="button"
                >
                  <Text style={s.link}>{c.retry}</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() =>
                  void Linking.openURL("https://graceandgather.online/terms")
                }
                accessibilityRole="link"
              >
                <Text style={s.link}>{c.terms}</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  void Linking.openURL("https://graceandgather.online/privacy")
                }
                accessibilityRole="link"
              >
                <Text style={s.link}>{c.privacy}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  textAction: { alignSelf: "flex-start", paddingVertical: 4 },
  scrim: {
    flex: 1,
    backgroundColor: "#0009",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  sheet: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "92%",
    borderRadius: 28,
    backgroundColor: colors.paper,
    overflow: "hidden",
  },
  content: { padding: 26, paddingTop: 55, gap: 20 },
  close: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  eyebrow: { color: colors.goldInk, fontSize: 11, letterSpacing: 2 },
  title: { fontFamily: serif, color: colors.ink, fontSize: 32, lineHeight: 39 },
  description: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  benefits: { gap: 18 },
  benefit: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  benefitText: { color: colors.ink, fontSize: 15, lineHeight: 22, flex: 1 },
  plans: { flexDirection: "row", gap: 12 },
  plan: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#B7A99344",
    gap: 7,
    backgroundColor: colors.pale,
  },
  selected: { borderColor: colors.goldInk },
  planLabel: { color: colors.ink, fontSize: 14 },
  price: { color: colors.ink, fontSize: 22, fontWeight: "600" },
  muted: { color: colors.muted, fontSize: 12 },
  cta: {
    backgroundColor: colors.green,
    padding: 17,
    borderRadius: 16,
    alignItems: "center",
  },
  ctaLabel: { color: colors.paper, fontWeight: "600", fontSize: 16 },
  legal: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  links: { flexDirection: "row", gap: 18, flexWrap: "wrap" },
  link: {
    color: colors.muted,
    fontSize: 12,
    textDecorationLine: "underline",
    paddingVertical: 8,
  },
});
