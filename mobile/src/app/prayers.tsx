import {Pressable} from "react-native";
import { useCommunity } from "../lib/discussion-state";
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  Screen,
  Heading,
  Body,
  Card,
  Button,
  Field,
  Notice,
} from "../components/quiet-ui";
import { FilterStrip } from "../components/CommunityControls";
import { usePrayers, type Prayer } from "../lib/prayers";
import { prayerTime } from "../lib/prayer-time";
import { useApp } from "../lib/state";
import { useInterfaceCopy } from "../lib/use-interface-copy";
export default function Prayers() {
  const { userId } = useCommunity();
  return <PrayerRoom key={userId ?? "guest"} />;
}
function PrayerRoom() {
  const { data, error, busy, userId, load, act } = usePrayers();
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),10000);return ()=>clearInterval(timer);},[]);
  const { profile } = useApp(),
    tr = useInterfaceCopy();
  const { compose, tab: initial } = useLocalSearchParams<{
    compose?: string;
    tab?: string;
  }>();
  const [tab, setTab] = useState(initial ?? "requests"),
    [writing, setWriting] = useState(compose === "1");
  const [theme, setTheme] = useState(""),
    [reason, setReason] = useState(""),
    [anonymous, setAnonymous] = useState(true),
    [scheduled, setScheduled] = useState(false),
    [date, setDate] = useState(""),
    [time, setTime] = useState("");
  const [preview, setPreview] = useState(""),
    [when, setWhen] = useState<string | null>(null),
    [notice, setNotice] = useState("");
  const [report, setReport] = useState<string | null>(null),
    [reportText, setReportText] = useState(""),
    [decision, setDecision] = useState("");
  const fingerprint = JSON.stringify([
    theme,
    reason,
    anonymous,
    scheduled,
    date,
    time,
    profile.name,
  ]);
  const format = (at: string) =>
    new Date(at).toLocaleString(profile.language, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  function checkPreview() {
    try {
      setWhen(scheduled ? prayerTime(date, time) : null);
      setPreview(fingerprint);
      setNotice("");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Please try again.");
    }
  }
  async function publish() {
    if (preview !== fingerprint) return;
    if (
      await act("create", null, {
        theme,
        reason,
        alias: anonymous ? "" : profile.name,
        starts_at: when,
      })
    ) {
      setWriting(false);
      setTheme("");
      setReason("");
      setPreview("");
      setTab("mine");
      setNotice("Your request is waiting for review.");
    }
  }
  function card(p: Prayer, review = false) {
    return (
      <Card key={p.id}>
        <Body small>{p.alias || tr("Anonymous member")}</Body>
        <Heading>{p.theme}</Heading>
        <Body>{p.reason}</Body>
        <Body small>
          {p.scheduled ? format(p.starts_at) : tr("Pray whenever you can")}
        </Body>
        <Body>
          {p.own
            ? tr("{count} people prayed for you").replace(
                "{count}",
                String(p.count),
              )
            : tr("{count} people have prayed").replace(
                "{count}",
                String(p.count),
              )}
        </Body>
        {p.own && (
          <>
            <Body small>{tr(p.status)}</Body>
            {!!p.review_reason && <Body>{p.review_reason}</Body>}
            {!["closed", "rejected"].includes(p.status) && (
              <Button
                secondary
                title={tr("Close request")}
                disabled={busy}
                onPress={() => void act("close", p.id)}
              />
            )}
          </>
        )}
        {!p.own && p.status === "approved" && !review && (
          <>
            <Button
              title={tr(
                p.prayed
                  ? "You prayed for this person"
                  : new Date(p.starts_at).getTime() > now
                    ? "Prayer time has not arrived"
                    : "I prayed for you",
              )}
              disabled={
                busy || p.prayed || new Date(p.starts_at).getTime() > now
              }
              onPress={() => void act("pray", p.id)}
            />
            <Button
              secondary
              title={tr("Report")}
              onPress={() => {
                setReport(p.id);
                setReportText("");
              }}
            />
          </>
        )}
        {report === p.id && (
          <>
            <Field
              label={tr("Reason for reporting")}
              value={reportText}
              onChangeText={setReportText}
              maxLength={500}
              multiline
            />
            <Button
              title={tr("Send report")}
              disabled={busy || !reportText.trim()}
              onPress={() =>
                void act("report", p.id, { reason: reportText }).then((ok) => {
                  if (ok) setReport(null);
                })
              }
            />
            <Button
              secondary
              title={tr("Cancel")}
              onPress={() => setReport(null)}
            />
          </>
        )}
        {review && (
          <>
            {p.reports?.map((r, i) => (
              <Body key={i}>{r}</Body>
            ))}
            <Field
              label={tr("Private review explanation")}
              value={decision}
              onChangeText={setDecision}
              maxLength={500}
            />
            {p.status === "pending" && (
              <Button
                title={tr("Approve request")}
                disabled={busy}
                onPress={() => void act("review", p.id, { status: "approved" })}
              />
            )}
            <Button
              secondary
              title={tr("Reject request")}
              disabled={busy || !decision.trim()}
              onPress={() =>
                void act("review", p.id, {
                  status: "rejected",
                  reason: decision,
                })
              }
            />
          </>
        )}
      </Card>
    );
  }
  if (!userId)
    return (
      <Screen back>
        <Heading>{tr("Prayer requests")}</Heading>
        <Body>{tr("Sign in to request a prayer or pray for someone.")}</Body>
        <Button
          title={tr("Account and sign in")}
          onPress={() => router.push("/account")}
        />
      </Screen>
    );
  return (
    <Screen back>
      <Heading>{tr("Prayer requests")}</Heading>
      <Notice text={tr(error || notice)} />
      <Button
        secondary
        title={tr("Refresh")}
        disabled={busy}
        onPress={() => void load()}
      />
      {!writing && (
        <>
          <Button
            title={tr("Request a prayer")}
            onPress={() => {
              setWriting(true);
              setPreview("");
              setNotice("");
            }}
          />
          <Check
            label={tr("Receive prayer notifications in the app")}
            value={data?.enabled ?? false}
            onChange={(v) => {
              if (!busy) void act("preferences", null, { enabled: v });
            }}
          />
          <FilterStrip
            value={tab}
            onChange={setTab}
            options={[
              { value: "requests", label: tr("Pray for others") },
              { value: "mine", label: tr("My requests") },
              { value: "notifications", label: tr("Notifications") },
              ...(data?.moderator
                ? [{ value: "review", label: tr("Review requests") }]
                : []),
            ]}
          />
          {tab === "notifications" && (
            <>
              {!!data?.notices.length && (
                <Button
                  secondary
                  title={tr("Mark all read")}
                  onPress={() => void act("read")}
                />
              )}{" "}
              {data?.notices.map((n) => (
                <Card key={n.id}>
                  <Body>
                    {tr(
                      n.kind === "time"
                        ? "It is time to pray together"
                        : n.kind === "prayed"
                          ? "Someone prayed for you"
                          : "A prayer invitation",
                    )}
                  </Body>
                  {!n.is_read && <Body small>{tr("Unread")}</Body>}
                  {card(n.request)}
                  {!n.is_read && (
                    <Button
                      secondary
                      title={tr("Mark read")}
                      onPress={() => void act("read", n.id)}
                    />
                  )}
                </Card>
              ))}
              {!data?.notices.length && (
                <Body>{tr("No prayer notifications yet.")}</Body>
              )}
            </>
          )}
          {tab !== "notifications" &&
            (tab === "mine"
              ? data?.mine
              : tab === "review"
                ? data?.review
                : data?.requests
            )?.map((p) => card(p, tab === "review"))}
          {data &&
            tab !== "notifications" &&
            !(
              tab === "mine"
                ? data.mine
                : tab === "review"
                  ? data.review
                  : data.requests
            ).length && <Body>{tr("No prayer requests here yet.")}</Body>}
        </>
      )}
      {writing && (
        <>
          <Field
            label={tr("Prayer theme")}
            value={theme}
            onChangeText={setTheme}
            maxLength={80}
          />
          <Field
            label={tr("What would you like prayer for?")}
            value={reason}
            onChangeText={setReason}
            maxLength={1200}
            multiline
          />
          <Check
            label={tr("Share anonymously")}
            value={anonymous}
            onChange={setAnonymous}
          />
          <Check
            label={tr("Choose a shared prayer time")}
            value={scheduled}
            onChange={setScheduled}
          />
          {scheduled && (
            <>
              <Body small>
                {tr("Your local time zone")}:{" "}
                {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </Body>
              <Field
                label={tr("Date (YYYY-MM-DD)")}
                value={date}
                onChangeText={setDate}
                placeholder="2026-11-10"
              />
              <Field
                label={tr("Time (HH:mm, 24-hour)")}
                value={time}
                onChangeText={setTime}
                placeholder="19:00"
              />
            </>
          )}
          <Body small>
            {tr(
              "After review, members can see your theme, reason and time. Anonymous requests remain linked to your account for moderators. Avoid sharing someone else’s private details.",
            )}
          </Body>
          <Button
            secondary
            title={tr("Preview request")}
            disabled={
              !theme.trim() ||
              !reason.trim() ||
              (!anonymous && !profile.name.trim())
            }
            onPress={checkPreview}
          />
          {!anonymous && !profile.name.trim() && (
            <Button
              secondary
              title={tr("Edit profile")}
              onPress={() => router.push("/profile")}
            />
          )}
          {preview === fingerprint && (
            <Card>
              <Body small>
                {anonymous ? tr("Anonymous member") : profile.name}
              </Body>
              <Heading>{theme.trim()}</Heading>
              <Body>{reason.trim()}</Body>
              <Body>{when ? format(when) : tr("Pray whenever you can")}</Body>
              <Button
                title={tr("Share my prayer request")}
                disabled={busy}
                onPress={() => void publish()}
              />
            </Card>
          )}
          <Button
            secondary
            title={tr("Cancel")}
            onPress={() => setWriting(false)}
          />
        </>
      )}
    </Screen>
  );
}

function Check({label,value,onChange}:{label:string;value:boolean;onChange:(value:boolean)=>void}) {return <Pressable accessibilityRole="checkbox" accessibilityState={{checked:value}} accessibilityLabel={label} onPress={()=>onChange(!value)} style={{minHeight:48,justifyContent:"center"}}><Body>{value?"☑":"☐"} {label}</Body></Pressable>;}
