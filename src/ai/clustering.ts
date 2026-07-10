import { callDeepSeek } from './deepseekClient';
import type { Cluster } from '@/data/types';
import { generateId } from '@/lib/id';
import { getClusterColor } from '@/lib/palette';
import { randomPosition } from '@/lib/position';

interface ClusterResponseExisting {
  action: 'existing';
  clusterId: string;
}

interface ClusterResponseNew {
  action: 'new';
  label: string;
}

type ClusterResponse = ClusterResponseExisting | ClusterResponseNew;

function isClusterResponse(v: unknown): v is ClusterResponse {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  if (obj.action === 'existing') return typeof obj.clusterId === 'string';
  if (obj.action === 'new') return typeof obj.label === 'string';
  return false;
}

interface ClusterResult {
  clusterId: string;
  newCluster?: Cluster;
}

/**
 * 增量归类：判断新想法归入已有分组还是新建分组。
 * 失败静默返回 null。
 */
export async function assignCluster(
  ideaText: string,
  existingClusters: Cluster[],
): Promise<ClusterResult | null> {
  const payload = existingClusters.map((c) => ({ id: c.id, label: c.label }));
  const result = await callDeepSeek<ClusterResponse>({
    task: 'cluster',
    ideaText,
    existingClusters: payload,
  });

  if (!isClusterResponse(result)) return null;

  if (result.action === 'existing') {
    return { clusterId: result.clusterId };
  }

  const newCluster: Cluster = {
    id: generateId(),
    label: result.label.trim(),
    color: getClusterColor(existingClusters.length),
    anchor: randomPosition(),
    createdAt: Date.now(),
  };
  return { clusterId: newCluster.id, newCluster };
}
