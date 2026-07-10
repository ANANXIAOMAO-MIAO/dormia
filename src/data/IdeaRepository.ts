import type { StorageAdapter } from './StorageAdapter';
import type { Cluster, DormiaState, Idea } from './types';

export class IdeaRepository {
  constructor(private adapter: StorageAdapter) {}

  async getAll(): Promise<DormiaState> {
    return this.adapter.load();
  }

  async addIdea(idea: Idea): Promise<void> {
    const state = await this.adapter.load();
    state.ideas.push(idea);
    await this.adapter.save(state);
  }

  async updateIdea(id: string, patch: Partial<Omit<Idea, 'id'>>): Promise<void> {
    const state = await this.adapter.load();
    state.ideas = state.ideas.map((idea) =>
      idea.id === id ? { ...idea, ...patch, updatedAt: Date.now() } : idea,
    );
    await this.adapter.save(state);
  }

  async removeIdea(id: string): Promise<void> {
    const state = await this.adapter.load();
    state.ideas = state.ideas.filter((idea) => idea.id !== id);
    await this.adapter.save(state);
  }

  async upsertCluster(cluster: Cluster): Promise<void> {
    const state = await this.adapter.load();
    const idx = state.clusters.findIndex((c) => c.id === cluster.id);
    if (idx >= 0) {
      state.clusters[idx] = cluster;
    } else {
      state.clusters.push(cluster);
    }
    await this.adapter.save(state);
  }

  async replaceState(state: DormiaState): Promise<void> {
    await this.adapter.save(state);
  }
}
