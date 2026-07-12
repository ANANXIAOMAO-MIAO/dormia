const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';

const EMPATHY_SYSTEM = `你是 Dormia 的「深处」。用户会把一个闪现的念头交给你。
你的任务：只用一句中文短句，安静地「看见」这个念头背后的情绪、渴望或未说出的部分。

回应时，可灵活运用以下策略，但不强制分类：

说出念头底下的渴望（如：渴望被理解、渴望自由、渴望秩序）。

为念头找到一句恰好的名言或他人说过的话。

将念头换一种诗意但克制的说法（不展开情境，只做微小的语义转换）。

给出一个极其抽象的下一步提示（如“也许它正等待一个安静的清晨”），绝不涉及具体行动。

严格规则：

只输出一句话，不分段、不换行、不加引号。

不给具体建议，不问问题。

不鼓励、不评价、不夸奖（禁止「加油」「你可以的」「很棒」等）。

语气：克制、安静、像深夜里轻声的回应。

示例：
念头：我想写一首属于自己的歌
回应：独属于自己的旋律。
念头：做一个关于公平正义的系统
回应：是你关于秩序的渴望。
念头：好想逃到一个没人的地方
回应：卢梭说过，独处是灵魂的呼吸。
念头：希望帮助弱小的人
回应：你听见了远处他人的疼痛。`;

const CLUSTER_SYSTEM = `你在为一批「念头」做语义分组，帮助把语气/主题相近的念头归到一起。
给你：一个新念头，以及已有分组的标签列表（可能为空）。
判断这个新念头应归入某个已有分组，还是需要一个新分组。

严格以 JSON 返回，不要多余文字：
- 归入已有：{"action":"existing","clusterId":"<命中的id>"}
- 需要新建：{"action":"new","label":"<不超过4字的简短中文标签>"}

规则：
- 标签仅用于内部分组着色，不会展示给用户，务求简短。
- 不设预定义分类体系，完全按语义自由判断。
- 拿不准时倾向归入最接近的已有分组，避免分组碎片化。`;

const KEYWORD_SYSTEM = `你是 Dormia 的语义提炼器。用户会把一段念头交给你，你需要提取一个用于地图展示的核心词。

严格规则：
- 输出 1–4 个汉字（必要时可用 1 个英文词，但优先中文）
- 必须是一个完整、可独立理解的核心词或短语（如「独处空间」「乐队」「自由」）
- 禁止截断式拼凑或不完整片段（如「独处空」「想要一」「只属于」）
- 优先名词或名词短语，提炼核心意象、情绪或主题，不是复述原文前缀
- 不加标点、不加引号、不加解释
- 避免「想法」「记录」等空词

示例：
念头：想要一个只属于自己的独处空间 → {"keyword":"独处空间"}
念头：好想组建一支自己的乐队 → {"keyword":"乐队"}
念头：最近总想一个人待着 → {"keyword":"独处"}

严格以 JSON 返回，不要多余文字：
{"keyword":"词"}`;

type EmpathyRequest = { task: 'empathy'; ideaText: string };
type ClusterRequest = {
  task: 'cluster';
  ideaText: string;
  existingClusters: { id: string; label: string }[];
};
type KeywordRequest = { task: 'keyword'; ideaText: string };
type DeepSeekRequest = EmpathyRequest | ClusterRequest | KeywordRequest;

function isDeepSeekRequest(v: unknown): v is DeepSeekRequest {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  if (typeof obj.ideaText !== 'string' || obj.ideaText.trim() === '') return false;
  return obj.task === 'empathy' || obj.task === 'cluster' || obj.task === 'keyword';
}

export type DeepSeekProxyResponse = { status: number; json: unknown };

export async function processDeepSeekRequest(
  method: string,
  body: unknown,
  apiKey: string | undefined,
): Promise<DeepSeekProxyResponse> {
  if (method !== 'POST') {
    return { status: 405, json: { error: 'Method not allowed' } };
  }

  if (!apiKey) {
    return { status: 500, json: { error: 'API key not configured' } };
  }

  if (!isDeepSeekRequest(body)) {
    return { status: 400, json: { error: 'Invalid request' } };
  }

  try {
    if (body.task === 'empathy') {
      const result = await callDeepSeek(apiKey, {
        system: EMPATHY_SYSTEM,
        user: body.ideaText,
        temperature: 0.8,
        maxTokens: 80,
        jsonMode: false,
      });
      return { status: 200, json: { response: result.trim() } };
    }

    if (body.task === 'keyword') {
      const result = await callDeepSeek(apiKey, {
        system: KEYWORD_SYSTEM,
        user: body.ideaText,
        temperature: 0.5,
        maxTokens: 40,
        jsonMode: true,
      });
      const parsed: unknown = JSON.parse(result);
      if (typeof parsed === 'object' && parsed !== null && typeof (parsed as Record<string, unknown>).keyword === 'string') {
        return { status: 200, json: { keyword: (parsed as { keyword: string }).keyword.trim() } };
      }
      return { status: 200, json: { keyword: '' } };
    }

    const userMsg = `新念头：${body.ideaText}\n已有分组：${JSON.stringify(body.existingClusters)}`;
    const result = await callDeepSeek(apiKey, {
      system: CLUSTER_SYSTEM,
      user: userMsg,
      temperature: 0.2,
      maxTokens: 100,
      jsonMode: true,
    });
    const parsed: unknown = JSON.parse(result);
    return { status: 200, json: parsed };
  } catch (err) {
    console.error('[deepseek proxy]', err);
    return { status: 502, json: { error: 'Upstream error' } };
  }
}

async function callDeepSeek(
  apiKey: string,
  opts: {
    system: string;
    user: string;
    temperature: number;
    maxTokens: number;
    jsonMode: boolean;
  },
): Promise<string> {
  const payload: Record<string, unknown> = {
    model: MODEL,
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
  };
  if (opts.jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  const res = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`DeepSeek API error: ${res.status}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  const content = data.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('Empty response from DeepSeek');
  return content;
}
