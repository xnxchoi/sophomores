"use client";

import { HA_Command as Command, HA_CommandEmpty as CommandEmpty, HA_CommandGroup as CommandGroup, HA_CommandInput as CommandInput, HA_CommandItem as CommandItem, HA_CommandList as CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Check, Loader2, MapPin, Pencil, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent
} from "react";

import { FieldRow } from "./FieldRow";
import { DEFAULT_SAVE_TIMEOUT_MS, type SaveResult } from "./types";

/**
 * Tier 2 specialization — location field with a place-autocomplete combobox.
 *
 * Behaviour, when a place-search backend is wired:
 *  - User types in the cmdk input.
 *  - The input is debounced (~250ms) and passed to a `searchPlaces`
 *    backend (Mapbox Places, Google Places, or whichever the project
 *    settles on). The backend MUST filter to city-grade results only —
 *    not addresses, not neighbourhoods. The component never persists a
 *    raw address.
 *  - Selecting a result fills the value as `${place}, ${country}` and
 *    the user is dropped back to the read-only state on save.
 *
 * Until a backend is wired (status: pending Mapbox token + /api/places
 * route), the component falls back to a plain free-text editor with
 * no autocomplete. This is by design — better to ship a working text
 * field than a half-finished combobox.
 *
 * To enable the combobox, supply `searchPlaces`:
 *
 *   <EditableLocation searchPlaces={async (q) => fetch(...).then(r => r.json())} ... />
 *
 * The expected response shape is { results: Place[] } where each Place
 * has { label: "Seoul, South Korea", value: "Seoul, South Korea" }.
 */

interface Place {
  /** Visible label, e.g. "Seoul, South Korea". */
  label: string;
  /** Stored value (usually identical to label for v1). */
  value: string;
}

interface EditableLocationProps {
  label: string;
  description?: string;
  value: string;
  onSave: (next: string) => Promise<SaveResult> | SaveResult;
  emptyHint?: string;
  /**
   * Optional place-search backend. When provided, the component renders
   * a cmdk autocomplete combobox. When omitted, falls back to a plain
   * inline text editor (no autocomplete).
   *
   * The backend is responsible for filtering to city-grade results only.
   */
  searchPlaces?: (query: string) => Promise<{ results: Place[] }>;
  /** Debounce delay (ms) for searchPlaces calls. Defaults to 250. */
  searchDebounceMs?: number;
  saveTimeoutMs?: number;
  className?: string;
}

const DEFAULT_SEARCH_DEBOUNCE_MS = 250;

export function EditableLocation({
  label,
  description,
  value,
  onSave,
  emptyHint = "Seoul",
  searchPlaces,
  searchDebounceMs = DEFAULT_SEARCH_DEBOUNCE_MS,
  saveTimeoutMs = DEFAULT_SAVE_TIMEOUT_MS,
  className
}: EditableLocationProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const errorId = useId();

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  // Debounced place search.
  useEffect(() => {
    if (!editing || !searchPlaces || !query.trim()) {
      setResults([]);
      return;
    }
    const ac = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { results } = await searchPlaces(query);
        if (!ac.signal.aborted) setResults(results);
      } catch {
        // Silent: combobox just shows empty state. The field still works
        // as a free-text input.
        if (!ac.signal.aborted) setResults([]);
      } finally {
        if (!ac.signal.aborted) setSearching(false);
      }
    }, searchDebounceMs);
    return () => {
      ac.abort();
      clearTimeout(t);
    };
  }, [editing, query, searchPlaces, searchDebounceMs]);

  const enterEdit = useCallback(() => {
    setDraft(value);
    setError(null);
    setEditing(true);
    setQuery("");
  }, [value]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setError(null);
    setPending(false);
    setDraft(value);
    setQuery("");
  }, [value]);

  const commit = useCallback(
    async (next: string) => {
      const trimmed = next.trim();
      if (trimmed === value) {
        setEditing(false);
        return;
      }
      setPending(true);
      setError(null);
      const timeoutPromise = new Promise<{ ok: false; message: string }>(
        (resolve) => {
          setTimeout(
            () =>
              resolve({
                ok: false,
                message: "Save timed out. Try again."
              }),
            saveTimeoutMs
          );
        }
      );
      try {
        const result = await Promise.race([
          Promise.resolve(onSave(trimmed)),
          timeoutPromise
        ]);
        if (
          result &&
          typeof result === "object" &&
          "ok" in result &&
          !result.ok
        ) {
          setError(result.message ?? "Couldn't save");
          return;
        }
        setEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save");
      } finally {
        setPending(false);
      }
    },
    [value, onSave, saveTimeoutMs]
  );

  const onSelect = (place: Place) => {
    setDraft(place.value);
    void commit(place.value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    } else if (e.key === "Enter") {
      e.preventDefault();
      void commit(draft);
    }
  };

  return (
    <FieldRow
      label={label}
      description={description}
      align="stack"
      interactive={!editing}
      className={className}
    >
      {editing ? (
        searchPlaces ? (
          // Autocomplete mode (when a place-search backend is wired).
          <div className="flex w-full flex-col gap-3">
            <div className="overflow-hidden rounded-lg border border-foreground/15 bg-foreground/[0.02] dark:bg-foreground/[0.04]">
              <Command className="bg-transparent" shouldFilter={false}>
                <CommandInput
                  placeholder="Type a city"
                  value={query}
                  onValueChange={setQuery}
                  className="border-0 text-sm"
                />
                <CommandList className="max-h-56">
                  {searching ? (
                    <div className="flex items-center justify-center py-3 text-xs text-foreground/55">
                      <Loader2 size={12} className="mr-2 animate-spin" />
                      Searching…
                    </div>
                  ) : (
                    <>
                      <CommandEmpty className="py-3 text-xs text-foreground/55">
                        {query.trim() ? "No matching cities" : "Type to search"}
                      </CommandEmpty>
                      {results.length > 0 ? (
                        <CommandGroup heading="Cities">
                          {results.map((p) => (
                            <CommandItem
                              key={p.value}
                              value={p.value}
                              onSelect={() => onSelect(p)}
                            >
                              <MapPin
                                size={12}
                                className="mr-2 text-foreground/55"
                              />
                              <span className="text-sm">{p.label}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ) : null}
                    </>
                  )}
                </CommandList>
              </Command>
            </div>
            <button
              type="button"
              onClick={cancelEdit}
              className="self-end text-xs text-foreground/55 transition-colors hover:text-foreground/85"
            >
              Cancel
            </button>
            {error ? (
              <span className="text-xs text-rouge-500/85" role="alert">
                {error}
              </span>
            ) : null}
          </div>
        ) : (
          // Free-text fallback (no place-search backend wired).
          <div className="flex w-full flex-col gap-2">
            <label htmlFor={inputId} className="sr-only">
              {label}
            </label>
            <div className="flex items-center gap-2">
              <input
                id={inputId}
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                maxLength={64}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                aria-busy={pending}
                disabled={pending}
                placeholder={emptyHint}
                className="min-w-0 flex-1 border-b border-foreground/40 bg-transparent pb-1 text-sm text-foreground placeholder:text-foreground/40 focus:border-foreground focus:outline-none disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => void commit(draft)}
                disabled={pending}
                aria-label="Save"
                aria-busy={pending}
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-1 focus-visible:ring-foreground/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:opacity-40"
              >
                {pending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} strokeWidth={1.6} />
                )}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                aria-label="Cancel"
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-foreground/55 transition-colors hover:bg-foreground/[0.06] hover:text-foreground/85 focus-visible:ring-1 focus-visible:ring-foreground/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              >
                <X size={14} strokeWidth={1.6} />
              </button>
            </div>
            {error ? (
              <span
                id={errorId}
                className="text-xs text-rouge-500/85"
                role="alert"
              >
                {error}
              </span>
            ) : null}
          </div>
        )
      ) : (
        <button
          type="button"
          onClick={enterEdit}
          className="group/edit flex items-center gap-2.5 rounded text-left transition-colors focus-visible:ring-1 focus-visible:ring-foreground/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          aria-label={`Edit ${label}`}
        >
          <span
            className={cn(
              "border-b border-transparent pb-px text-sm text-foreground/85 transition-colors",
              "group-hover:border-foreground/30 group-hover:text-foreground"
            )}
          >
            {value || (
              <span className="text-foreground/45 dark:text-foreground/40">
                {emptyHint}
              </span>
            )}
          </span>
          <Pencil
            size={12}
            strokeWidth={1.5}
            aria-hidden="true"
            className="shrink-0 text-foreground/55 transition-colors group-hover:text-foreground/85 dark:text-foreground/50"
          />
        </button>
      )}
    </FieldRow>
  );
}
