/** 地图展示用关键词的最大字数 */
export const KEYWORD_MAX_LEN = 4;

/** 无 AI 关键词时的本地 fallback */
export function fallbackKeyword(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, '');
  if (!trimmed) return '…';
  return trimmed.slice(0, KEYWORD_MAX_LEN);
}

/** 展示用关键词 */
export function displayKeyword(keyword: string, text: string): string {
  const k = keyword.trim();
  if (k) return k.slice(0, KEYWORD_MAX_LEN);
  return fallbackKeyword(text);
}

export function sanitizeKeyword(raw: string): string {
  const cleaned = raw.trim().replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, '');
  if (!cleaned) return '';
  return cleaned.slice(0, KEYWORD_MAX_LEN);
}
