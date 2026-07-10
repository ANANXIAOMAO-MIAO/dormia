import { processDeepSeekRequest } from '../../api/deepseekCore';

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method !== 'POST') {
    const result = await processDeepSeekRequest(
      context.request.method,
      undefined,
      context.env.DEEPSEEK_API_KEY,
    );
    return Response.json(result.json, { status: result.status });
  }

  try {
    const body: unknown = await context.request.json();
    const result = await processDeepSeekRequest('POST', body, context.env.DEEPSEEK_API_KEY);
    return Response.json(result.json, { status: result.status });
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }
};
