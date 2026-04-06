const INDEXNOW_KEY = "4384f82587380e15c9605d2bca060c6e";
const SITE_URL = "https://eydn.app";

/**
 * Submit one or more URLs to IndexNow for instant indexing.
 * Pings the IndexNow API which fans out to Bing, Yandex, Seznam, and Naver.
 * Fails silently — indexing is best-effort, never block on it.
 */
export async function submitToIndexNow(urls: string[]): Promise<{ ok: boolean; status?: number }> {
  if (urls.length === 0) return { ok: true };

  const absoluteUrls = urls.map((u) => (u.startsWith("http") ? u : `${SITE_URL}${u}`));

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: "eydn.app",
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: absoluteUrls,
      }),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false };
  }
}
