import { create } from 'zustand';

import { generateId } from '@/lib/id';
import { clusteredIdeaPosition, clusterAnchorPosition, randomPosition } from '@/lib/position';
import { separateIdeaPositions } from '@/lib/nodeLayout';
import { getNearbyClusterColor } from '@/lib/palette';
import { generateKeyword } from '@/ai/keyword';
import { LocalStorageAdapter } from '@/data/LocalStorageAdapter';
import { IdeaRepository } from '@/data/IdeaRepository';
import type { Cluster, Idea } from '@/data/types';

const repo = new IdeaRepository(new LocalStorageAdapter());

interface IdeasState {
  ideas: Idea[];
  clusters: Cluster[];
  initialized: boolean;

  init: () => Promise<void>;
  addIdea: (text: string) => Promise<Idea>;
  updateIdea: (id: string, patch: Partial<Omit<Idea, 'id'>>) => Promise<void>;
  markIdeaRead: (id: string) => Promise<void>;
  addComment: (ideaId: string, text: string) => Promise<void>;
  removeIdea: (id: string) => Promise<void>;
  upsertCluster: (cluster: Cluster) => Promise<void>;
  relayoutUniverse: () => Promise<void>;
  backfillKeywords: () => Promise<void>;
}

function relayoutByCluster(ideas: Idea[], clusters: Cluster[]): { ideas: Idea[]; clusters: Cluster[] } {
  const sortedClusters = [...clusters].sort((a, b) =>
    a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt - b.createdAt,
  );
  const recoloredClusters = sortedClusters.map((cluster, index) => ({
    ...cluster,
    anchor: clusterAnchorPosition(index, sortedClusters.length),
    color: getNearbyClusterColor(index, sortedClusters.length),
  }));
  const clusterById = new Map(recoloredClusters.map((cluster) => [cluster.id, cluster]));
  const membersByCluster = new Map<string, Idea[]>();
  for (const idea of ideas) {
    if (!idea.clusterId || !clusterById.has(idea.clusterId)) continue;
    const members = membersByCluster.get(idea.clusterId) ?? [];
    members.push(idea);
    membersByCluster.set(idea.clusterId, members);
  }

  const nextIdeas: Idea[] = [];
  for (const idea of ideas) {
    if (!idea.clusterId) {
      nextIdeas.push({ ...idea, position: randomPosition() });
      continue;
    }

    const cluster = clusterById.get(idea.clusterId);
    const members = membersByCluster.get(idea.clusterId);
    if (!cluster || !members) {
      nextIdeas.push({ ...idea, position: randomPosition() });
      continue;
    }

    const sortedMembers = [...members].sort((a, b) =>
      a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt - b.createdAt,
    );
    const rank = sortedMembers.findIndex((member) => member.id === idea.id);
    nextIdeas.push({
      ...idea,
      position: clusteredIdeaPosition(cluster.anchor, idea.id, rank < 0 ? 0 : rank),
    });
  }

  return {
    ideas: separateIdeaPositions(nextIdeas),
    clusters: recoloredClusters,
  };
}

export const useIdeasStore = create<IdeasState>((set, get) => ({
  ideas: [],
  clusters: [],
  initialized: false,

  init: async () => {
    try {
      const state = await repo.getAll();
      const relayout = relayoutByCluster(state.ideas, state.clusters);
      const positionsChanged =
        relayout.ideas.some((idea) => {
          const prev = state.ideas.find((item) => item.id === idea.id);
          return !prev || prev.position.x !== idea.position.x || prev.position.y !== idea.position.y;
        }) ||
        relayout.clusters.some((cluster) => {
          const prev = state.clusters.find((item) => item.id === cluster.id);
          return !prev || prev.anchor.x !== cluster.anchor.x || prev.anchor.y !== cluster.anchor.y;
        });
      if (positionsChanged) {
        await repo.replaceState({ version: 3, ideas: relayout.ideas, clusters: relayout.clusters });
      }
      set({ ideas: relayout.ideas, clusters: relayout.clusters, initialized: true });
    } catch (err) {
      console.error('[dormia] init failed:', err);
      set({ ideas: [], clusters: [], initialized: true });
    }
    void get().backfillKeywords();
  },

  addIdea: async (text) => {
    const now = Date.now();
    const idea: Idea = {
      id: generateId(),
      text,
      createdAt: now,
      updatedAt: now,
      clusterId: null,
      isUnread: true,
      aiResponse: '',
      aiResponseGeneratedAt: null,
      keyword: '',
      keywordGeneratedAt: null,
      comments: [],
      position: randomPosition(),
    };
    await repo.addIdea(idea);
    set((s) => ({ ideas: [...s.ideas, idea] }));
    return idea;
  },

  updateIdea: async (id, patch) => {
    await repo.updateIdea(id, patch);
    set((s) => ({
      ideas: s.ideas.map((idea) =>
        idea.id === id ? { ...idea, ...patch, updatedAt: Date.now() } : idea,
      ),
    }));
  },

  markIdeaRead: async (id) => {
    await repo.updateIdea(id, { isUnread: false });
    set((s) => ({
      ideas: s.ideas.map((idea) =>
        idea.id === id ? { ...idea, isUnread: false, updatedAt: Date.now() } : idea,
      ),
    }));
  },

  addComment: async (ideaId, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const comment = {
      id: generateId(),
      text: trimmed,
      createdAt: Date.now(),
    };
    await repo.updateIdea(ideaId, {
      comments: (
        get().ideas.find((idea) => idea.id === ideaId)?.comments ?? []
      ).concat(comment),
    });
    set((s) => ({
      ideas: s.ideas.map((idea) =>
        idea.id === ideaId
          ? { ...idea, comments: [...idea.comments, comment], updatedAt: Date.now() }
          : idea,
      ),
    }));
  },

  removeIdea: async (id) => {
    await repo.removeIdea(id);
    set((s) => ({ ideas: s.ideas.filter((idea) => idea.id !== id) }));
  },

  upsertCluster: async (cluster) => {
    await repo.upsertCluster(cluster);
    set((s) => {
      const idx = s.clusters.findIndex((c) => c.id === cluster.id);
      const next =
        idx >= 0
          ? s.clusters.map((c) => (c.id === cluster.id ? cluster : c))
          : [...s.clusters, cluster];
      return { clusters: next };
    });
  },

  relayoutUniverse: async () => {
    const state = get();
    const relayout = relayoutByCluster(state.ideas, state.clusters);
    await repo.replaceState({
      version: 3,
      ideas: relayout.ideas,
      clusters: relayout.clusters,
    });
    set({
      ideas: relayout.ideas,
      clusters: relayout.clusters,
    });
  },

  backfillKeywords: async () => {
    const ideas = get().ideas.filter((idea) => !idea.keywordGeneratedAt && idea.text.trim());
    for (const idea of ideas) {
      const keyword = await generateKeyword(idea.text);
      await get().updateIdea(idea.id, {
        keyword,
        keywordGeneratedAt: Date.now(),
      });
    }
  },
}));
