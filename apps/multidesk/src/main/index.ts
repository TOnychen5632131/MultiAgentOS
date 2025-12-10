import { app, BrowserWindow, desktopCapturer, ipcMain } from 'electron';
import path from 'node:path';
import { executeActions } from './operator';
import {
  deleteModel,
  ensureDefaultModel,
  ensureModelAvailable,
  getModelById,
  listModels,
} from './modelManager';
import {
  getLoadedModelPath,
  init as initLlama,
  run as runLlama,
  unload as unloadLlama,
} from './llamaEngine';
import type { AgentAction } from '../renderer/lib/types';

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

ipcMain.handle('capture:screenshot', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1600, height: 900 },
  });
  const first = sources[0];
  return first?.thumbnail?.toDataURL() ?? null;
});

ipcMain.handle('operator:execute', async (_event, actions: AgentAction[]) => {
  return executeActions(actions);
});

ipcMain.handle('model:list', () => listModels());

ipcMain.handle('model:download', async (event, modelId: string) => {
  const sender = BrowserWindow.fromWebContents(event.sender);
  return ensureModelAvailable(modelId, (progress) =>
    sender?.webContents.send('model:progress', progress),
  );
});

ipcMain.handle('model:delete', async (_event, modelId: string) => {
  const current = getModelById(modelId);
  if (!current) throw new Error('Unknown model');
  if (current.localPath && getLoadedModelPath()) {
    await unloadLlama(current.localPath);
  }
  return deleteModel(modelId);
});

ipcMain.handle(
  'llama/run',
  async (_event, payload: { prompt: string; modelId?: string }) => {
    const targetModelId = payload.modelId ?? 'ui-tars-small';
    const modelInfo = await ensureModelAvailable(targetModelId, (progress) => {
      mainWindow?.webContents.send('model:progress', progress);
    });
    if (!modelInfo.localPath)
      throw new Error('Model path missing after download');
    await initLlama(modelInfo.localPath);
    const result = await runLlama(payload.prompt);
    return result;
  },
);

app.whenReady().then(() => {
  createWindow().then(() => {
    // Auto-download default model on start (non-blocking for UI load).
    ensureDefaultModel((progress) =>
      mainWindow?.webContents.send('model:progress', progress),
    ).catch((err) => console.error('Default model download failed', err));
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
