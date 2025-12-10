import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { app } from 'electron';

export type ModelInfo = {
  id: string;
  label: string;
  sizeMB: number;
  url: string;
  localPath?: string;
  status: 'not-downloaded' | 'downloading' | 'ready';
  defaultSelected?: boolean;
};

const MODEL_DIR = path.join(app.getPath('userData'), 'models');
const activeDownloads = new Map<string, Promise<ModelInfo>>();

type ModelDefinition = Omit<ModelInfo, 'localPath' | 'status'>;

const MODELS: ModelDefinition[] = [
  {
    id: 'ui-tars-small',
    label: 'UI-TARS 7B i1 (GGUF, small)',
    sizeMB: 2700,
    url: 'https://huggingface.co/mradermacher/UI-TARS-1.5-7B-i1-GGUF/resolve/main/UI-TARS-1.5-7B-i1-GGUF.gguf',
    defaultSelected: true,
  },
  {
    id: 'ui-tars-1.5',
    label: 'UI-TARS 1.5 (GUI)',
    sizeMB: 800,
    url: 'https://example.com/ui-tars-1.5.bin',
  },
  {
    id: 'ui-tars-1.5-lite',
    label: 'UI-TARS 1.5 Lite',
    sizeMB: 400,
    url: 'https://example.com/ui-tars-1.5-lite.bin',
  },
];

function getModelDefinition(modelId: string) {
  const model = MODELS.find((m) => m.id === modelId);
  if (!model) throw new Error('Unknown model');
  return model;
}

function getModelFilePath(model: ModelDefinition) {
  const urlPath = (() => {
    try {
      return new URL(model.url).pathname;
    } catch {
      return model.url;
    }
  })();
  const ext = path.extname(urlPath);
  const fileName = ext ? `${model.id}${ext}` : `${model.id}.bin`;
  return path.join(MODEL_DIR, fileName);
}

export function listModels(): ModelInfo[] {
  return MODELS.map((model) => {
    const file = getModelFilePath(model);
    const exists = fs.existsSync(file);
    const downloading = activeDownloads.has(model.id);
    return {
      ...model,
      localPath: exists ? file : undefined,
      status: downloading ? 'downloading' : exists ? 'ready' : 'not-downloaded',
    };
  });
}

export async function downloadModel(
  modelId: string,
  onProgress: (p: { modelId: string; progress: number }) => void,
): Promise<ModelInfo> {
  const model = getModelDefinition(modelId);
  if (activeDownloads.has(modelId)) return activeDownloads.get(modelId)!;

  const dest = getModelFilePath(model);
  await fs.promises.mkdir(MODEL_DIR, { recursive: true });

  const downloadTask = new Promise<ModelInfo>((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    let completed = false;
    let total = 0;
    let downloaded = 0;

    const fail = (err: Error) => {
      if (completed) return;
      completed = true;
      file.close(() => {
        fs.rmSync(dest, { force: true });
        reject(err);
      });
    };

    const startDownload = (targetUrl: string, depth = 0) => {
      https
        .get(targetUrl, (res) => {
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            if (depth > 5)
              return fail(
                new Error('Too many redirects while downloading model'),
              );
            res.destroy();
            startDownload(res.headers.location, depth + 1);
            return;
          }
          if (res.statusCode && res.statusCode >= 400) {
            res.destroy();
            fail(
              new Error(`Model download failed with status ${res.statusCode}`),
            );
            return;
          }

          total = Number(res.headers['content-length'] ?? 0);
          if (total > 0) onProgress({ modelId, progress: 0 });

          res.on('data', (chunk) => {
            downloaded += chunk.length;
            if (total > 0) {
              onProgress({
                modelId,
                progress: Math.min(100, Math.round((downloaded / total) * 100)),
              });
            }
          });

          res.pipe(file);
          file.on('finish', () => {
            file.close(() => {
              if (!completed) {
                completed = true;
                onProgress({ modelId, progress: 100 });
                resolve({ ...model, localPath: dest, status: 'ready' });
              }
            });
          });
        })
        .on('error', (err) => fail(err));
    };

    file.on('error', (err) => fail(err));
    startDownload(model.url);
  });

  activeDownloads.set(modelId, downloadTask);
  try {
    return await downloadTask;
  } finally {
    activeDownloads.delete(modelId);
  }
}

export function getModelById(modelId: string): ModelInfo | undefined {
  return listModels().find((m) => m.id === modelId);
}

export async function deleteModel(modelId: string): Promise<ModelInfo> {
  const model = getModelDefinition(modelId);
  if (activeDownloads.has(modelId)) {
    throw new Error(
      'Model is currently downloading. Please wait for it to finish before deleting.',
    );
  }
  const file = getModelFilePath(model);
  await fs.promises.rm(file, { force: true });
  return { ...model, localPath: undefined, status: 'not-downloaded' };
}

export async function ensureModelAvailable(
  modelId: string,
  onProgress: (p: { modelId: string; progress: number }) => void,
): Promise<ModelInfo> {
  const current = getModelById(modelId);
  if (!current) throw new Error('Unknown model');
  if (current.status === 'ready') return current;
  return downloadModel(modelId, onProgress);
}

export function getDefaultModelId() {
  return MODELS.find((m) => m.defaultSelected)?.id;
}

export async function ensureDefaultModel(
  onProgress: (p: { modelId: string; progress: number }) => void,
) {
  const defaultId = getDefaultModelId();
  if (!defaultId) return undefined;
  return ensureModelAvailable(defaultId, onProgress);
}
