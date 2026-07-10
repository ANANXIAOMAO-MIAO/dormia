/** 无 AI 关键词时的本地 fallback（取前 1–3 字） */
export function fallbackKeyword(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, '');
  if (!trimmed) return '…';
  return trimmed.slice(0, 3);
}

/** 展示用关键词 */
export function displayKeyword(keyword: string, text: string): string {
  const k = keyword.trim();
  if (k) return k.slice(0, 3);
  return fallbackKeyword(text);
}
