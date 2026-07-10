import type { DormiaState } from './types';

export interface StorageAdapter {
  load(): Promise<DormiaState>;
  save(state: DormiaState): Promise<void>;
}
