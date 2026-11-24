import { useEffect } from "react";
import Constants from "expo-constants";
import { ExtensionStorage } from "@bacons/apple-targets";

export function useVerseWidget(edition: string | null | undefined) {
  useEffect(() => {
    const bundle = Constants.expoConfig?.ios?.bundleIdentifier;
    if (!bundle || edition === undefined) return;
    const storage = new ExtensionStorage(`group.${bundle}.dailyverse`);
    if (storage.get("edition") === edition) return;
    if (edition) storage.set("edition", edition);
    else storage.remove("edition");
    ExtensionStorage.reloadWidget("DailyVerse");
  }, [edition]);
}
