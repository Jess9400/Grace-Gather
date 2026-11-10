import { copy, type Tradition } from "../lib/content";
import { router } from "expo-router";
import { loadSoundOn, saveSoundOn } from "../lib/church-audio";
import { requestChurchTour } from "../lib/church-entrance";
import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import {
  Screen,
  Heading,
  Body,
  Button,
  Card,
  Chip,
  Notice,
  colors,
} from "../components/quiet-ui";
import { TextAction } from "../components/CommunityControls";
import { useApp } from "../lib/state";
import { welcomesCandles } from "../lib/church-calendar";
import { useInterfaceCopy } from "../lib/use-interface-copy";

// One choice per row: a label, then chips or a switch. Everything fits on one
// screen, and each change saves as soon as it is made.
function Setting({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <View style={s.setting}>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={s.title}>{title}</Text>
        {!!hint && <Text style={s.hint}>{hint}</Text>}
      </View>
      {children}
    </View>
  );
}
export default function Practices() {
  const { profile, saveProfile } = useApp();
  const tr = useInterfaceCopy();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [sound, setSound] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    void loadSoundOn().then((on) => {
      if (active) setSound(on);
    });
    return () => {
      active = false;
    };
  }, []);
  async function save(change: Partial<typeof profile>) {
    setBusy(true);
    setError("");
    try {
      await saveProfile({ ...profile, ...change });
    } catch {
      setError(tr("Could not save. Please try again."));
    } finally {
      setBusy(false);
    }
  }
  const lighting = profile.churchLighting ?? "auto";
  return (
    <Screen back>
      <Heading>{tr("Church preferences")}</Heading>
      <Card>
        <Text style={s.title}>{tr("Tradition")}</Text>
        <View style={s.chips}>
          {(["catholic", "protestant", "orthodox"] as Tradition[]).map(
            (tradition) => (
              <Chip
                key={tradition}
                title={copy(profile.language, tradition)}
                selected={profile.faithChoice === tradition}
                onPress={() => {
                  if (!busy) void save({ tradition, faithChoice: tradition });
                }}
              />
            ),
          )}
        </View>
        <Text style={s.hint}>
          {tr(
            "Your choice updates your church background and Scripture tradition.",
          )}
        </Text>
      </Card>
      <Card>
        <Text style={s.title}>{tr("Lighting")}</Text>
        <View style={s.chips}>
          {(
            [
              ["auto", "Automatic"],
              ["day", "Day"],
              ["night", "Night"],
            ] as const
          ).map(([value, title]) => (
            <Chip
              key={value}
              title={tr(title)}
              selected={lighting === value}
              onPress={() => {
                if (!busy) void save({ churchLighting: value });
              }}
            />
          ))}
        </View>
        <View style={s.line} />
        <Setting
          title={tr("Church sounds")}
          hint={tr("Only on Home, after the entrance.")}
        >
          <Switch
            accessibilityLabel={tr("Church sounds")}
            disabled={sound === null}
            value={sound === true}
            onValueChange={(next) => {
              setSound(next);
              void saveSoundOn(next);
            }}
          />
        </Setting>
        <View style={s.line} />
        <Setting title={tr("Candle recommendations")}>
          <Switch
            accessibilityLabel={tr("Candle recommendations")}
            disabled={busy}
            value={welcomesCandles(profile)}
            onValueChange={(next) => void save({ candlePractice: next })}
          />
        </Setting>
      </Card>
      <Body small>
        {tr(
          "Your tradition sets a starting point. Choose the practices that feel meaningful to you.",
        )}
      </Body>
      <Notice text={error} />
      <Button
        title={tr("Back to church")}
        onPress={() => router.replace("/(tabs)")}
      />
      <View style={{ alignSelf: "center" }}>
        <TextAction
          title={tr("Show me around the church")}
          onPress={() => {
            requestChurchTour();
            router.push("/(tabs)");
          }}
        />
      </View>
    </Screen>
  );
}
const s = StyleSheet.create({
  title: { fontSize: 16, lineHeight: 22, fontWeight: "600", color: colors.ink },
  hint: { fontSize: 13, lineHeight: 19, color: colors.muted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  setting: { flexDirection: "row", alignItems: "center", gap: 12 },
  line: { height: 1, backgroundColor: colors.line },
});
