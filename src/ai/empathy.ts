import { callDeepSeek } from './deepseekClient';

interface EmpathyResponse {
  response: string;
}

function isEmpathyResponse(v: unknown): v is EmpathyResponse {
  return typeof v === 'object' && v !== null && typeof (v as Record<string, unknown>).response === 'string';
}

/** 生成一句共情回应。失败静默返回空串。 */
export async function generateEmpathy(ideaText: string): Promise<string> {
  const result = await callDeepSeek<EmpathyResponse>({ task: 'empathy', ideaText });
  if (!isEmpathyResponse(result)) return '';
  return result.response.trim();
}
