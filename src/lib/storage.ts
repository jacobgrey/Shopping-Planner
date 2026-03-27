import { readTextFile, writeTextFile, exists } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";

let _dataDir: string | null = null;

/** Set the active data directory for all storage operations */
export function setStorageDirectory(dir: string) {
  _dataDir = dir;
}

/** Get the current data directory */
export function getStorageDirectory(): string | null {
  return _dataDir;
}

async function filePath(filename: string): Promise<string> {
  if (!_dataDir) throw new Error("Data directory not set");
  return await join(_dataDir, filename);
}

/** Read and parse a JSON file from the data directory */
export async function readJson<T>(filename: string): Promise<T | null> {
  try {
    const path = await filePath(filename);
    if (!(await exists(path))) {
      return null;
    }
    const raw = await readTextFile(path);
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Write an object as JSON to the data directory */
export async function writeJson<T>(filename: string, data: T): Promise<void> {
  const path = await filePath(filename);
  await writeTextFile(path, JSON.stringify(data, null, 2));
}
