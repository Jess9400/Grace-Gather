import { useCallback, useEffect, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { backend } from "../lib/backend";
import { useApp } from "../lib/state";
import { communityCopy } from "../lib/community-copy";
import { Body, Button, Card } from "./quiet-ui";
import { Ionicons } from "@expo/vector-icons";

export default function FriendUnreadNotice({
  onLoadError,
  retry = 0,
}: {
  onLoadError?: (failed: boolean) => void;
  retry?: number;
}) {
  const { profile } = useApp();
  const [items, setItems] = useState<
    { link_id: string; name: string; unread: number; latest_at: string }[]
  >([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    onLoadError?.(error);
  }, [error, onLoadError]);
  useFocusEffect(
    useCallback(() => {
      void retry; // A retry remounts this focus subscription and fetches again.
      let active = true;
      const load = () => {
        if (!backend) return;
        void Promise.resolve(backend.rpc("friend_unread_list"))
          .then(({ data, error }) => {
            if (active) {
              setError(!!error);
              if (!error) setItems(data ?? []);
            }
          })
          .catch(() => {
            if (active) setError(true);
          });
      };
      load();
      const timer = setInterval(load, 30000);
      return () => {
        active = false;
        clearInterval(timer);
      };
    }, [retry]),
  );
  return (
    <>
      {items.map((item) => (
        <Card key={item.link_id}>
          <Body small>
            <Ionicons name="chatbubble-outline" size={15} accessible={false} />
            {"  "}
            {
              { en: "Message", pt: "Mensagem", es: "Mensaje", ru: "Сообщение" }[
                profile.language
              ]
            }
          </Body>
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
