"use client";

import { HA_Command as Command, HA_CommandEmpty as CommandEmpty, HA_CommandGroup as CommandGroup, HA_CommandInput as CommandInput, HA_CommandItem as CommandItem, HA_CommandList as CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Check, Globe, Loader2, Pencil, X } from "lucide-react";
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
import {
  POPULAR_SITES,
  matchSite,
  urlPrefixFor,
  type PopularSite
} from "./_popular-sites";

/**
 * Tier 2 specialization — link field with a popular-sites combobox.
 *
 * Same deferred-edit shape as <EditableField/>, but the inline editor
 * surfaces a cmdk popular-sites combobox above the URL input. Picking
 * a site pre-fills `https://${domain}/` and focuses the URL input with
 * the caret placed immediately after the slash, so the user can just
 * type their handle. A "Custom URL" entry leaves the input empty for
 * any URL the user wants.
 *
 * On save: validates the URL syntactically (same rule as <EditableField/>
 * for links) and persists via the caller-supplied onSave.
 */

interface EditableLinkProps {
  label: string;
  description?: string;
  value: string;
  onSave: (next: string) => Promise<SaveResult> | SaveResult;
  emptyHint?: string;
  saveTimeoutMs?: number;
  className?: string;
}

export function EditableLink({
  label,
  description,
  value,
  onSave,
  emptyHint = "https://",
  saveTimeoutMs = DEFAULT_SAVE_TIMEOUT_MS,
  className
}: EditableLinkProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const errorId = useId();

  // Pre-select the matching site (if any) so the combobox highlights
  // the entry when the field is opened with an existing value.
  const initialSite = matchSite(value);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(
    initialSite?.id ?? null
  );

  useEffect(() => {
    if (!editing) {
      setDraft(value);
      setSelectedSiteId(matchSite(value)?.id ?? null);
    }
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      const len = inputRef.current.value.length;
      inputRef.current.focus();
      inputRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  const enterEdit = useCallback(() => {
    setDraft(value);
    setError(null);
    setEditing(true);
  }, [value]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setError(null);
    setPending(false);
    setDraft(value);
    setSelectedSiteId(matchSite(value)?.id ?? null);
  }, [value]);

  const validateUrl = (next: string): string | null => {
    if (!next) return null;
    try {
      const u = new URL(next.startsWith("http") ? next : `https://${next}`);
      return u.hostname.includes(".") ? null : "Enter a valid URL";
    } catch {
      return "Enter a valid URL";
    }
  };

  const commit = useCallback(async () => {
    const next = draft.trim();
    if (next === value) {
      setEditing(false);
      return;
    }
    const err = validateUrl(next);
    if (err) {
      setError(err);
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
        Promise.resolve(onSave(next)),
        timeoutPromise
      ]);
      if (
        result &&
        typeof result === "object" &&
        "ok" in result &&
        !result.ok
      ) {
        setError(result.message ?? "Couldn't save");
        // Reset the combobox highlight to whatever the upstream value
        // matches now — the failed-save attempt should not leave a
        // visually-selected site that wasn't persisted. Audit
        // breakpoint-4 finding.
        setSelectedSiteId(matchSite(value)?.id ?? null);
        return;
      }
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
      // Same reset logic for thrown errors.
      setSelectedSiteId(matchSite(value)?.id ?? null);
    } finally {
      setPending(false);
    }
  }, [draft, value, onSave, saveTimeoutMs]);

  const onSiteSelect = (site: PopularSite) => {
    const prefix = urlPrefixFor(site);
    setDraft(prefix);
    setSelectedSiteId(site.id);
    // Defer focus so cmdk's selection animation completes first.
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(prefix.length, prefix.length);
    });
  };

  const onSiteSelectCustom = () => {
    setDraft("");
    setSelectedSiteId(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    } else if (e.key === "Enter") {
      e.preventDefault();
      void commit();
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
        <div className="flex w-full flex-col gap-3">
          <div className="overflow-hidden rounded-lg border border-foreground/15 bg-foreground/[0.02] dark:bg-foreground/[0.04]">
            <Command className="bg-transparent">
              <CommandInput
                placeholder="Pick a site or type a URL"
                className="border-0 text-sm"
              />
              <CommandList className="max-h-48">
                <CommandEmpty className="py-3 text-xs text-foreground/55">
                  No matches
                </CommandEmpty>
                <CommandGroup heading="Popular sites">
                  {POPULAR_SITES.map((site) => (
                    <CommandItem
                      key={site.id}
                      value={`${site.id} ${site.label} ${site.domain} ${(
                        site.keywords ?? []
                      ).join(" ")}`}
                      onSelect={() => onSiteSelect(site)}
                      className={cn(
                        selectedSiteId === site.id &&
                          "bg-foreground/[0.06] dark:bg-foreground/[0.08]"
                      )}
                    >
                      <span className="text-sm">{site.label}</span>
                      <span className="ml-auto text-[11px] text-foreground/55 tabular-nums">
                        {site.domain}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandGroup heading="Or">
                  <CommandItem value="custom-url" onSelect={onSiteSelectCustom}>
                    <Globe size={12} className="mr-2 text-foreground/55" />
                    <span className="text-sm">Custom URL</span>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
          <label htmlFor={inputId} className="sr-only">
            {label}
          </label>
          <div className="flex items-center gap-2">
            <input
              id={inputId}
              ref={inputRef}
              type="url"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              maxLength={200}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              aria-busy={pending}
              disabled={pending}
              placeholder="https://"
              className="min-w-0 flex-1 border-b border-foreground/40 bg-transparent pb-1 text-sm text-foreground placeholder:text-foreground/40 focus:border-foreground focus:outline-none disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void commit()}
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
            {value ? (
              value.replace(/^https?:\/\//, "").replace(/\/$/, "")
            ) : (
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
