import { fallbackKeyword, sanitizeKeyword } from '@/lib/keywordDisplay';
import { callDeepSeek } from './deepseekClient';

interface KeywordResponse {
  keyword: string;
}

function isKeywordResponse(v: unknown): v is KeywordResponse {
  return typeof v === 'object' && v !== null && typeof (v as Record<string, unknown>).keyword === 'string';
}

/** 生成 1–4 字核心关键词。失败时 fallback 到文本前缀。 */
export async function generateKeyword(ideaText: string): Promise<string> {
  const result = await callDeepSeek<KeywordResponse>({ task: 'keyword', ideaText });
  if (isKeywordResponse(result)) {
    const keyword = sanitizeKeyword(result.keyword);
    if (keyword) return keyword;
  }
  return fallbackKeyword(ideaText);
}
