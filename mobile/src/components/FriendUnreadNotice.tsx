import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { backend } from "../lib/backend";
import { useApp } from "../lib/state";
import { communityCopy } from "../lib/community-copy";
import { Body, Button, Card } from "./quiet-ui";

export default function FriendUnreadNotice() {
  const { profile } = useApp();
  const [items, setItems] = useState<
    { link_id: string; name: string; unread: number; latest_at: string }[]
  >([]);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = () => {
        if (!backend) return;
        void Promise.resolve(backend.rpc("friend_unread_list"))
          .then(({ data, error }) => {
            if (active && !error) setItems(data ?? []);
          })
          .catch(() => {});
      };
      load();
      const timer = setInterval(load, 30000);
      return () => {
        active = false;
        clearInterval(timer);
      };
    }, []),
  );
  return (
    <>
      {items.map((item) => (
        <Card key={item.link_id}>
          <Body>
            {item.name} ·{" "}
            {communityCopy(
              profile.language,
              Number(item.unread) === 1 ? "oneUnreadMessage" : "unreadMessages",
            ).replace("{count}", String(item.unread))}
          </Body>
          <Body small>
            {new Date(item.latest_at).toLocaleString(profile.language, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </Body>
          <Button
            secondary
            title={communityCopy(profile.language, "openPrivateChats")}
            onPress={() =>
              router.push({
                pathname: "/friends",
                params: { view: "friends", chat: item.link_id },
              })
            }
          />
        </Card>
      ))}
    </>
  );
}
