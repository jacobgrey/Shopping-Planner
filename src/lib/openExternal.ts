import { openUrl } from "@tauri-apps/plugin-opener";

/** Open a URL in the user's default browser. */
export async function openExternal(url: string): Promise<void> {
  try {
    await openUrl(url);
  } catch {
    // Fallback: try window.open
    window.open(url, "_blank");
  }
}
