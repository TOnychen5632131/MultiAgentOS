import type { AgentAction } from './types';

export async function runOperator(actions: AgentAction[]) {
  const res = await window.api.executeActions(actions);
  if (!res.ok) throw new Error('Operator failed');
}
