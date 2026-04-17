import { readFile, writeFile, exists, mkdir } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { open } from "@tauri-apps/plugin-dialog";
import { getStorageDirectory } from "./storage";

const IMAGE_WIDTH = 600;
const IMAGE_HEIGHT = 450;
const IMAGE_QUALITY = 0.85;
const IMAGES_SUBDIR = "images";

/** Get the images directory path, creating it if needed. */
async function getImageDir(): Promise<string> {
  const dataDir = getStorageDirectory();
  if (!dataDir) throw new Error("Data directory not set");
  const dir = await join(dataDir, IMAGES_SUBDIR);
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
  }
  return dir;
}

/** Get full path for an image filename. */
export async function getImagePath(filename: string): Promise<string> {
  const dir = await getImageDir();
  return await join(dir, filename);
}

/** Convert a meal name to a safe filename. */
function sanitizeFilename(mealName: string): string {
  const cleaned = mealName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return cleaned || "meal-image";
}

/** Resize and convert image data to a 600x450 JPG using offscreen canvas. */
async function resizeToJpg(imageData: Uint8Array): Promise<Uint8Array> {
  const blob = new Blob([imageData as BlobPart]);
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to decode image"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = IMAGE_WIDTH;
    canvas.height = IMAGE_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");
    // Cover-fill: scale to fill, center-crop
    const scale = Math.max(IMAGE_WIDTH / img.width, IMAGE_HEIGHT / img.height);
    const sw = IMAGE_WIDTH / scale;
    const sh = IMAGE_HEIGHT / scale;
    const sx = (img.width - sw) / 2;
    const sy = (img.height - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);
    const jpgBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob returned null"))),
        "image/jpeg",
        IMAGE_QUALITY
      );
    });
    return new Uint8Array(await jpgBlob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Save image data as a JPG for the given meal name. Returns the filename. */
export async function saveImage(mealName: string, imageData: Uint8Array): Promise<string> {
  const jpg = await resizeToJpg(imageData);
  let baseName = sanitizeFilename(mealName);
  let filename = `${baseName}.jpg`;
  const dir = await getImageDir();
  // Handle duplicates by appending suffix
  let path = await join(dir, filename);
  if (await exists(path)) {
    const suffix = crypto.randomUUID().slice(0, 6);
    filename = `${baseName}-${suffix}.jpg`;
    path = await join(dir, filename);
  }
  await writeFile(path, jpg);
  return filename;
}

/** Prompt user to pick an image file, returns the binary data or null. */
export async function pickImageFile(): Promise<Uint8Array | null> {
  const selected = await open({
    title: "Choose a meal image",
    filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "webp", "gif", "bmp"] }],
  });
  if (typeof selected !== "string") return null;
  try {
    return await readFile(selected);
  } catch {
    return null;
  }
}

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Extract image URL from HTML using multiple strategies. */
function extractImageUrl(html: string, _baseUrl: string): string | null {
  // Strategy 1: og:image meta tags (both attribute orders)
  const ogMatch =
    html.match(/<meta[^>]+property\s*=\s*["']og:image["'][^>]+content\s*=\s*["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]+property\s*=\s*["']og:image["']/i);
  if (ogMatch) return ogMatch[1];

  // Strategy 2: twitter:image
  const twMatch =
    html.match(/<meta[^>]+name\s*=\s*["']twitter:image["'][^>]+content\s*=\s*["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]+name\s*=\s*["']twitter:image["']/i);
  if (twMatch) return twMatch[1];

  // Strategy 3: JSON-LD structured data (common on recipe sites)
  const jsonLdMatches = html.matchAll(/<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of jsonLdMatches) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item.image) {
          const img = Array.isArray(item.image) ? item.image[0] : item.image;
          if (typeof img === "string") return img;
          if (img?.url) return img.url;
        }
      }
    } catch { /* invalid JSON-LD, skip */ }
  }

  return null;
}

/** Fetch image from a recipe URL. Returns image binary data or null. */
export async function fetchImageFromRecipeUrl(recipeUrl: string): Promise<Uint8Array | null> {
  try {
    // Fetch the recipe page HTML
    const pageResp = await tauriFetch(recipeUrl, {
      method: "GET",
      headers: {
        "User-Agent": BROWSER_UA,
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    if (!pageResp.ok) return null;
    const html = await pageResp.text();

    const rawUrl = extractImageUrl(html, recipeUrl);
    if (!rawUrl) return null;

    // Resolve relative URLs
    let imageUrl: string;
    try {
      imageUrl = new URL(rawUrl, recipeUrl).href;
    } catch {
      return null;
    }

    // Fetch the image
    const imgResp = await tauriFetch(imageUrl, {
      method: "GET",
      headers: { "User-Agent": BROWSER_UA, "Accept": "image/*" },
    });
    if (!imgResp.ok) return null;
    const buf = await imgResp.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

/** Search Google Images for a meal name and fetch the first result. Returns image binary data or null. */
export async function fetchImageBySearch(mealName: string): Promise<Uint8Array | null> {
  try {
    const query = encodeURIComponent(mealName + " food");
    const searchUrl = `https://www.google.com/search?q=${query}&tbm=isch&udm=2`;
    const pageResp = await tauriFetch(searchUrl, {
      method: "GET",
      headers: {
        "User-Agent": BROWSER_UA,
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    if (!pageResp.ok) return null;
    const html = await pageResp.text();

    // Google Images embeds image URLs in various patterns
    // Look for data that contains actual image URLs
    const imgUrls: string[] = [];

    // Pattern: ["https://...jpg",width,height] in inline scripts
    const scriptPattern = /\["(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)(?:\?[^"]*)?)",[0-9]+,[0-9]+\]/gi;
    for (const m of html.matchAll(scriptPattern)) {
      const url = m[1];
      // Skip Google's own thumbnails and icons
      if (!url.includes("gstatic.com") && !url.includes("google.com")) {
        imgUrls.push(url);
      }
    }

    // Fallback: look for og:image or any large image URL in the page
    if (imgUrls.length === 0) {
      const ogMatch = html.match(/<meta[^>]+property\s*=\s*["']og:image["'][^>]+content\s*=\s*["']([^"']+)["']/i);
      if (ogMatch) imgUrls.push(ogMatch[1]);
    }

    if (imgUrls.length === 0) return null;

    // Try fetching the first few URLs until one succeeds
    for (const imgUrl of imgUrls.slice(0, 3)) {
      try {
        // Unescape unicode sequences that Google may use
        const cleanUrl = imgUrl.replace(/\\u003d/g, "=").replace(/\\u0026/g, "&");
        const imgResp = await tauriFetch(cleanUrl, {
          method: "GET",
          headers: { "User-Agent": BROWSER_UA, "Accept": "image/*" },
        });
        if (!imgResp.ok) continue;
        const buf = await imgResp.arrayBuffer();
        if (buf.byteLength < 1000) continue; // Too small, probably not a real image
        return new Uint8Array(buf);
      } catch {
        continue; // Try next URL
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Fetch an image directly from a URL. Returns binary data or throws with details. */
export async function fetchImageFromUrl(imageUrl: string): Promise<Uint8Array | null> {
  // Build headers safely — Referer may fail on malformed URLs
  const headers: Record<string, string> = {
    "User-Agent": BROWSER_UA,
    "Accept": "image/jpeg, image/png, image/webp, image/gif, image/*;q=0.9, */*;q=0.5",
  };
  try {
    headers["Referer"] = new URL(imageUrl).origin + "/";
  } catch { /* skip Referer for non-standard URLs */ }

  const resp = await tauriFetch(imageUrl, { method: "GET", headers });
  if (!resp.ok) {
    let host = imageUrl;
    try { host = new URL(imageUrl).hostname; } catch { /* use raw URL */ }
    throw new Error(`HTTP ${resp.status} from ${host}`);
  }
  const buf = await resp.arrayBuffer();
  if (buf.byteLength < 100) {
    throw new Error("Response too small to be an image");
  }
  return new Uint8Array(buf);
}

/** Load an image file as a data URL for display. Returns null if missing. */
export async function loadImageAsDataUrl(filename: string): Promise<string | null> {
  try {
    const path = await getImagePath(filename);
    if (!(await exists(path))) return null;
    const data = await readFile(path);
    // Convert in chunks to avoid call stack size limits
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < data.length; i += chunkSize) {
      binary += String.fromCharCode(...data.subarray(i, i + chunkSize));
    }
    return `data:image/jpeg;base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}
