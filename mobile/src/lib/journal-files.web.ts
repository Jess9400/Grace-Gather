export async function printJournal(html: string) {
  // Open synchronously from the button click. No server, upload or external fonts.
  const preview = window.open("", "_blank");
  if (!preview) throw Error("Allow the print window to open.");
  preview.opener = null;
  preview.document.open();
  preview.document.write(html);
  preview.document.close();
  preview.focus();
  preview.print();
}
export async function shareJournalBackup(uri: string) {
  const link = document.createElement("a");
  link.href = uri;
  link.download = "grace-and-gather-backup.bin";
  document.body.appendChild(link);
  link.click();
  link.remove();
}
