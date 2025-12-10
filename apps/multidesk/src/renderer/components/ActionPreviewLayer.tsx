import type { AgentPlan } from '../lib/types';

export default function ActionPreviewLayer({ plan }: { plan: AgentPlan }) {
  return (
    <div className="pointer-events-none absolute inset-0 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
      <p className="mb-2 text-xs font-semibold text-amber-200">动作预览</p>
      <ol className="space-y-1 text-xs text-amber-100">
        {plan.actions.map((action) => (
          <li key={action.id} className="rounded bg-amber-500/10 px-2 py-1">
            <span className="font-semibold">{action.type}</span> —{' '}
            {action.description}
          </li>
        ))}
      </ol>
    </div>
  );
}
