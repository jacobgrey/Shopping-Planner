import { useState } from "react";
import { setDataDirectory, promptForDataDirectory, ensureDataDirectory } from "../../lib/dataDirectory";
import { getStorageDirectory, setStorageDirectory } from "../../lib/storage";
import { exportAllData, importAllData, validateBulkData } from "../../lib/bulkExportImport";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";

export default function Settings() {
  const [currentDir, setCurrentDir] = useState(getStorageDirectory() || "");
  const [status, setStatus] = useState<string | null>(null);

  async function handleChangeDirectory() {
    const chosen = await promptForDataDirectory();
    if (chosen) {
      await ensureDataDirectory(chosen);
      await setDataDirectory(chosen);
      setStorageDirectory(chosen);
      setCurrentDir(chosen);
      setStatus("Data directory changed. Restart recommended to reload data.");
    }
  }

  async function handleExport() {
    const savePath = await save({
      title: "Export all data",
      defaultPath: "meal-planner-backup.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!savePath) return;

    try {
      const data = await exportAllData();
      await writeTextFile(savePath, JSON.stringify(data, null, 2));
      setStatus(`Data exported to ${savePath}`);
    } catch (e) {
      setStatus(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleImport(mode: "replace" | "merge") {
    const selected = await open({
      title: "Import data backup",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (typeof selected !== "string") return;

    try {
      const content = await readTextFile(selected);
      const data = JSON.parse(content);
      if (!validateBulkData(data)) {
        setStatus("Invalid backup file format.");
        return;
      }
      const result = await importAllData(data, mode);
      setStatus(
        mode === "replace"
          ? `Replaced all data. ${result.mealsCount} meals loaded. Restart recommended.`
          : `Merged ${result.mealsCount} new meals. Restart recommended.`
      );
    } catch (e) {
      setStatus(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Settings</h2>

      {/* Data directory */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Data Directory
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          Your meals, plans, and settings are stored here. Point to a cloud-synced
          folder to share between machines.
        </p>
        <div className="flex items-center gap-3 mb-2">
          <code className="flex-1 text-xs bg-gray-100 px-3 py-2 rounded border border-gray-200 text-gray-700 overflow-hidden text-ellipsis">
            {currentDir}
          </code>
          <button
            onClick={handleChangeDirectory}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Change...
          </button>
        </div>
      </section>

      {/* Export/Import */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Data Export & Import
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          Export all your data as a single file, or import from a previous backup.
        </p>
        <div className="flex gap-2 mb-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Export All Data
          </button>
          <button
            onClick={() => handleImport("merge")}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Import (Merge)
          </button>
          <button
            onClick={() => handleImport("replace")}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50"
          >
            Import (Replace All)
          </button>
        </div>
      </section>

      {/* Status message */}
      {status && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          {status}
          <button
            onClick={() => setStatus(null)}
            className="ml-2 text-blue-500 hover:text-blue-700"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
