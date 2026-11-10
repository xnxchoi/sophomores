// Shell-only fixture: no request is supplied, so the page's async disclosure
// remains suspended. This does not simulate completed async server rendering.
let attempts = { connections: 0, payload: 0 };
const pendingRequest = new Promise<void>(() => {});

export function connection(): Promise<void> {
  attempts = { ...attempts, connections: attempts.connections + 1 };
  return pendingRequest;
}

export function getPayload(): never {
  attempts = { ...attempts, payload: attempts.payload + 1 };
  throw new Error("Homepage SSR fixture forbids Payload/provider access");
}

export const readHomepageBoundaryAttempts = () => ({ ...attempts });

// Never import the validated production config or read credentials in this fixture.
export default Object.freeze({});
