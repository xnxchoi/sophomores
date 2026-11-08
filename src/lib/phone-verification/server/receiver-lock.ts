import { createHmac } from 'node:crypto';

type Scope = { origin: string; mailboxId: string; recipient: string; secret: string };
type LockClient = {
  query: (text: string, values: string[]) => Promise<{ rows: { acquired?: boolean }[] }>;
  on: (event: 'error' | 'end', callback: () => void) => unknown;
  release: (destroy: boolean) => void;
};

export class ReceiverOwnershipError extends Error {
  readonly exitCode = 78;
  constructor() { super('Another local receiver owns this runtime'); }
}

/** Session-scoped lock: a dedicated destroyed connection releases it on every exit. */
export async function acquireReceiverLock(connect: () => Promise<LockClient>, config: Scope, onLost: () => void) {
  const client = await connect();
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    client.release(true);
  };
  // Keep an error listener for the destroyed client's final asynchronous events.
  const lost = () => { if (!released) onLost(); };
  client.on('error', lost); client.on('end', lost);
  const key = createHmac('sha256', config.secret).update('receiver-singleton-v1\0')
    .update(JSON.stringify([config.origin, config.mailboxId, config.recipient])).digest().readBigInt64BE().toString();
  try {
    const result = await client.query('SELECT pg_try_advisory_lock($1::bigint) AS acquired', [key]);
    if (result.rows.length !== 1 || result.rows[0].acquired !== true) throw new ReceiverOwnershipError();
    return { release };
  } catch (error) {
    release();
    if (error instanceof ReceiverOwnershipError) throw error;
    throw new Error('Receiver lock unavailable');
  }
}
