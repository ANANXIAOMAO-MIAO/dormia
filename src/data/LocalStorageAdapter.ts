import type { StorageAdapter } from './StorageAdapter';
import type { Cluster, DormiaState, Idea } from './types';
import { randomPosition } from '@/lib/position';
import { getClusterColor } from '@/lib/palette';

const KEY = 'dormia.state.v1';
const EMPTY: DormiaState = { version: 3, ideas: [], clusters: [] };

function normalizeState(raw: unknown): DormiaState {
  if (typeof raw !== 'object' || raw === null) return structuredClone(EMPTY);
  const src = raw as Partial<DormiaState>;
  const now = Date.now();

  const clusters: Cluster[] = Array.isArray(src.clusters)
    ? src.clusters
        .filter((c) => typeof c === 'object' && c !== null)
        .map((c, index) => ({
          id: typeof c.id === 'string' ? c.id : `cluster-${index}`,
          label: typeof c.label === 'string' ? c.label : `分组${index + 1}`,
          color: typeof c.color === 'string' ? c.color : getClusterColor(index),
          anchor:
            c.anchor &&
            typeof c.anchor.x === 'number' &&
            typeof c.anchor.y === 'number'
              ? c.anchor
              : randomPosition(),
          createdAt: typeof c.createdAt === 'number' ? c.createdAt : now,
        }))
    : [];

  const ideas: Idea[] = Array.isArray(src.ideas)
    ? src.ideas
        .filter((idea) => typeof idea === 'object' && idea !== null)
        .map((idea, index) => ({
          id: typeof idea.id === 'string' ? idea.id : `idea-${index}`,
          text: typeof idea.text === 'string' ? idea.text : '',
          createdAt: typeof idea.createdAt === 'number' ? idea.createdAt : now,
          updatedAt: typeof idea.updatedAt === 'number' ? idea.updatedAt : now,
          clusterId: typeof idea.clusterId === 'string' ? idea.clusterId : null,
          isUnread: typeof idea.isUnread === 'boolean' ? idea.isUnread : false,
          aiResponse: typeof idea.aiResponse === 'string' ? idea.aiResponse : '',
          aiResponseGeneratedAt:
            typeof idea.aiResponseGeneratedAt === 'number' ? idea.aiResponseGeneratedAt : null,
          keyword: typeof idea.keyword === 'string' ? idea.keyword.trim().slice(0, 3) : '',
          keywordGeneratedAt:
            typeof idea.keywordGeneratedAt === 'number' ? idea.keywordGeneratedAt : null,
          comments: Array.isArray(idea.comments)
            ? idea.comments
                .filter((comment): comment is Idea['comments'][number] => {
                  return (
                    typeof comment === 'object' &&
                    comment !== null &&
                    typeof comment.id === 'string' &&
                    typeof comment.text === 'string' &&
                    typeof comment.createdAt === 'number'
                  );
                })
                .sort((a, b) => a.createdAt - b.createdAt)
            : [],
          position:
            idea.position &&
            typeof idea.position.x === 'number' &&
            typeof idea.position.y === 'number'
              ? idea.position
              : randomPosition(),
        }))
    : [];

  return {
    version: 3,
    ideas,
    clusters,
  };
}

export class LocalStorageAdapter implements StorageAdapter {
  async load(): Promise<DormiaState> {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(EMPTY);
      return normalizeState(JSON.parse(raw) as unknown);
    } catch {
      return structuredClone(EMPTY);
    }
  }

  async save(state: DormiaState): Promise<void> {
    localStorage.setItem(KEY, JSON.stringify(state));
  }
}
