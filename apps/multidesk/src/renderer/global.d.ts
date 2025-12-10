import type { AgentAction, ModelInfo } from './lib/types';

declare global {
  interface Window {
    api: {
      captureScreenshot: () => Promise<string | null>;
      executeActions: (actions: AgentAction[]) => Promise<{ ok: boolean }>;
      listModels: () => Promise<ModelInfo[]>;
      downloadModel: (id: string) => Promise<ModelInfo>;
      deleteModel: (id: string) => Promise<ModelInfo>;
      onModelProgress: (
        cb: (p: { modelId: string; progress: number }) => void,
      ) => () => void;
      llamaRun: (payload: {
        prompt: string;
        modelId?: string;
      }) => Promise<string>;
    };
  }
}

export {};
