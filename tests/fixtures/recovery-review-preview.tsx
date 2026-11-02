import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { RecoveryReview } from "../../lib/payload/admin/recovery-review";
import { ReviewPreviewDocument } from "./recovery-review-payload";

function ReviewPreview() {
  const [state, setState] = useState<{
    mode: string;
    delayMs: number;
    revision: number;
  } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    void fetch("/fixture/state")
      .then((response) => response.json())
      .then(setState)
      .catch(() => setError(true));
  }, []);
  async function configure() {
    if (!state) return;
    try {
      const response = await fetch("/fixture/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: state.mode, delayMs: state.delayMs })
      });
      if (response.ok) window.location.reload();
      else setError(true);
    } catch {
      setError(true);
    }
  }
  return (
    <main className="staff:mx-auto staff:max-w-[760px] staff:px-6 staff:py-10">
      <header className="staff:mb-8">
        <h1 className="staff:mb-2 staff:text-2xl">Synthetic review preview</h1>
        <p>
          No real staff session, database, message or account change. Native
          Payload controls below.
        </p>
      </header>
      {error && <p role="alert">Fixture unavailable.</p>}
      {state && (
        <>
          <ReviewPreviewDocument
            value={{
              id: "019a4000-0000-7000-8000-000000000001",
              data: { revision: state.revision }
            }}
          >
            <RecoveryReview />
          </ReviewPreviewDocument>
          <details className="staff:mt-10 staff:border-t staff:border-(--theme-elevation-200) staff:pt-6">
            <summary>
              Visual fixture controls — synthetic responses only
            </summary>
            <label className="staff:mt-4 staff:block">
              Response
              <select
                value={state.mode}
                onChange={(event) =>
                  setState({ ...state, mode: event.target.value })
                }
              >
                <option value="success">Success</option>
                <option value="conflict">Conflict</option>
                <option value="unavailable">Unavailable</option>
                <option value="malformed">Malformed receipt</option>
              </select>
            </label>
            <label className="staff:mt-4 staff:block">
              Response delay (milliseconds)
              <input
                type="number"
                min={0}
                max={5000}
                value={state.delayMs}
                onChange={(event) =>
                  setState({ ...state, delayMs: Number(event.target.value) })
                }
              />
            </label>
            <button
              className="staff:mt-4 staff:min-h-11"
              type="button"
              onClick={() => {
                void configure();
              }}
            >
              Apply and reset fixture
            </button>
          </details>
        </>
      )}
    </main>
  );
}
const root = document.getElementById("root");
if (!root) throw new Error("Review fixture root is unavailable");
createRoot(root).render(<ReviewPreview />);
