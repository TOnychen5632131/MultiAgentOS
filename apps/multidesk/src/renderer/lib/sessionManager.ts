import { captureScreenshot } from './screenshot';
import { requestAgentActions } from './agentTars';
import { runOperator } from './operators';
import type { AgentPlan, ModelInfo, SessionState } from './types';
import { fetchModels } from './models';

type Listener = () => void;

export class MultiSessionManager {
  private sessions = new Map<string, SessionState>();
  private listeners = new Set<Listener>();
  private currentModel?: string;
  private models: ModelInfo[] = [];
  private snapshotCache: SessionState[] = [];

  constructor(count: number) {
    for (let i = 1; i <= count; i++) {
      const id = `session-${i}`;
      this.sessions.set(id, {
        id,
        title: `Session ${i}`,
        messages: [],
        status: 'idle',
      });
    }
    this.recomputeSnapshot();
  }

  async initModels() {
    this.models = await fetchModels();
    if (this.models.length > 0) {
      const ready = this.models.find((m) => m.status === 'ready');
      const preferred = ready ?? this.models.find((m) => m.defaultSelected);
      this.currentModel = preferred?.id;
    }
    this.emit();
  }

  getModels() {
    return this.models;
  }

  setModel(modelId?: string) {
    this.currentModel = modelId;
    this.emit();
  }

  getModel() {
    return this.currentModel;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  snapshot() {
    return this.snapshotCache;
  }

  private recomputeSnapshot() {
    this.snapshotCache = Array.from(this.sessions.values());
  }

  private emit() {
    this.recomputeSnapshot();
    this.listeners.forEach((listener) => listener());
  }

  async updateScreenshot(sessionId: string) {
    const shot = await captureScreenshot();
    const session = this.sessions.get(sessionId);
    if (session && shot) {
      session.screenshot = shot;
      this.emit();
    }
  }

  async runPrompt(sessionId: string, prompt: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.status = 'thinking';
    session.messages.push({
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    });
    if (!session.screenshot)
      session.screenshot = (await captureScreenshot()) ?? undefined;
    this.emit();

    try {
      const plan: AgentPlan = await requestAgentActions({
        prompt,
        screenshot: session.screenshot ?? '',
        model: this.currentModel,
      });
      session.plan = plan;
      session.status = 'ready';
      session.messages.push({
        role: 'agent',
        content: plan.summary,
        timestamp: Date.now(),
      });
    } catch (err) {
      session.status = 'error';
      session.error = (err as Error).message;
    } finally {
      this.emit();
    }
  }

  async confirmAndExecute(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session?.plan) return;
    session.status = 'running';
    this.emit();
    try {
      await runOperator(session.plan.actions);
      session.plan = undefined;
      session.status = 'idle';
    } catch (err) {
      session.status = 'error';
      session.error = (err as Error).message;
    } finally {
      this.emit();
    }
  }
}
