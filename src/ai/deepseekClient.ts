import { AI_TIMEOUT_MS } from '@/config';

type DeepSeekRequest =
  | { task: 'empathy'; ideaText: string }
  | { task: 'cluster'; ideaText: string; existingClusters: { id: string; label: string }[] }
  | { task: 'keyword'; ideaText: string };

async function callWithTimeout(url: string, body: DeepSeekRequest): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/** 调用代理，失败时返回 null（静默降级）。最多重试一次。 */
export async function callDeepSeek<T>(body: DeepSeekRequest): Promise<T | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await callWithTimeout('/api/deepseek', body);
      if (!res.ok) return null;
      const data: unknown = await res.json();
      return data as T;
    } catch {
      if (attempt === 1) return null;
    }
  }
  return null;
}
