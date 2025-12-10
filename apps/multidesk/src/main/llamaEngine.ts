import path from 'node:path';
import type {
  Llama,
  LlamaChatSession,
  LlamaContext,
  LlamaModel,
} from 'node-llama-cpp';

type LlamaModule = typeof import('node-llama-cpp');

let llamaModule: LlamaModule | null = null;
let llama: Llama | null = null;
let model: LlamaModel | null = null;
let context: LlamaContext | null = null;
let session: LlamaChatSession | null = null;
let currentModelPath: string | null = null;
let loadingPromise: Promise<void> | null = null;

async function getLlamaModule(): Promise<LlamaModule> {
  if (!llamaModule) {
    // Dynamic import to support the ESM-only package when bundled as CJS.
    llamaModule = await import('node-llama-cpp');
  }
  return llamaModule;
}

async function ensureLlama(): Promise<Llama> {
  if (llama) return llama;
  const module = await getLlamaModule();
  llama = await module.getLlama();
  return llama;
}

async function disposeCurrent(targetModelPath?: string) {
  if (
    targetModelPath &&
    currentModelPath &&
    path.resolve(currentModelPath) !== path.resolve(targetModelPath)
  ) {
    return;
  }
  try {
    await session?.dispose({ disposeSequence: true });
  } catch (err) {
    console.warn('Failed to dispose chat session', err);
  }
  try {
    await context?.dispose();
  } catch (err) {
    console.warn('Failed to dispose context', err);
  }
  try {
    await model?.dispose();
  } catch (err) {
    console.warn('Failed to dispose model', err);
  }
  session = null;
  context = null;
  model = null;
  currentModelPath = null;
}

export function getLoadedModelPath() {
  return currentModelPath;
}

export async function unload(modelPath?: string) {
  await disposeCurrent(modelPath);
}

export async function init(modelPath: string) {
  if (session && currentModelPath === modelPath) return;
  if (loadingPromise) {
    await loadingPromise;
    if (session && currentModelPath === modelPath) return;
  }

  loadingPromise = (async () => {
    await disposeCurrent();
    const [module, llamaInstance] = await Promise.all([
      getLlamaModule(),
      ensureLlama(),
    ]);
    try {
      const loadedModel = await llamaInstance.loadModel({ modelPath });
      const loadedContext = await loadedModel.createContext({
        contextSize: 4096,
      });
      const chatSession = new module.LlamaChatSession({
        contextSequence: loadedContext.getSequence(),
        autoDisposeSequence: true,
      });

      model = loadedModel;
      context = loadedContext;
      session = chatSession;
      currentModelPath = modelPath;
    } catch (err) {
      await disposeCurrent();
      throw err;
    }
  })();

  try {
    await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

export async function run(prompt: string) {
  if (!session) {
    throw new Error('Llama model not initialized');
  }
  return session.prompt(prompt, {
    temperature: 0.2,
    topP: 0.9,
    trimWhitespaceSuffix: true,
  });
}
