import { useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { openExternal } from "../../lib/openExternal";

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "up-to-date" }
  | { kind: "available"; version: string; body: string; url: string }
  | { kind: "error"; message: string };

function isNewer(remote: string, local: string): boolean {
  const r = remote.replace(/^v/, "").split(".").map(Number);
  const l = local.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((r[i] ?? 0) > (l[i] ?? 0)) return true;
    if ((r[i] ?? 0) < (l[i] ?? 0)) return false;
  }
  return false;
}

export default function AppUpdater() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  async function checkForUpdates() {
    setStatus({ kind: "checking" });
    try {
      const version = await getVersion();
      setCurrentVersion(version);

      const resp = await tauriFetch(
        "https://api.github.com/repos/jacobgrey/Shopping-Planner/releases/latest",
        {
          method: "GET",
          headers: { Accept: "application/vnd.github.v3+json" },
        }
      );

      if (!resp.ok) {
        if (resp.status === 404) {
          setStatus({ kind: "up-to-date" });
          return;
        }
        throw new Error(`GitHub API returned ${resp.status}`);
      }

      const data = await resp.json() as {
        tag_name: string;
        body?: string;
        html_url: string;
      };

      if (isNewer(data.tag_name, version)) {
        setStatus({
          kind: "available",
          version: data.tag_name.replace(/^v/, ""),
          body: data.body ?? "",
          url: data.html_url,
        });
      } else {
        setStatus({ kind: "up-to-date" });
      }
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to check for updates",
      });
    }
  }

  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">App Updates</h3>

      {currentVersion && (
        <p className="text-xs text-gray-500 mb-2">Current version: {currentVersion}</p>
      )}

      {status.kind === "idle" && (
        <button
          onClick={checkForUpdates}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Check for Updates
        </button>
      )}

      {status.kind === "checking" && (
        <button
          disabled
          className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 border border-gray-200 rounded-lg"
        >
          Checking...
        </button>
      )}

      {status.kind === "up-to-date" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-green-700">You're on the latest version.</span>
          <button
            onClick={() => setStatus({ kind: "idle" })}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {status.kind === "available" && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-blue-700">
            Version {status.version} is available!
          </p>
          {status.body && (
            <div className="max-h-40 overflow-y-auto p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700 whitespace-pre-wrap">
              {status.body}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => openExternal(status.url)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Download Update
            </button>
            <button
              onClick={() => setStatus({ kind: "idle" })}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {status.kind === "error" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-red-600">{status.message}</span>
          <button
            onClick={checkForUpdates}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Retry
          </button>
        </div>
      )}
    </section>
  );
}
