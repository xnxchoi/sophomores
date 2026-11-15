"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode
} from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useConfig } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";
import { cn } from "@/lib/utils";
import type { DoorResult, DoorSearchRow } from "@/lib/commerce/door/check-in";
import "@/styles/staff-login.css";

type DoorEvent = { id: string; name: string };
type Count = { checkedIn: number; total: number };
type Shown =
  | { kind: "result"; result: DoorResult }
  | { kind: "failed"; retry: () => void }
  | { kind: "checking" };
type Detector = {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
};
type DetectorConstructor = new (options: { formats: string[] }) => Detector;

const notFoundCodes = new Set([
  "unknown-network",
  "unknown-lock",
  "unknown-token",
  "unknown-admission"
]);

function barcodeDetector(): DetectorConstructor | undefined {
  return (globalThis as unknown as { BarcodeDetector?: DetectorConstructor })
    .BarcodeDetector;
}

export function DoorConsole({
  allowed,
  events
}: {
  allowed: boolean;
  events: DoorEvent[];
}) {
  const t = useTranslations("Staff.door");
  if (!allowed)
    return (
      <Page>
        <p className="staff:m-0 staff:text-base">{t("staffOnly")}</p>
      </Page>
    );
  if (!events.length)
    return (
      <Page>
        <p className="staff:m-0 staff:text-base">{t("noEvents")}</p>
      </Page>
    );
  return (
    <Page>
      <Door events={events} />
    </Page>
  );
}

function Page({ children }: { children: ReactNode }) {
  const t = useTranslations("Staff.door");
  return (
    <main className="staff:mx-auto staff:flex staff:w-full staff:max-w-xl staff:flex-col staff:gap-5 staff:px-4 staff:py-5 staff:text-[var(--theme-text)]">
      <h1 className="staff:m-0 staff:text-2xl staff:font-semibold">
        {t("title")}
      </h1>
      {children}
    </main>
  );
}

function Door({ events }: { events: DoorEvent[] }) {
  const t = useTranslations("Staff.door");
  const { config } = useConfig();
  const api = (path: `/${string}`) =>
    formatAdminURL({ apiRoute: config.routes.api, path });
  const [eventID, setEventID] = useState(events[0].id);
  const [count, setCount] = useState<Count | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const pending = useRef(false);

  useEffect(() => {
    let live = true;
    setCount(null);
    setShown(null);
    fetch(api(`/commerce/door/events/${encodeURIComponent(eventID)}/count`), {
      credentials: "include",
      cache: "no-store"
    })
      .then((response) =>
        response.ok ? (response.json() as Promise<Count>) : null
      )
      .then((value) => {
        if (live) setCount(value);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when the event changes
  }, [eventID]);

  async function checkIn(
    body:
      { method: "qr"; scan: string } | { method: "name"; admissionID: string }
  ) {
    if (pending.current) return;
    pending.current = true;
    setShown({ kind: "checking" });
    try {
      const response = await fetch(api("/commerce/door/check-in"), {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventID, ...body })
      });
      if (!response.ok) throw new Error("Check-in failed");
      const value = (await response.json()) as {
        result: DoorResult;
        count: Count | null;
      };
      setShown({ kind: "result", result: value.result });
      // A failed count leaves the last known count; the outcome still shows.
      if (value.count) setCount(value.count);
    } catch {
      setShown({ kind: "failed", retry: () => void checkIn(body) });
    } finally {
      pending.current = false;
    }
  }

  return (
    <>
      <div className="staff:flex staff:flex-col staff:gap-2">
        <Label htmlFor="door-event">{t("event")}</Label>
        <select
          id="door-event"
          value={eventID}
          onChange={(event) => setEventID(event.target.value)}
          className="staff:min-h-12 staff:w-full staff:rounded-lg staff:border staff:border-[var(--theme-elevation-250)] staff:bg-[var(--theme-input-bg)] staff:px-3 staff:text-base staff:text-[var(--theme-text)]"
        >
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
        <p
          aria-live="polite"
          className="staff:m-0 staff:text-lg staff:font-semibold staff:tabular-nums"
        >
          {count ? t("count", count) : t("countUnavailable")}
        </p>
      </div>
      <Outcome shown={shown} />
      <Scan
        disabled={shown?.kind === "checking"}
        onScan={(scan) => void checkIn({ method: "qr", scan })}
      />
      <NameSearch
        key={eventID}
        eventID={eventID}
        disabled={shown?.kind === "checking"}
        onCheckIn={(admissionID) =>
          void checkIn({ method: "name", admissionID })
        }
      />
    </>
  );
}

function Label(props: ComponentProps<"label">) {
  return (
    <label
      {...props}
      className={cn(
        "staff:text-sm staff:font-medium staff:text-[var(--theme-elevation-800)]",
        props.className
      )}
    />
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="staff:flex staff:flex-col staff:gap-3 staff:rounded-xl staff:border staff:border-[var(--theme-elevation-150)] staff:p-4">
      <h2 className="staff:m-0 staff:text-lg staff:font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function TextInput(props: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={cn(
        "staff:min-h-12 staff:w-full staff:min-w-0 staff:rounded-lg staff:border staff:border-[var(--theme-elevation-250)] staff:bg-[var(--theme-input-bg)] staff:px-3 staff:text-base staff:text-[var(--theme-text)]",
        props.className
      )}
    />
  );
}

function Action({
  quiet = false,
  ...props
}: ComponentProps<"button"> & { quiet?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "staff:min-h-12 staff:min-w-12 staff:shrink-0 staff:cursor-pointer staff:rounded-lg staff:px-4 staff:text-base staff:font-semibold staff:disabled:cursor-not-allowed staff:disabled:opacity-50",
        quiet
          ? "staff:border staff:border-[var(--theme-elevation-250)] staff:bg-transparent staff:text-[var(--theme-text)]"
          : "staff:border-0 staff:bg-[var(--theme-text)] staff:text-[var(--theme-bg)]",
        props.className
      )}
    />
  );
}

function Outcome({ shown }: { shown: Shown | null }) {
  const t = useTranslations("Staff.door");
  const format = useFormatter();
  const time = (value: string) =>
    format.dateTime(new Date(value), { hour: "2-digit", minute: "2-digit" });
  if (!shown) return null;
  if (shown.kind === "checking")
    return <Card tone="neutral" title={t("checking")} />;
  if (shown.kind === "failed")
    return (
      <Card
        tone="neutral"
        title={t("failed")}
        body={t("failedBody")}
        action={<Action onClick={shown.retry}>{t("tryAgain")}</Action>}
      />
    );
  const { result } = shown;
  if (result.outcome !== "refused")
    return result.outcome === "admitted" || result.justAdmitted ? (
      <Card
        tone="admitted"
        title={result.outcome === "admitted" ? t("admitted") : t("justAdmitted")}
        name={result.guest.name}
        body={result.outcome === "admitted" ? t("admittedBody") : t("justAdmittedBody")}
      />
    ) : (
      <Card
        tone="warning"
        title={t("alreadyCheckedIn")}
        name={result.guest.name}
        body={t("alreadyCheckedInBody", { time: time(result.checkedInAt) })}
      />
    );
  if (notFoundCodes.has(result.code))
    return (
      <Card tone="refused" title={t("notFound")} body={t("notFoundBody")} />
    );
  return (
    <Card
      tone="refused"
      title={t("refused")}
      name={result.guest?.name}
      body={t(`reasons.${result.code as "held"}`)}
    />
  );
}

function Card({
  tone,
  title,
  name,
  body,
  action
}: {
  tone: "admitted" | "warning" | "refused" | "neutral";
  title: string;
  name?: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="assertive"
      className={cn(
        "staff:flex staff:flex-col staff:gap-2 staff:rounded-xl staff:border-2 staff:p-4",
        tone === "admitted" &&
          "staff:border-emerald-600 staff:bg-emerald-50 staff:text-emerald-950",
        tone === "warning" &&
          "staff:border-amber-500 staff:bg-amber-50 staff:text-amber-950",
        tone === "refused" &&
          "staff:border-red-600 staff:bg-red-50 staff:text-red-950",
        tone === "neutral" &&
          "staff:border-[var(--theme-elevation-250)] staff:text-[var(--theme-text)]"
      )}
    >
      <p className="staff:m-0 staff:text-2xl staff:font-bold">{title}</p>
      {name && (
        <p className="staff:m-0 staff:text-lg staff:font-semibold">{name}</p>
      )}
      {body && <p className="staff:m-0 staff:text-base">{body}</p>}
      {action}
    </div>
  );
}

function Scan({
  disabled,
  onScan
}: {
  disabled: boolean;
  onScan: (scan: string) => void;
}) {
  const t = useTranslations("Staff.door");
  const [value, setValue] = useState("");
  const [camera, setCamera] = useState<
    "off" | "on" | "unavailable" | "blocked"
  >("off");
  const [supported, setSupported] = useState(true);
  const input = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => {
    setSupported(!!barcodeDetector() && !!navigator.mediaDevices?.getUserMedia);
  }, []);
  useEffect(
    () => () => stream.current?.getTracks().forEach((track) => track.stop()),
    []
  );

  function stop() {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    setCamera("off");
  }

  async function start() {
    const Detector = barcodeDetector();
    if (!Detector) {
      setCamera("unavailable");
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      setCamera("on");
      const element = video.current!;
      element.srcObject = stream.current;
      await element.play();
      const detector = new Detector({ formats: ["qr_code"] });
      const look = async () => {
        if (!stream.current) return;
        const [code] = await detector.detect(element).catch(() => []);
        if (code?.rawValue) {
          stop();
          onScan(code.rawValue);
          return;
        }
        setTimeout(() => void look(), 200);
      };
      void look();
    } catch {
      stop();
      setCamera("blocked");
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const scan = value.trim();
    if (!scan || disabled) return;
    onScan(scan);
    setValue("");
    input.current?.focus();
  }

  return (
    <Section title={t("scanHeading")}>
      {supported ? (
        camera === "on" ? (
          <>
            <video
              ref={video}
              muted
              playsInline
              className="staff:aspect-square staff:w-full staff:rounded-lg staff:bg-black staff:object-cover"
            />
            <Action quiet onClick={stop}>
              {t("stopCamera")}
            </Action>
          </>
        ) : (
          <>
            <video ref={video} muted playsInline className="staff:hidden" />
            <Action disabled={disabled} onClick={() => void start()}>
              {t("startCamera")}
            </Action>
            {camera === "blocked" && (
              <p className="staff:m-0 staff:text-sm">{t("cameraBlocked")}</p>
            )}
          </>
        )
      ) : (
        <p className="staff:m-0 staff:text-sm">{t("cameraUnavailable")}</p>
      )}
      <form onSubmit={submit} className="staff:flex staff:flex-col staff:gap-2">
        <Label htmlFor="door-scan">{t("scanLabel")}</Label>
        <div className="staff:flex staff:gap-2">
          <TextInput
            ref={input}
            id="door-scan"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={t("scanPlaceholder")}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            inputMode="url"
          />
          <Action type="submit" disabled={disabled || !value.trim()}>
            {t("checkIn")}
          </Action>
        </div>
      </form>
    </Section>
  );
}

function NameSearch({
  eventID,
  disabled,
  onCheckIn
}: {
  eventID: string;
  disabled: boolean;
  onCheckIn: (admissionID: string) => void;
}) {
  const t = useTranslations("Staff.door");
  const format = useFormatter();
  const { config } = useConfig();
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState<{
    query: string;
    results: DoorSearchRow[];
  } | null>(null);
  const [busy, setBusy] = useState(false);

  async function search(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q || busy) return;
    setBusy(true);
    try {
      const response = await fetch(
        formatAdminURL({
          apiRoute: config.routes.api,
          path: `/commerce/door/events/${encodeURIComponent(eventID)}/search?q=${encodeURIComponent(q)}`
        }),
        { credentials: "include", cache: "no-store" }
      );
      const value = response.ok
        ? ((await response.json()) as { results: DoorSearchRow[] })
        : { results: [] };
      setSearched({ query: q, results: value.results });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title={t("nameHeading")}>
      <form onSubmit={search} className="staff:flex staff:flex-col staff:gap-2">
        <Label htmlFor="door-name">{t("nameLabel")}</Label>
        <div className="staff:flex staff:gap-2">
          <TextInput
            id="door-name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />
          <Action type="submit" quiet disabled={busy || !query.trim()}>
            {t("search")}
          </Action>
        </div>
      </form>
      {searched &&
        (searched.results.length ? (
          <ul className="staff:m-0 staff:flex staff:list-none staff:flex-col staff:gap-2 staff:p-0">
            {searched.results.map((row) => (
              <li
                key={row.admissionID}
                className="staff:flex staff:items-center staff:justify-between staff:gap-3 staff:border-t staff:border-[var(--theme-elevation-150)] staff:pt-2"
              >
                <div className="staff:flex staff:min-w-0 staff:flex-col">
                  <span className="staff:truncate staff:text-base staff:font-semibold">
                    {row.name}
                  </span>
                  <span className="staff:text-sm staff:text-[var(--theme-elevation-700)]">
                    {row.kind === "member" ? t("member") : t("guest")}
                    {row.checkedInAt
                      ? ` · ${t("checkedInAt", { time: format.dateTime(new Date(row.checkedInAt), { hour: "2-digit", minute: "2-digit" }) })}`
                      : ""}
                  </span>
                </div>
                {row.status !== "checked-in" && (
                  <Action
                    disabled={disabled}
                    onClick={() => {
                      onCheckIn(row.admissionID);
                      setSearched(null);
                      setQuery("");
                    }}
                  >
                    {t("checkIn")}
                  </Action>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="staff:m-0 staff:text-base">
            {t("noMatches", { query: searched.query })}
          </p>
        ))}
    </Section>
  );
}
