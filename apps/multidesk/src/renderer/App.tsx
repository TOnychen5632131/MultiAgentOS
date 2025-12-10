import { useEffect, useMemo, useState } from 'react';
import ModelPicker from './components/ModelPicker';
import MultiSessionGrid from './components/MultiSessionGrid';
import { MultiSessionManager } from './lib/sessionManager';

export default function App() {
  const manager = useMemo(() => new MultiSessionManager(4), []);
  const [modelId, setModelId] = useState<string | undefined>();

  useEffect(() => {
    manager.initModels().then(() => setModelId(manager.getModel()));
  }, [manager]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4">
      <header className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">MultiDesk · AI 多区块桌面</h1>
          <p className="text-sm text-slate-400">
            4 独立会话 · Agent TARS · 预览后执行
          </p>
        </div>
        <ModelPicker
          selected={modelId}
          onSelect={(id) => {
            manager.setModel(id);
            setModelId(id);
          }}
        />
      </header>
      <MultiSessionGrid manager={manager} />
    </div>
  );
}
