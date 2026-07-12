import type { StorageAdapter } from './StorageAdapter';
import type { Cluster, DormiaState, Idea } from './types';

/**
 * 内存缓存 + 串行写入队列，避免并发 load→modify→save 互相覆盖。
 */
export class IdeaRepository {
  private cache: DormiaState | null = null;
  private writeChain: Promise<unknown> = Promise.resolve();

  constructor(private adapter: StorageAdapter) {}

  private serialize<T>(op: () => Promise<T>): Promise<T> {
    const next = this.writeChain.then(op, op);
    this.writeChain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  private async ensureLoaded(): Promise<DormiaState> {
    if (!this.cache) {
      this.cache = await this.adapter.load();
    }
    return this.cache;
  }

  async getAll(): Promise<DormiaState> {
    return this.serialize(async () => {
      const state = await this.ensureLoaded();
      return structuredClone(state);
    });
  }

  async addIdea(idea: Idea): Promise<void> {
    return this.serialize(async () => {
      const state = await this.ensureLoaded();
      state.ideas.push(idea);
      await this.adapter.save(state);
    });
  }

  async updateIdea(id: string, patch: Partial<Omit<Idea, 'id'>>): Promise<void> {
    return this.serialize(async () => {
      const state = await this.ensureLoaded();
      const exists = state.ideas.some((idea) => idea.id === id);
      if (!exists) return;
      state.ideas = state.ideas.map((idea) =>
        idea.id === id ? { ...idea, ...patch, updatedAt: Date.now() } : idea,
      );
      await this.adapter.save(state);
    });
  }

  async removeIdea(id: string): Promise<void> {
    return this.serialize(async () => {
      const state = await this.ensureLoaded();
      state.ideas = state.ideas.filter((idea) => idea.id !== id);
      await this.adapter.save(state);
    });
  }

  async upsertCluster(cluster: Cluster): Promise<void> {
    return this.serialize(async () => {
      const state = await this.ensureLoaded();
      const idx = state.clusters.findIndex((c) => c.id === cluster.id);
      if (idx >= 0) {
        state.clusters[idx] = cluster;
      } else {
        state.clusters.push(cluster);
      }
      await this.adapter.save(state);
    });
  }

  async replaceState(state: DormiaState): Promise<void> {
    return this.serialize(async () => {
      this.cache = structuredClone(state);
      await this.adapter.save(this.cache);
    });
  }
}
