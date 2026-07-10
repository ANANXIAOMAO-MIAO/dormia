import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { loadEnv } from 'vite';

import { processDeepSeekRequest } from './api/deepseekCore';

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer | string) => {
      data += chunk;
    });
    req.on('end', () => {
      if (!data) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(data) as unknown);
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, json: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(json));
}

/** 开发环境在 Vite 内提供 /api/deepseek，无需 vercel dev */
export function deepseekDevApi(mode: string): Plugin {
  return {
    name: 'deepseek-dev-api',
    configureServer(server) {
      const env = loadEnv(mode, process.cwd(), '');
      const apiKey = env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;

      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0];
        if (path !== '/api/deepseek') {
          next();
          return;
        }

        try {
          const body = req.method === 'POST' ? await readJsonBody(req) : undefined;
          const result = await processDeepSeekRequest(req.method ?? 'GET', body, apiKey);
          sendJson(res, result.status, result.json);
        } catch {
          sendJson(res, 400, { error: 'Invalid request body' });
        }
      });
    },
  };
}
