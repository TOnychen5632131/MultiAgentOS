export type ModelInfo = {
  id: string;
  label: string;
  sizeMB: number;
  url: string;
  localPath?: string;
  status: 'not-downloaded' | 'downloading' | 'ready';
  defaultSelected?: boolean;
};

export type AgentAction = {
  id: string;
  type: 'click' | 'input' | 'drag' | 'scroll';
  description: string;
  payload?: {
    target?: string;
    text?: string;
    position?: { x: number; y: number };
    dragTo?: { x: number; y: number };
  };
};

export type AgentPlan = { summary: string; actions: AgentAction[] };

export type ChatMessage = {
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
};

export type SessionState = {
  id: string;
  title: string;
  messages: ChatMessage[];
  screenshot?: string;
  plan?: AgentPlan;
  status: 'idle' | 'thinking' | 'ready' | 'running' | 'error';
  error?: string;
};
