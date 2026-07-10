import { fallbackKeyword } from '@/lib/keywordDisplay';
import { callDeepSeek } from './deepseekClient';

interface KeywordResponse {
  keyword: string;
}

function isKeywordResponse(v: unknown): v is KeywordResponse {
  return typeof v === 'object' && v !== null && typeof (v as Record<string, unknown>).keyword === 'string';
}

function sanitizeKeyword(raw: string): string {
  const cleaned = raw.trim().replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, '');
  if (!cleaned) return '';
  return cleaned.slice(0, 3);
}

/** 生成 1–3 字关键词。失败时 fallback 到文本前缀。 */
export async function generateKeyword(ideaText: string): Promise<string> {
  const result = await callDeepSeek<KeywordResponse>({ task: 'keyword', ideaText });
  if (isKeywordResponse(result)) {
    const keyword = sanitizeKeyword(result.keyword);
    if (keyword) return keyword;
  }
  return fallbackKeyword(ideaText);
}
