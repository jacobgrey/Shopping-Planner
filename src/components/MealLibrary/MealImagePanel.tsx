import { useState, useRef, useEffect } from "react";
import { saveImage, pickImageFile, fetchImageFromRecipeUrl, fetchImageFromUrl, fetchImageBySearch } from "../../lib/mealImages";

interface MealImagePanelProps {
  mealId: string;
  mealName: string;
  recipeUrl?: string;
  imageFilename?: string;
  imageSrc?: string;
  compact?: boolean;
  onImageSaved: (mealId: string, filename: string) => void;
  onImageRemoved: (mealId: string) => void;
  onToast: (message: string, type: "error" | "success" | "info") => void;
}

export default function MealImagePanel({
  mealId,
  mealName,
  recipeUrl,
  imageFilename,
  imageSrc,
  compact,
  onImageSaved,
  onImageRemoved,
  onToast,
}: MealImagePanelProps) {
  const [fetching, setFetching] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [urlSubmitted, setUrlSubmitted] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showContextMenu) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showContextMenu]);

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setShowContextMenu(true);
    // Clamp menu position to stay within viewport
    const x = Math.min(e.clientX, window.innerWidth - 170);
    const y = Math.min(e.clientY, window.innerHeight - 120);
    setMenuPos({ x, y });
  }

  async function handleUpload() {
    setShowContextMenu(false);
    if (fetching) return;
    try {
      const data = await pickImageFile();
      if (!data) return;
      setFetching(true);
      const filename = await saveImage(mealName, data);
      onImageSaved(mealId, filename);
      onToast("Image saved", "success");
    } catch (e) {
      onToast(`Upload failed: ${e instanceof Error ? e.message : "unknown error"}`, "error");
    } finally {
      setFetching(false);
    }
  }

  async function handleFetch() {
    if (fetching) return;
    setShowContextMenu(false);
    setFetching(true);
    try {
      let data: Uint8Array | null = null;
      if (recipeUrl) {
        data = await fetchImageFromRecipeUrl(recipeUrl);
      }
      // Fall back to image search if no recipe URL or recipe fetch failed
      if (!data) {
        data = await fetchImageBySearch(mealName);
      }
      if (!data) {
        onToast("Could not find an image.", "error");
        return;
      }
      const filename = await saveImage(mealName, data);
      onImageSaved(mealId, filename);
      onToast("Image fetched", "success");
    } catch (e) {
      onToast(`Fetch failed: ${e instanceof Error ? e.message : "unknown error"}`, "error");
    } finally {
      setFetching(false);
    }
  }

  async function handleFromUrl() {
    if (urlSubmitted) return;
    const url = urlValue.trim();
    if (!url) { setShowUrlInput(false); return; }
    setUrlSubmitted(true);
    setShowUrlInput(false);
    setUrlValue("");
    setFetching(true);
    try {
      const data = await fetchImageFromUrl(url);
      if (!data) {
        onToast("Could not download image from that URL.", "error");
        return;
      }
      const filename = await saveImage(mealName, data);
      onImageSaved(mealId, filename);
      onToast("Image saved", "success");
    } catch (e) {
      console.error("Image download failed:", e);
      onToast(`Download failed: ${e instanceof Error ? e.message : String(e)}`, "error");
    } finally {
      setFetching(false);
      setUrlSubmitted(false);
    }
  }

  function handleRemove() {
    setShowContextMenu(false);
    onImageRemoved(mealId);
    onToast("Image removed", "info");
  }

  function openPasteUrl() {
    setShowContextMenu(false);
    setShowUrlInput(true);
    setUrlValue("");
    setUrlSubmitted(false);
  }

  const textSize = compact ? "text-[10px]" : "text-xs";
  const btnPad = compact ? "px-2 py-1" : "px-3 py-1.5";

  const menuItems: { label: string; action: () => void; show: boolean }[] = [
    { label: "Upload file", action: handleUpload, show: true },
    { label: "Paste image URL", action: openPasteUrl, show: true },
    { label: recipeUrl ? "Fetch from recipe" : "Fetch image", action: handleFetch, show: true },
    { label: "Remove image", action: handleRemove, show: !!(imageFilename || imageSrc) },
  ];

  return (
    <div
      className={`bg-gray-100 flex items-center justify-center ${compact ? "" : "rounded-lg border border-gray-200 min-h-[180px]"} relative`}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={handleContextMenu}
      style={compact ? { width: "40%", flexShrink: 0 } : undefined}
    >
      {showUrlInput ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 px-2 z-10">
          <input
            type="url"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            onBlur={() => handleFromUrl()}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleFromUrl(); } if (e.key === "Escape") { setShowUrlInput(false); setUrlValue(""); } }}
            autoFocus
            placeholder="Paste image URL..."
            className={`w-full px-1.5 py-0.5 ${textSize} border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400`}
          />
        </div>
      ) : imageSrc ? (
        <img
          src={imageSrc}
          alt={mealName}
          className="w-full h-full object-cover cursor-context-menu"
        />
      ) : fetching ? (
        <p className={`${textSize} text-gray-400`}>Fetching...</p>
      ) : (
        <div className="flex flex-col items-center gap-1.5 p-2">
          <button onClick={handleFetch} disabled={fetching} className={`${btnPad} ${textSize} font-medium text-blue-600 bg-white border border-blue-300 rounded hover:bg-blue-50 disabled:opacity-50`}>
            {recipeUrl ? "Fetch from recipe" : "Fetch image"}
          </button>
          <button onClick={handleUpload} disabled={fetching} className={`${btnPad} ${textSize} font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50`}>
            Upload file
          </button>
          <button onClick={openPasteUrl} disabled={fetching} className={`${btnPad} ${textSize} font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50`}>
            Paste URL
          </button>
        </div>
      )}

      {showContextMenu && (
        <div
          ref={menuRef}
          className="fixed z-[200] bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[150px]"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          {menuItems.filter((m) => m.show).map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="block w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 text-gray-700"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
