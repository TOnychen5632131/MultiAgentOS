import { useSyncExternalStore } from 'react';
import SessionPane from './SessionPane';
import type { MultiSessionManager } from '../lib/sessionManager';
import type { SessionState } from '../lib/types';

type Props = { manager: MultiSessionManager };

export default function MultiSessionGrid({ manager }: Props) {
  const sessions = useSyncExternalStore(
    (cb) => manager.subscribe(cb),
    () => manager.snapshot(),
  );

  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-3">
      {sessions.map((session: SessionState) => (
        <SessionPane key={session.id} session={session} manager={manager} />
      ))}
    </div>
  );
}
