import type { ModelInfo } from './types';

export function fetchModels(): Promise<ModelInfo[]> {
  return window.api.listModels();
}

export function downloadModel(id: string): Promise<ModelInfo> {
  return window.api.downloadModel(id);
}

export function deleteModel(id: string): Promise<ModelInfo> {
  return window.api.deleteModel(id);
}

export function subscribeModelProgress(
  cb: (p: { modelId: string; progress: number }) => void,
) {
  return window.api.onModelProgress(cb);
}
