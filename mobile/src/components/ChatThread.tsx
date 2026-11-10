import { useRef, useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Notice, colors, serif } from "./quiet-ui";
import { TextAction } from "./CommunityControls";
import { avatarColor, initial } from "../lib/people-theme";

export type ThreadMessage = {
  id: string;
  body: string;
  mine: boolean;
  created_at?: string;
  name?: string;
  // A short line under the words, e.g. that a message is still being checked.
  note?: string;
};

// One conversation, for a group room or a friend: a tinted header, bubbles
// (other people on the left with their initial, yours dark on the right) and a
// message box that stays above the keyboard.
export default function ChatThread({
  title,
  subtitle,
  tint,
  rule,
  backLabel,
  onBack,
  menu,
  menuLabel,
  messages,
  peerName,
  myName,
  locale,
  empty,
  onOlder,
  olderLabel,
  actionsHint,
  renderActions,
  renderOwnActions,
  notice,
  extraNotice,
  composer,
  placeholder,
  sendLabel,
  maxLength,
  busy,
  onSend,
}: {
  title: string;
  subtitle: string;
  // The room's colour; friend chats leave it white.
  tint?: string;
  rule: string;
  backLabel: string;
  onBack: () => void;
  // Less common actions (refresh, remove, block) behind the "more" button.
  menu?: { title: string; onPress: () => void }[];
  menuLabel: string;
  messages: ThreadMessage[];
  // In a friend chat every other message is from this person.
  peerName?: string;
  // The public name you write under, shown on your own messages.
  myName?: string;
  locale: string;
  empty: string;
  onOlder?: () => void;
  olderLabel: string;
  // What tapping someone else's message offers, and the controls for it.
  actionsHint: string;
  renderActions: (message: ThreadMessage, close: () => void) => ReactNode;
  // The same for your own messages (e.g. delete); without it they are not tappable.
  renderOwnActions?: (message: ThreadMessage, close: () => void) => ReactNode;
  notice: string;
  extraNotice?: string;
  // Shown in place of the message box, e.g. choosing a public name first.
  composer?: ReactNode;
  placeholder: string;
  sendLabel: string;
  maxLength: number;
  busy: boolean;
  // Resolves true when the message was sent, so the draft can be cleared.
  onSend: (text: string) => Promise<boolean>;
}) {
  const scroll = useRef<ScrollViewInstance>(null);
  const lastSeen = useRef<string | undefined>(undefined);
  const [draft, setDraft] = useState(""),
    [menuOpen, setMenuOpen] = useState(false),
    [selected, setSelected] = useState<string | null>(null);
  const newest = messages.at(-1)?.id;
  const when = (iso?: string) =>
    iso &&
    new Date(iso).toLocaleString(locale, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    if (await onSend(text)) setDraft("");
  }
  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[s.head, tint ? { backgroundColor: tint } : s.headPlain]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={backLabel}
            onPress={onBack}
            style={({ pressed }) => [s.back, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.goldInk} />
            <Text style={s.backText}>{backLabel}</Text>
          </Pressable>
          <View style={s.titles}>
            <Text accessibilityRole="header" numberOfLines={1} style={s.title}>
              {title}
            </Text>
            <Text numberOfLines={1} style={s.subtitle}>
              {subtitle}
            </Text>
          </View>
          {!!menu?.length && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={menuLabel}
              accessibilityState={{ expanded: menuOpen }}
              onPress={() => setMenuOpen(!menuOpen)}
              style={({ pressed }) => [s.more, pressed && { opacity: 0.6 }]}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={22}
                color={colors.ink}
              />
            </Pressable>
          )}
        </View>
        {menuOpen && (
          <View style={s.menu}>
            {menu!.map((item) => (
              <TextAction
                key={item.title}
                title={item.title}
                disabled={busy}
                onPress={() => {
                  setMenuOpen(false);
                  item.onPress();
                }}
              />
            ))}
          </View>
        )}
        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          contentContainerStyle={s.stream}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            // Follow the conversation when a new message arrives, not when
            // older ones are loaded above.
            if (newest !== lastSeen.current) {
              lastSeen.current = newest;
              scroll.current?.scrollToEnd({ animated: false });
            }
          }}
        >
          <Text style={s.rule}>{rule}</Text>
          {onOlder && (
            <View style={{ alignSelf: "center" }}>
              <TextAction
                title={olderLabel}
                disabled={busy}
                onPress={onOlder}
              />
            </View>
          )}
          {messages.length === 0 && <Text style={s.rule}>{empty}</Text>}
          {messages.map((m) => {
            const name = m.name || peerName || "";
            if (m.mine) {
              const mine = m.name || myName || "";
              const bubble = (
                <>
                  {!!mine && <Text style={s.myName}>{mine}</Text>}
                  <Text
                    selectable={!renderOwnActions}
                    style={[s.text, { color: colors.paper }]}
                  >
                    {m.body}
                  </Text>
                  {!!m.note && <Text style={s.myNote}>{m.note}</Text>}
                  {!!m.created_at && (
                    <Text style={[s.time, { color: "#D8CDB9" }]}>
                      {when(m.created_at)}
                    </Text>
                  )}
                </>
              );
              return (
                <View key={m.id} style={{ gap: 6 }}>
                  <View style={s.mineRow}>
                    {renderOwnActions ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${mine}: ${m.body}`}
                        accessibilityState={{ expanded: selected === m.id }}
                        onPress={() =>
                          setSelected(selected === m.id ? null : m.id)
                        }
                        style={[s.bubble, s.mine]}
                      >
                        {bubble}
                      </Pressable>
                    ) : (
                      <View style={[s.bubble, s.mine]}>{bubble}</View>
                    )}
                    {!!mine && (
                      <View
                        accessible={false}
                        style={[
                          s.avatar,
                          { backgroundColor: avatarColor(mine) },
                        ]}
                      >
                        <Text style={s.avatarText}>{initial(mine)}</Text>
                      </View>
                    )}
                  </View>
                  {selected === m.id && renderOwnActions && (
                    <View style={[s.actions, s.ownActions]}>
                      {renderOwnActions(m, () => setSelected(null))}
                    </View>
                  )}
                </View>
              );
            }
            return (
              <View key={m.id} style={{ gap: 6 }}>
                <View style={s.theirRow}>
                  <View
                    accessible={false}
                    style={[s.avatar, { backgroundColor: avatarColor(name) }]}
                  >
                    <Text style={s.avatarText}>{initial(name)}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${name}: ${m.body}`}
                    accessibilityHint={actionsHint}
                    accessibilityState={{ expanded: selected === m.id }}
                    onPress={() => setSelected(selected === m.id ? null : m.id)}
                    style={[s.bubble, s.theirs]}
                  >
                    {!!m.name && <Text style={s.name}>{m.name}</Text>}
                    <Text style={s.text}>{m.body}</Text>
                    {!!m.created_at && (
                      <Text style={s.time}>{when(m.created_at)}</Text>
                    )}
                  </Pressable>
                </View>
                {selected === m.id && (
                  <View style={s.actions}>
                    {renderActions(m, () => setSelected(null))}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
        <View style={s.foot}>
          <Notice text={notice} />
          {!!extraNotice && <Notice text={extraNotice} />}
          {composer ?? (
            <View style={s.composer}>
              <TextInput
                accessibilityLabel={placeholder}
                placeholder={placeholder}
                placeholderTextColor={colors.muted}
                value={draft}
                onChangeText={setDraft}
                maxLength={maxLength}
                multiline
                editable={!busy}
                style={s.input}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={sendLabel}
                accessibilityState={{ disabled: busy || !draft.trim() }}
                disabled={busy || !draft.trim()}
                onPress={() => void send()}
                style={[s.send, (busy || !draft.trim()) && { opacity: 0.4 }]}
              >
                <Ionicons name="arrow-forward" size={20} color={colors.paper} />
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    paddingLeft: 8,
    paddingRight: 12,
  },
  headPlain: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: "#EDE6D8",
  },
  back: {
    minHeight: 44,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  backText: { fontSize: 15, fontWeight: "600", color: colors.goldInk },
  titles: { flex: 1, minWidth: 0, gap: 1 },
  title: { fontFamily: serif, fontSize: 19, lineHeight: 24, color: colors.ink },
  subtitle: { fontSize: 12, lineHeight: 16, color: colors.muted },
  more: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  menu: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#EDE6D8",
    backgroundColor: colors.white,
  },
  stream: {
    padding: 16,
    paddingBottom: 12,
    gap: 12,
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
  },
  rule: {
    alignSelf: "center",
    maxWidth: 300,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
    marginBottom: 4,
  },
  theirRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  mineRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    gap: 8,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 12, fontWeight: "700", color: colors.ink },
  bubble: {
    maxWidth: "78%",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    gap: 2,
  },
  theirs: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: 6,
    boxShadow: "0px 2px 8px rgba(48,44,40,0.06)",
  },
  mine: { backgroundColor: colors.ink, borderBottomRightRadius: 6 },
  name: { fontSize: 12, fontWeight: "700", color: colors.goldInk },
  myName: { fontSize: 12, fontWeight: "700", color: "#E9C98A" },
  myNote: {
    fontSize: 12,
    lineHeight: 17,
    color: "#E9C98A",
    fontStyle: "italic",
  },
  ownActions: { marginLeft: 0, marginRight: 38 },
  text: { fontSize: 15, lineHeight: 22, color: colors.ink },
  time: { fontSize: 11, lineHeight: 15, color: colors.muted },
  actions: {
    marginLeft: 38,
    padding: 14,
    gap: 10,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  foot: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.paper,
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
  },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    maxHeight: 120,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    color: colors.ink,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: "center",
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
  },
});
