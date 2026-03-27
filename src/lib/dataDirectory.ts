import { readTextFile, writeTextFile, exists, mkdir } from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";

const CONFIG_FILENAME = "config.json";

export interface AppConfig {
  dataDirectory: string;
  firstDayOfWeek?: number; // 0=Monday, 6=Sunday (matches internal dayOfWeek)
}

/** Get the fixed config file path in %APPDATA%/com.meal-planner.app/ */
async function getConfigPath(): Promise<string> {
  const appData = await appDataDir();
  if (!(await exists(appData))) {
    await mkdir(appData, { recursive: true });
  }
  return await join(appData, CONFIG_FILENAME);
}

/** Read the config to get the user's chosen data directory */
export async function getDataDirectory(): Promise<string | null> {
  try {
    const configPath = await getConfigPath();
    if (!(await exists(configPath))) {
      return null;
    }
    const raw = await readTextFile(configPath);
    const config: AppConfig = JSON.parse(raw);
    return config.dataDirectory;
  } catch {
    return null;
  }
}

/** Save the chosen data directory path to config */
export async function setDataDirectory(dir: string): Promise<void> {
  const configPath = await getConfigPath();
  const config: AppConfig = { dataDirectory: dir };
  await writeTextFile(configPath, JSON.stringify(config, null, 2));
}

/** Prompt the user to pick a data directory. Returns the chosen path or null if cancelled. */
export async function promptForDataDirectory(): Promise<string | null> {
  const selected = await open({
    directory: true,
    title: "Choose a folder to store your meal planner data",
  });
  if (typeof selected === "string") {
    return selected;
  }
  return null;
}

/** Get the default data directory path */
export async function getDefaultDataDirectory(): Promise<string> {
  const appData = await appDataDir();
  return await join(appData, "data");
}

/** Read full app config */
export async function getAppConfig(): Promise<AppConfig | null> {
  try {
    const configPath = await getConfigPath();
    if (!(await exists(configPath))) return null;
    const raw = await readTextFile(configPath);
    return JSON.parse(raw) as AppConfig;
  } catch {
    return null;
  }
}

/** Update app config (merges with existing) */
export async function updateAppConfig(updates: Partial<AppConfig>): Promise<void> {
  const configPath = await getConfigPath();
  let config: AppConfig = { dataDirectory: "" };
  try {
    if (await exists(configPath)) {
      const raw = await readTextFile(configPath);
      config = JSON.parse(raw);
    }
  } catch { /* use default */ }
  Object.assign(config, updates);
  await writeTextFile(configPath, JSON.stringify(config, null, 2));
}

/** Ensure the data directory exists */
export async function ensureDataDirectory(dir: string): Promise<void> {
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
  }
}
