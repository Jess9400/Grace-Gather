import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/** The prototype’s quiet account-menu button; member avatars stay separate. */
export default function ProfileMenuIcon() {
  return (
    <View accessible={false} pointerEvents="none" style={{
      width: 43, height: 43, borderRadius: 22,
      backgroundColor: "#322A22", borderWidth: 1, borderColor: "#EAD6A257",
      alignItems: "center", justifyContent: "center",
    }}>
      <Ionicons name="person-circle-outline" size={28} color="#EDCF89" />
    </View>
  );
}
