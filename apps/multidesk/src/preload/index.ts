import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  captureScreenshot: () => ipcRenderer.invoke('capture:screenshot'),
  executeActions: (actions: unknown) =>
    ipcRenderer.invoke('operator:execute', actions),
  listModels: () => ipcRenderer.invoke('model:list'),
  downloadModel: (id: string) => ipcRenderer.invoke('model:download', id),
  deleteModel: (id: string) => ipcRenderer.invoke('model:delete', id),
  onModelProgress: (cb: (p: { modelId: string; progress: number }) => void) => {
    const listener = (
      _: unknown,
      payload: { modelId: string; progress: number },
    ) => cb(payload);
    ipcRenderer.on('model:progress', listener);
    return () => ipcRenderer.removeListener('model:progress', listener);
  },
  llamaRun: (payload: { prompt: string; modelId?: string }) =>
    ipcRenderer.invoke('llama/run', payload),
});
