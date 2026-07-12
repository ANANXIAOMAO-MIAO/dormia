export interface Position {
  /** 归一化坐标 0~1，渲染时乘画布尺寸，保证刷新后位置稳定 */
  x: number;
  y: number;
}

export interface Idea {
  id: string;
  text: string;
  createdAt: number;
  updatedAt: number;
  clusterId: string | null;
  isUnread: boolean;
  aiResponse: string;
  aiResponseGeneratedAt: number | null;
  /** AI 生成的 1–4 字展示关键词 */
  keyword: string;
  keywordGeneratedAt: number | null;
  comments: IdeaComment[];
  position: Position;
}

export interface IdeaComment {
  id: string;
  text: string;
  createdAt: number;
}

export interface Cluster {
  id: string;
  label: string;
  color: string;
  anchor: Position;
  createdAt: number;
}

export interface DormiaState {
  version: number;
  ideas: Idea[];
  clusters: Cluster[];
}
