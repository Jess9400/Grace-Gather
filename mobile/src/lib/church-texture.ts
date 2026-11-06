import { Asset } from "expo-asset";
import { Platform } from "react-native";

// The church doors, pews and confessional share the bundled walnut albedo
// created for the Confession room (see assets/confession/README.md).
let prepared: Promise<TexImageSource> | undefined;
export function prepareChurchTimber(): Promise<TexImageSource> {
  if (!prepared)
    prepared = (async () => {
      const asset = Asset.fromModule(
        require("../../assets/confession/walnut-albedo.jpg"),
      );
      await asset.downloadAsync();
      if (Platform.OS === "web") {
        const image = new window.Image();
        image.src = asset.localUri || asset.uri;
        await image.decode();
        return image;
      }
      if (!asset.localUri) throw Error("Bundled timber texture unavailable");
      // Expo GL accepts a downloaded Asset's file URI in place of a DOM image.
      return { localUri: asset.localUri } as unknown as TexImageSource;
    })().catch((error) => {
      prepared = undefined;
      throw error;
    });
  return prepared;
}
