/** Resolve /uploads/… paths to full backend URL for img src */
export function designAssetUrl(path?: string | null): string {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("blob:") || path.startsWith("data:")) {
    return path;
  }
  const base = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
  ).replace(/\/api\/?$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function triggerBrowserDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function parseFilename(header: string | null, fallback: string) {
  if (!header) return fallback;
  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      return fallback;
    }
  }
  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain?.[1] || fallback;
}

/** Fetch image bytes and save to disk (works cross-origin). */
export async function downloadDesignAsset(
  url: string,
  fallbackFilename: string,
  headers?: HeadersInit
): Promise<void> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error("Failed to download image");
  }
  const blob = await response.blob();
  const filename = parseFilename(
    response.headers.get("Content-Disposition"),
    fallbackFilename
  );
  triggerBrowserDownload(blob, filename);
}
