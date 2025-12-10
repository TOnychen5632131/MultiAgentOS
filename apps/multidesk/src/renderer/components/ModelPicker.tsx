import { useCallback, useEffect, useState } from 'react';
import type { ModelInfo } from '../lib/types';
import {
  deleteModel,
  downloadModel,
  fetchModels,
  subscribeModelProgress,
} from '../lib/models';

type Props = { selected?: string; onSelect: (id?: string) => void };

function pickPreferredModel(list: ModelInfo[], current?: string) {
  const ready = list.filter((m) => m.status === 'ready');
  return (
    ready.find((m) => m.id === current) ??
    ready.find((m) => m.defaultSelected) ??
    ready[0]
  );
}

export default function ModelPicker({ selected, onSelect }: Props) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshModels = useCallback(async () => {
    try {
      const list = await fetchModels();
      setModels(list);
      const preferred = pickPreferredModel(list, selected);
      const hasSelectedReady = list.some(
        (m) => m.id === selected && m.status === 'ready',
      );
      if (!selected && preferred) onSelect(preferred.id);
      if (selected && !hasSelectedReady) onSelect(preferred?.id);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [onSelect, selected]);

  useEffect(() => {
    refreshModels();
    return subscribeModelProgress((p) => {
      setProgress((prev) => ({ ...prev, [p.modelId]: p.progress }));
      setModels((prev) =>
        prev.map((m) =>
          m.id === p.modelId
            ? { ...m, status: p.progress >= 100 ? 'ready' : 'downloading' }
            : m,
        ),
      );
      if (p.progress >= 100) {
        refreshModels();
      }
    });
  }, [refreshModels]);

  const onDownload = async (id: string) => {
    setBusyId(id);
    setError(null);
    setModels((items) =>
      items.map((x) => (x.id === id ? { ...x, status: 'downloading' } : x)),
    );
    try {
      const info = await downloadModel(id);
      setModels((items) => items.map((x) => (x.id === id ? info : x)));
      setProgress((prev) => ({ ...prev, [id]: 100 }));
      if (info.status === 'ready') onSelect(info.id);
    } catch (err) {
      setError((err as Error).message);
      setModels((items) =>
        items.map((x) =>
          x.id === id
            ? { ...x, status: 'not-downloaded', localPath: undefined }
            : x,
        ),
      );
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm('确定删除该模型文件吗？')) return;
    setBusyId(id);
    setError(null);
    try {
      await deleteModel(id);
      setProgress((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await refreshModels();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-slate-200">推理模型</span>
        <select
          value={selected ?? ''}
          onChange={(e) => onSelect(e.target.value || undefined)}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1"
        >
          <option value="" disabled>
            选择模型
          </option>
          {models.map((m) => (
            <option key={m.id} value={m.id} disabled={m.status !== 'ready'}>
              {m.label} {m.status !== 'ready' ? '(未就绪)' : ''}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        {models.map((m) => {
          const pct = progress[m.id];
          const statusText =
            m.status === 'ready'
              ? '已就绪'
              : m.status === 'downloading'
                ? `下载中 ${pct ?? 0}%`
                : '未下载';
          return (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-md border border-slate-700 bg-slate-900 px-3 py-2"
            >
              <div className="leading-tight">
                <div className="font-medium text-slate-100">{m.label}</div>
                <div className="text-xs text-slate-400">
                  {m.sizeMB}MB · {statusText}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {m.status === 'ready' ? (
                  <button
                    onClick={() => onDelete(m.id)}
                    disabled={!!busyId}
                    className="rounded-md border border-slate-600 px-2 py-1 text-xs font-semibold hover:border-amber-500 hover:text-amber-300 disabled:opacity-60"
                  >
                    {busyId === m.id ? '删除中…' : '删除'}
                  </button>
                ) : m.status === 'downloading' ? (
                  <span className="text-xs text-amber-400">
                    下载中 {pct ?? 0}%
                  </span>
                ) : (
                  <button
                    onClick={() => onDownload(m.id)}
                    disabled={!!busyId}
                    className="rounded-md bg-amber-600 px-2 py-1 text-xs font-semibold hover:bg-amber-500 disabled:opacity-60"
                  >
                    下载
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
