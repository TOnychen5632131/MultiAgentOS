import { useState } from 'react';
import ActionPreviewLayer from './ActionPreviewLayer';
import type { MultiSessionManager } from '../lib/sessionManager';
import type { SessionState } from '../lib/types';

type Props = { session: SessionState; manager: MultiSessionManager };

export default function SessionPane({ session, manager }: Props) {
  const [prompt, setPrompt] = useState('');

  return (
    <div className="relative rounded-xl border border-slate-800 bg-slate-900/70 p-3">
      <header className="mb-2 flex items-center justify-between text-sm text-slate-300">
        <span>{session.title}</span>
        <span className="text-xs text-slate-500">
          Model: {manager.getModel() ?? '未选择'}
        </span>
      </header>

      {session.screenshot ? (
        <img
          src={session.screenshot}
          alt="screenshot"
          className="mb-2 h-32 w-full rounded-md object-cover"
        />
      ) : (
        <button
          className="mb-2 w-full rounded-md border border-slate-700 p-2 text-xs text-slate-400 hover:border-slate-500"
          onClick={() => manager.updateScreenshot(session.id)}
        >
          Capture Screenshot
        </button>
      )}

      <div className="mb-2 h-16 overflow-auto rounded-md bg-slate-950/60 p-2 text-xs text-slate-300">
        {session.messages.slice(-3).map((m, idx) => (
          <div key={idx} className="mb-1">
            <span className="font-semibold">{m.role}:</span> {m.content}
          </div>
        ))}
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="输入指令给 Agent TARS..."
        className="mb-2 w-full rounded-md border border-slate-700 bg-slate-950/70 p-2 text-sm text-slate-100"
      />

      <div className="flex gap-2">
        <button
          className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold hover:bg-blue-500 disabled:bg-slate-700"
          disabled={!prompt || session.status === 'thinking'}
          onClick={() => manager.runPrompt(session.id, prompt)}
        >
          发指令
        </button>
        <button
          className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:bg-slate-700"
          disabled={!session.plan || session.status === 'running'}
          onClick={() => manager.confirmAndExecute(session.id)}
        >
          确认执行
        </button>
      </div>

      {session.plan && <ActionPreviewLayer plan={session.plan} />}
      {session.error && (
        <p className="mt-2 text-xs text-red-400">{session.error}</p>
      )}
    </div>
  );
}
