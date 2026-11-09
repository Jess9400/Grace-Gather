import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { File } from "expo-file-system";
export async function printJournal(html: string) {
  const result = await Print.printToFileAsync({ html });
  try {
    await Sharing.shareAsync(result.uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: "Grace & Gather",
    });
  } finally {
    const file = new File(result.uri);
    if (file.exists) file.delete();
  }
}
export async function shareJournalBackup(uri: string) {
  await Sharing.shareAsync(uri, {
    mimeType: "application/octet-stream",
    dialogTitle: "Grace & Gather",
  });
}
