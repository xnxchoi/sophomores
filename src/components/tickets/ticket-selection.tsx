"use client";
import { useTranslations } from "next-intl";


import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from "react";
import { NumberField } from "@base-ui/react/number-field";
import { motion } from "motion/react";
import {
  Check,
  ChevronLeft,
  LoaderCircle,
  LockKeyhole,
  Minus,
  Plus,
  Ticket
} from "lucide-react";
import { z } from "zod";
import { BrandMark } from "@/lib/brand";
import { cn } from "@/lib/utils";
import {
  createMemberClient,
  parseMemberStatus,
  type MemberClient,
  type MemberStatus
} from "@/lib/member-auth/client";
import type { MemberCapabilities } from "@/lib/member-auth/contracts";
import {
  readTicketSelectionDraft,
  saveTicketSelectionDraft,
  TICKET_SELECTION_DRAFT_KEY,
  type SelectionItem,
  type TicketDraftResult
} from "@/lib/tickets/selection-draft";
import { TicketClamp } from "@/lib/tickets/tickets";
import { subscribeVisibility } from "@/utils/browser/visibility";
import { MemberAccountFlow } from "@/components/Authentication/member-auth/account-study";
import { PortOneCheckoutButton } from "./portone-checkout";
import type { PortOneCatalogue } from "@/lib/tickets/portone/config";

const ticketTypeSchema = z
  .strictObject({
    id: z.string().min(1).max(128),
    label: z.string().min(1).max(128),
    minimumQuantity: z.int().positive().max(1000),
    maximumQuantity: z.int().positive().max(1000),
    available: z.boolean().optional()
  })
  .refine((type) => type.minimumQuantity <= type.maximumQuantity);
const catalogueSchema = z
  .strictObject({
    kind: z.literal("test"),
    version: z.string().min(1).max(128),
    currency: z.string().regex(/^[A-Z]{3}$/),
    maximumTotalQuantity: z.int().positive().max(1000),
    ticketTypes: z.array(ticketTypeSchema).min(1).max(20)
  })
  .refine(
    (value) =>
      new Set(value.ticketTypes.map((type) => type.id)).size ===
      value.ticketTypes.length
  );
const quoteSchema = z.strictObject({
  catalogueVersion: z.string(),
  currency: z.string(),
  items: z
    .array(
      z.strictObject({
        ticketTypeId: z.string(),
        quantity: z.int().positive(),
        unitAmountMinor: z.int().nonnegative(),
        totalAmountMinor: z.int().nonnegative()
      })
    )
    .length(1),
  totalAmountMinor: z.int().nonnegative(),
  issuedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  reservation: z.literal("none"),
  checkoutAvailable: z.literal(false)
});

export type TicketPreviewCatalogue = {
  kind: "test";
  version: string;
  currency: string;
  maximumTotalQuantity: number;
  ticketTypes: readonly {
    id: string;
    label: string;
    minimumQuantity: number;
    maximumQuantity: number;
    available?: boolean;
  }[];
};
export type TicketPreviewQuote = {
  catalogueVersion: string;
  currency: string;
  items: readonly {
    ticketTypeId: string;
    quantity: number;
    unitAmountMinor: number;
    totalAmountMinor: number;
  }[];
  totalAmountMinor: number;
  issuedAt: string;
  expiresAt: string;
  reservation: "none";
  checkoutAvailable: false;
};
export type TicketQuoteAdapter = {
  request(
    input: { catalogueVersion: string; items: readonly SelectionItem[] },
    options?: { signal?: AbortSignal }
  ): Promise<TicketPreviewQuote>;
};
type Selection = { ticketTypeId: string; quantity: number | null };
type QuoteState =
  | { state: "idle" }
  | {
      state: "pending" | "error";
      key: string;
      catalogue: TicketPreviewCatalogue;
      adapter: TicketQuoteAdapter;
    }
  | {
      state: "ready";
      key: string;
      catalogue: TicketPreviewCatalogue;
      adapter: TicketQuoteAdapter;
      value: TicketPreviewQuote;
    };
const previewOption = {
  id: "first-night-preview",
  minimumQuantity: TicketClamp.minimum,
  maximumQuantity: TicketClamp.maximum,
  available: true
};

/** Prices are absent on the real route; injected catalogues are explicitly test-only. */
export function TicketSelection({
  catalogue,
  quoteAdapter,
  memberClient,
  initialCapabilities,
  checkoutCatalogue,
  checkoutReady = false,
  checkoutRequestPayment
}: {
  catalogue?: TicketPreviewCatalogue | null;
  quoteAdapter?: TicketQuoteAdapter;
  memberClient?: MemberClient;
  initialCapabilities?: Readonly<MemberCapabilities>;
  checkoutCatalogue?: PortOneCatalogue | null;
  checkoutReady?: boolean;
  checkoutRequestPayment?: React.ComponentProps<
    typeof PortOneCheckoutButton
  >["requestPayment"];
} = {}) {
  const t = useTranslations('Customer.components_tickets_ticket_selection');
  const parsedCatalogue = useMemo(
    () => catalogueSchema.safeParse(catalogue),
    [catalogue]
  );
  const testCatalogue = parsedCatalogue.success ? parsedCatalogue.data : null;
  const options = useMemo(
    () =>
      testCatalogue?.ticketTypes ??
      (checkoutCatalogue
        ? [
            {
              id: "first-night",
              label: checkoutCatalogue.orderName,
              minimumQuantity: 1,
              maximumQuantity: checkoutCatalogue.maximumQuantity,
              available: true
            }
          ]
        : [{ ...previewOption, label: t('firstNight') }]),
    [testCatalogue, checkoutCatalogue, t]
  );
  const storedDraft = useSyncExternalStore(
    useCallback((notify) => {
      window.addEventListener("storage", notify);
      window.addEventListener("focus", notify);
      return () => {
        window.removeEventListener("storage", notify);
        window.removeEventListener("focus", notify);
      };
    }, []),
    useCallback(() => {
      try {
        return window.localStorage.getItem(TICKET_SELECTION_DRAFT_KEY) ?? "";
      } catch {
        return null;
      }
    }, []),
    () => undefined
  );
  // Revalidate retention on every render: focus/account refresh can advance time without changing stored JSON.
  const draft: TicketDraftResult = (() => {
    if (storedDraft === undefined) return { status: "empty" };
    if (storedDraft === null) return { status: "unavailable" };
    try {
      return readTicketSelectionDraft(window.localStorage);
    } catch {
      return { status: "unavailable" };
    }
  })();
  const [editedSelection, setEditedSelection] = useState<Selection | null>(
    null
  );
  const first =
    options.find((option) => option.available !== false) ?? options[0];
  const saved =
    draft.status === "ready" && draft.draft.items.length === 1
      ? draft.draft.items[0]
      : null;
  const savedOption = options.find(
    (option) => option.id === saved?.ticketTypeId && option.available !== false
  );
  const canRestore =
    saved &&
    savedOption &&
    saved.quantity >= savedOption.minimumQuantity &&
    saved.quantity <=
      Math.min(
        savedOption.maximumQuantity,
        testCatalogue?.maximumTotalQuantity ??
          checkoutCatalogue?.maximumQuantity ??
          TicketClamp.maximum
      );
  const selection =
    editedSelection ??
    (canRestore
      ? { ...saved }
      : { ticketTypeId: first.id, quantity: first.minimumQuantity });
  const draftLoaded = storedDraft !== undefined;
  const [storageError, setStorageError] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const recoveryWithoutOffer =
    paymentBusy && !checkoutCatalogue && !testCatalogue;
  const [retainedPayment, setRetainedPayment] = useState<{
    quantity: number;
    totalAmount: number;
    currency: "KRW" | "USD";
  } | null>(null);
  const draftNotice = editedSelection
    ? null
    : draft.status === "ready" && !canRestore
      ? t('ticketOptionsChangedPleaseReviewYourSelection')
      : draft.status === "expired"
        ? t('yourSavedSelectionExpiredPleaseChooseAgain')
        : draft.status === "invalid"
          ? t('yourSavedSelectionCouldnTBeRestoredPleaseChoose')
          : null;
  const [membership, setMembership] = useState<
    { state: "loading" | "error" } | { state: "ready"; value: MemberStatus }
  >({ state: "loading" });
  const summaryHeading = useRef<HTMLHeadingElement>(null);
  const headingHadFocus = useRef(false);
  const authHadFocus = useRef(false);
  const authPanel = useRef<HTMLDivElement>(null);
  const captureVerifiedFocus = useCallback(() => {
    authHadFocus.current = true;
  }, []);
  const setAuthPanel = useCallback((node: HTMLDivElement | null) => {
    if (node === null && authPanel.current?.contains(document.activeElement))
      authHadFocus.current = true;
    authPanel.current = node;
  }, []);
  const setSummaryHeading = useCallback((node: HTMLHeadingElement | null) => {
    if (node === null) {
      headingHadFocus.current =
        summaryHeading.current !== null &&
        document.activeElement === summaryHeading.current;
      summaryHeading.current = null;
      return;
    }
    summaryHeading.current = node;
    const transferFocus =
      headingHadFocus.current ||
      (authHadFocus.current &&
        (document.activeElement === document.body ||
          Boolean(authPanel.current?.contains(document.activeElement))));
    headingHadFocus.current = false;
    authHadFocus.current = false;
    if (transferFocus) node.focus();
  }, []);
  const [quote, setQuote] = useState<QuoteState>({ state: "idle" });
  const [now, setNow] = useState(Date.now);
  const quoteSequence = useRef(0);
  const quoteAbort = useRef<AbortController | null>(null);
  const pendingContext = useRef<{
    key: string;
    catalogue: TicketPreviewCatalogue;
    adapter: TicketQuoteAdapter;
    controller: AbortController;
  } | null>(null);
  const quoteDeadline = useRef<number | null>(null);
  const cancelQuote = useCallback(() => {
    quoteSequence.current++;
    quoteAbort.current?.abort();
    pendingContext.current = null;
    if (quoteDeadline.current !== null) {
      window.clearTimeout(quoteDeadline.current);
      quoteDeadline.current = null;
    }
  }, []);
  const client = useMemo(() => {
    const source =
      memberClient ??
      createMemberClient(undefined, undefined, "ticket-checkout");
    return {
      ...source,
      status: async () => parseMemberStatus(await source.status())
    };
  }, [memberClient]);
  const quantityId = useId();
  const activeOption = options.find(
    (option) => option.id === selection.ticketTypeId
  );
  const maximum = Math.min(
    activeOption?.maximumQuantity ?? 0,
    testCatalogue?.maximumTotalQuantity ??
      checkoutCatalogue?.maximumQuantity ??
      TicketClamp.maximum
  );
  const validSelection = Boolean(
    activeOption &&
    activeOption.available !== false &&
    selection.quantity !== null &&
    Number.isSafeInteger(selection.quantity) &&
    selection.quantity >= activeOption.minimumQuantity &&
    selection.quantity <= maximum
  );
  const quantityInvalid =
    !paymentBusy &&
    Boolean(
      activeOption &&
      activeOption.available !== false &&
      maximum >= activeOption.minimumQuantity &&
      !validSelection
    );
  const selectionKey = JSON.stringify([
    testCatalogue?.version,
    testCatalogue?.currency,
    selection.ticketTypeId,
    selection.quantity
  ]);
  // Clear during the changed render, not a later effect: returning A → B → A must never revive an old request/result.
  if (
    quote.state !== "idle" &&
    (quote.key !== selectionKey ||
      quote.catalogue !== testCatalogue ||
      quote.adapter !== quoteAdapter)
  )
    setQuote({ state: "idle" });
  const eligible = membership.state === "ready" && membership.value.member;
  const quoteMatches =
    eligible &&
    quote.state !== "idle" &&
    quote.key === selectionKey &&
    quote.catalogue === testCatalogue &&
    quote.adapter === quoteAdapter &&
    validSelection;
  const expired =
    quoteMatches &&
    quote.state === "ready" &&
    now >= Date.parse(quote.value.expiresAt);
  const readyQuote =
    quoteMatches && quote.state === "ready" && !expired ? quote.value : null;
  const quoting = quoteMatches && quote.state === "pending";

  useEffect(() => () => cancelQuote(), [cancelQuote]);

  const updateAccount = useCallback(
    (
      snapshot: import("@/components/Authentication/member-auth/_shared/session").MemberSnapshot
    ) => {
      cancelQuote();
      setQuote({ state: "idle" });
      if (snapshot.busy) setMembership({ state: "loading" });
      else if (!snapshot.status || snapshot.error)
        setMembership({ state: "error" });
      else setMembership({ state: "ready", value: snapshot.status });
    },
    [cancelQuote]
  );

  useEffect(() => {
    if (
      eligible ||
      membership.state !== "ready" ||
      storedDraft === undefined ||
      paymentBusy ||
      !validSelection ||
      draftNotice ||
      (draft.status !== "empty" &&
        (draft.status !== "ready" || draft.draft.returnToTickets))
    )
      return;
    const timer = window.setTimeout(() => {
      try {
        setStorageError(
          saveTicketSelectionDraft(
            window.localStorage,
            [
              {
                ticketTypeId: selection.ticketTypeId,
                quantity: selection.quantity!
              }
            ],
            { returnToTickets: true }
          ).status !== "ready"
        );
      } catch {
        setStorageError(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    eligible,
    membership.state,
    storedDraft,
    paymentBusy,
    validSelection,
    draftNotice,
    selection.ticketTypeId,
    selection.quantity
  ]);

  useEffect(() => {
    const active = pendingContext.current;
    if (
      active &&
      (active.key !== selectionKey ||
        active.catalogue !== testCatalogue ||
        active.adapter !== quoteAdapter)
    )
      cancelQuote();
  }, [selectionKey, testCatalogue, quoteAdapter, cancelQuote]);

  useEffect(() => {
    if (quote.state !== "ready") return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    const unsubscribe = subscribeVisibility(tick);
    return () => {
      window.clearInterval(timer);
      unsubscribe();
    };
  }, [quote]);

  function select(next: Selection) {
    if (paymentBusy) return;
    cancelQuote();
    setQuote({ state: "idle" });
    setEditedSelection(next);
    const option = options.find(
      (candidate) =>
        candidate.id === next.ticketTypeId && candidate.available !== false
    );
    if (
      !option ||
      next.quantity === null ||
      !Number.isSafeInteger(next.quantity) ||
      next.quantity < option.minimumQuantity ||
      next.quantity >
        Math.min(
          option.maximumQuantity,
          testCatalogue?.maximumTotalQuantity ??
            checkoutCatalogue?.maximumQuantity ??
            TicketClamp.maximum
        )
    )
      return;
    try {
      setStorageError(
        saveTicketSelectionDraft(window.localStorage, [
          { ticketTypeId: next.ticketTypeId, quantity: next.quantity }
        ]).status !== "ready"
      );
    } catch {
      setStorageError(true);
    }
  }

  async function requestQuote() {
    if (
      !eligible ||
      !validSelection ||
      !testCatalogue ||
      !quoteAdapter ||
      quoting
    )
      return;
    const request = ++quoteSequence.current;
    const key = selectionKey;
    const quantity = selection.quantity!;
    const ticketTypeId = selection.ticketTypeId;
    const controller = new AbortController();
    quoteAbort.current?.abort();
    quoteAbort.current = controller;
    pendingContext.current = {
      key,
      catalogue: testCatalogue,
      adapter: quoteAdapter,
      controller
    };
    setQuote({
      state: "pending",
      key,
      catalogue: testCatalogue,
      adapter: quoteAdapter
    });
    const timerWindow = window;
    const timer = window.setTimeout(() => {
      controller.abort();
      if (request === quoteSequence.current) {
        quoteSequence.current++;
        setQuote({
          state: "error",
          key,
          catalogue: testCatalogue,
          adapter: quoteAdapter
        });
      }
    }, 10_000);
    quoteDeadline.current = timer;
    try {
      const response = await quoteAdapter.request(
        {
          catalogueVersion: testCatalogue.version,
          items: [{ ticketTypeId, quantity }]
        },
        { signal: controller.signal }
      );
      if (request !== quoteSequence.current || controller.signal.aborted)
        return;
      const parsed = quoteSchema.safeParse(response);
      if (!parsed.success) throw new Error("Invalid quote");
      const value = parsed.data;
      const line = value.items[0];
      // Zod validates the browser boundary; the Node-only quote service cannot enter this client bundle.
      if (
        value.catalogueVersion !== testCatalogue.version ||
        value.currency !== testCatalogue.currency ||
        line.ticketTypeId !== ticketTypeId ||
        line.quantity !== quantity ||
        BigInt(line.unitAmountMinor) * BigInt(quantity) !==
          BigInt(line.totalAmountMinor) ||
        value.totalAmountMinor !== line.totalAmountMinor ||
        Date.parse(value.issuedAt) > Date.now() ||
        Date.parse(value.expiresAt) <= Date.parse(value.issuedAt)
      )
        throw new Error("Mismatched quote");
      setNow(Date.now());
      setQuote({
        state: "ready",
        key,
        catalogue: testCatalogue,
        adapter: quoteAdapter,
        value
      });
    } catch {
      if (request === quoteSequence.current && !controller.signal.aborted)
        setQuote({
          state: "error",
          key,
          catalogue: testCatalogue,
          adapter: quoteAdapter
        });
    } finally {
      timerWindow.clearTimeout(timer);
      if (quoteDeadline.current === timer) quoteDeadline.current = null;
      if (pendingContext.current?.controller === controller)
        pendingContext.current = null;
    }
  }

  const quoteFailed = quoteMatches && quote.state === "error";
  const storageBlocked = storageError || draft.status === "unavailable";
  const feedback = storageBlocked
    ? t('yourBrowserCouldnTSaveThisSelectionEnableLocal')
    : membership.state === "error"
      ? t('weCouldnTCheckYourAccountTryAgain')
      : quoteFailed
        ? t('weCouldnTUpdateTheTestQuoteTryAgain')
        : expired
          ? t('thisTestQuoteExpiredRefreshItToSeeA')
          : draftNotice;
  const formatter = new Intl.NumberFormat("en-KR", {
    style: "currency",
    currency:
      retainedPayment?.currency ??
      testCatalogue?.currency ??
      checkoutCatalogue?.currency ??
      "KRW"
  });
  // Retained attempts use canonical preparation totals, never today's catalogue.
  const configuredTotal =
    checkoutCatalogue && !testCatalogue && validSelection && !paymentBusy
      ? checkoutCatalogue.unitAmount * selection.quantity!
      : null;
  const total =
    retainedPayment?.totalAmount ??
    readyQuote?.totalAmountMinor ??
    (configuredTotal !== null && Number.isSafeInteger(configuredTotal)
      ? configuredTotal
      : null);
  const formattedTotal =
    total === null
      ? null
      : formatter.format(
          total / 10 ** (formatter.resolvedOptions().maximumFractionDigits ?? 0)
        );

  return (
    <>
      <main className="min-h-svh bg-neutral-950 px-6 py-8 [font-family:system-ui] text-neutral-100 sm:px-10">
        <header className="mx-auto flex max-w-[960px] items-center justify-between gap-6">
          <BrandMark asChild>
            {/* Match the approved customer-account header mark exactly. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="text-[23px] tracking-[-1.4px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              sophomores</a>
          </BrandMark>
          {/* Plain anchors keep this surface usable without client-side navigation. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="inline-flex min-h-[44px] items-center gap-1 text-[13px] text-neutral-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <ChevronLeft aria-hidden="true" className="size-4" /> {t('back')}</a>
        </header>
        <div className="mx-auto mt-12 max-w-[960px] pb-8 sm:mt-20">
          <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
            <h1
              ref={!eligible ? setSummaryHeading : undefined}
              tabIndex={-1}
              className="m-0 text-[32px] leading-[38px] font-semibold tracking-[-0.035em] outline-none"
            >
              {t('tickets')}</h1>
            {eligible && (
              <span className="rounded-full border border-neutral-700 px-3 py-1 text-[12px] font-medium text-neutral-300">
                {testCatalogue
                  ? t('testPricesNotAnOffer')
                  : checkoutCatalogue
                    ? t('sandboxCheckout')
                    : recoveryWithoutOffer
                      ? t('checkoutRecovery')
                      : t('selectionPreview')}
              </span>
            )}
          </div>
          <div
            ref={!eligible ? setAuthPanel : undefined}
            hidden={eligible}
            inert={eligible}
            className={cn("mx-auto max-w-[440px]", eligible && "hidden")}
          >
            <MemberAccountFlow
              client={client}
              flow="signup"
              presentation="ticket-checkout"
              headingId={quantityId + "-account"}
              initialCapabilities={initialCapabilities}
              onSnapshot={updateAccount}
              onVerifiedFocus={captureVerifiedFocus}
            />
            {storageBlocked && (
              <p
                role="status"
                className="mt-4 text-[13px] leading-5 text-neutral-300"
              >
                {t('yourBrowserCouldnTSaveThisSelectionYouCan')}</p>
            )}
          </div>
          {/* Keep retained-payment discovery mounted, but no purchase controls are exposed before registration. */}
          <div
            hidden={!eligible}
            inert={!eligible}
            className={cn(
              "items-start gap-5 min-[800px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
              eligible ? "grid" : "hidden"
            )}
          >
            <section
              aria-labelledby="ticket-choice-heading"
              className="min-w-0 rounded-[24px] border border-neutral-800 bg-neutral-900/50 p-6 sm:p-8"
            >
              <h2
                id="ticket-choice-heading"
                className="m-0 mb-5 text-[16px] leading-6 font-medium text-neutral-100"
              >
                {t('yourTickets')}</h2>
              <fieldset
                disabled={paymentBusy}
                className="m-0 min-w-0 border-0 p-0"
              >
                <legend className="sr-only">{t('chooseATicket')}</legend>
                <div className="space-y-3">
                  {options.map((option) => (
                    <label
                      key={option.id}
                      className={cn(
                        "flex min-h-[76px] cursor-pointer items-center gap-4 rounded-2xl border border-neutral-700 px-4 py-4 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-4 has-focus-visible:outline-neutral-100",
                        option.id === selection.ticketTypeId &&
                          "border-neutral-300 bg-white/4",
                        option.available === false &&
                          "cursor-not-allowed opacity-50"
                      )}
                    >
                      <input
                        type="radio"
                        name={quantityId + "-ticket"}
                        aria-label={
                          option.available === false
                            ? t('ticketUnavailable', { label: recoveryWithoutOffer ? t('previousCheckout') : option.label })
                            : recoveryWithoutOffer ? t('previousCheckout') : option.label
                        }
                        checked={option.id === selection.ticketTypeId}
                        disabled={!draftLoaded || option.available === false}
                        onChange={() =>
                          select({
                            ticketTypeId: option.id,
                            quantity: option.minimumQuantity
                          })
                        }
                        className="m-0! size-4! shrink-0 accent-neutral-200 [color-scheme:dark]"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="block text-[18px] leading-6 font-medium tracking-[-0.02em]">
                          {recoveryWithoutOffer
                            ? t('previousCheckout')
                            : option.label}
                        </span>
                        {!recoveryWithoutOffer && (
                          <span className="mt-1 block text-[13px] leading-5 text-neutral-400">
                            {option.available === false
                              ? t('unavailable')
                              : testCatalogue
                                ? t('testTicket')
                                : t('detailsToBeAnnounced')}
                          </span>
                        )}
                      </div>
                      <Ticket
                        aria-hidden="true"
                        className="size-5 shrink-0 text-neutral-500"
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-800 pt-6">
                <label htmlFor={quantityId} className="text-[14px] font-medium">
                  {t('quantity')}</label>
                <NumberField.Root
                  id={quantityId}
                  value={selection.quantity}
                  min={activeOption?.minimumQuantity ?? 1}
                  max={maximum}
                  step={1}
                  smallStep={1}
                  largeStep={1}
                  disabled={
                    paymentBusy ||
                    !draftLoaded ||
                    activeOption?.available === false
                  }
                  onValueChange={(value) =>
                    select({ ...selection, quantity: value })
                  }
                >
                  <NumberField.Group className="flex items-center rounded-[14px] border border-neutral-700 bg-neutral-950/50 p-1">
                    <NumberField.Decrement
                      aria-label={t('removeOneTicket')}
                      render={<motion.button whileTap={{ scale: 0.94 }} />}
                      className="flex size-[44px] items-center justify-center rounded-[10px] border-0 bg-transparent text-neutral-100 transition-colors hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-neutral-200 disabled:opacity-30"
                    >
                      <Minus aria-hidden="true" className="size-[17px]" />
                    </NumberField.Decrement>
                    <NumberField.Input
                      aria-label={t('ticketQuantity')}
                      aria-invalid={quantityInvalid}
                      aria-describedby={
                        quantityInvalid ? quantityId + "-feedback" : undefined
                      }
                      className="m-0! h-[44px]! w-[54px]! rounded-lg! border-0! bg-transparent! p-0! text-center! text-[22px]! leading-[28px]! font-medium! text-neutral-100! tabular-nums shadow-none! outline-none! selection:bg-neutral-100 selection:text-neutral-950 focus-visible:outline-2! focus-visible:outline-neutral-300!"
                    />
                    <NumberField.Increment
                      aria-label={t('addOneTicket')}
                      render={<motion.button whileTap={{ scale: 0.94 }} />}
                      className="flex size-[44px] items-center justify-center rounded-[10px] border-0 bg-transparent text-neutral-100 transition-colors hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-neutral-200 disabled:opacity-30"
                    >
                      <Plus aria-hidden="true" className="size-[17px]" />
                    </NumberField.Increment>
                  </NumberField.Group>
                </NumberField.Root>
              </div>
              {quantityInvalid && (
                <p
                  id={quantityId + "-feedback"}
                  role="alert"
                  className="mt-3 mb-0 text-[13px] leading-5 text-neutral-300"
                >
                  {t('quantityRange', { minimum: activeOption!.minimumQuantity, maximum })}
                </p>
              )}
              {!testCatalogue &&
                !checkoutCatalogue &&
                !recoveryWithoutOffer && (
                  <p className="mt-4 mb-0 text-[12px] leading-5 text-neutral-400">
                    {t('previewRange16NotAConfirmedBookingLimit')}</p>
                )}
            </section>
            <section
              aria-labelledby="ticket-summary-heading"
              className="min-w-0 rounded-[24px] border border-neutral-800 bg-neutral-900/50 p-6 sm:p-8"
            >
              <h2
                ref={eligible ? setSummaryHeading : undefined}
                tabIndex={-1}
                id="ticket-summary-heading"
                className="m-0 text-[16px] leading-6 font-medium tracking-[-0.02em] text-neutral-100 outline-none"
              >
                {t('yourSelection')}</h2>
              <div className="mt-5 flex items-baseline justify-between gap-4 text-[14px] leading-5 text-neutral-400">
                <span>
                  {recoveryWithoutOffer
                    ? t('previousCheckout')
                    : (activeOption?.label ?? t('ticket'))}
                </span>
                <span className="shrink-0 tabular-nums">
                  {retainedPayment
                    ? t('ticketCount', { quantity: retainedPayment.quantity })
                    : paymentBusy || validSelection
                      ? t('ticketCount', { quantity: selection.quantity ?? 0 })
                      : t('chooseQuantity')}
                </span>
              </div>
              <div className="mt-6 border-t border-neutral-800 pt-6">
                <p className="m-0 text-[12px] leading-5 text-neutral-400">
                  {readyQuote ? t('testTotal') : t('total')}
                </p>
                <p
                  className={cn(
                    "mt-2 mb-0 font-medium tracking-[-0.035em] tabular-nums",
                    formattedTotal
                      ? "text-[27px] leading-[34px]"
                      : "text-[18px] leading-6 text-neutral-300"
                  )}
                >
                  {formattedTotal ??
                    (paymentBusy
                      ? t('totalPendingConfirmation')
                      : t('priceToBeAnnounced'))}
                </p>
              </div>
              {readyQuote && (
                <p className="mt-2 mb-0 text-[12px] leading-5 text-neutral-400">
                  {t('quoteExpires')}{" "}
                  <time dateTime={readyQuote.expiresAt}>
                    {new Intl.DateTimeFormat("en", {
                      hour: "numeric",
                      minute: "2-digit"
                    }).format(new Date(readyQuote.expiresAt))}
                  </time>
                </p>
              )}
              {!testCatalogue && !checkoutReady && !paymentBusy && (
                <p className="mt-2 mb-0 text-[13px] leading-5 text-neutral-400">
                  {t('ticketsAreNotOnSaleYet')}</p>
              )}
              {feedback && (
                <p
                  role={
                    storageBlocked ||
                    quoteFailed ||
                    membership.state === "error"
                      ? "alert"
                      : "status"
                  }
                  className="mt-5 mb-0 text-[13px] leading-5 text-neutral-300"
                >
                  {feedback}
                </p>
              )}
              <div className="mt-6 space-y-3">
                {eligible &&
                  (testCatalogue && quoteAdapter ? (
                    <TicketAction
                      disabled={!validSelection || quoting}
                      busy={quoting}
                      onClick={() => void requestQuote()}
                    >
                      {quoting
                        ? t('updatingQuote')
                        : quoteFailed
                          ? t('retryTestQuote')
                          : readyQuote || expired
                            ? t('refreshTestQuote')
                            : t('getTestQuote')}
                    </TicketAction>
                  ) : (
                    <p className="m-0 flex items-center gap-2 text-[13px] leading-5 text-neutral-300">
                      <Check aria-hidden="true" className="size-4" /> {t('accountVerified')}</p>
                  ))}
                {!testCatalogue ? (
                  <PortOneCheckoutButton
                    quantity={selection.quantity ?? 0}
                    disabled={
                      !checkoutCatalogue ||
                      !checkoutReady ||
                      !eligible ||
                      !draftLoaded ||
                      !validSelection
                    }
                    unavailableFallback={
                      !checkoutCatalogue ? (
                        <button
                          type="button"
                          disabled
                          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-transparent px-4 py-3 text-[14px] font-medium text-neutral-500"
                        >
                          <LockKeyhole aria-hidden="true" className="size-4" />{" "}
                          {t('checkoutUnavailable')}</button>
                      ) : undefined
                    }
                    recoveryDisabled={
                      membership.state !== "ready" ||
                      !membership.value.authenticated
                    }
                    onBusyChange={(busy, restoredQuantity, order) => {
                      // Lock even untouched/restored selections against later cross-tab drafts.
                      if (busy)
                        setEditedSelection({
                          ...selection,
                          quantity: restoredQuantity ?? selection.quantity
                        });
                      if (order)
                        setRetainedPayment({
                          quantity: order.quantity,
                          totalAmount: order.totalAmount,
                          currency: order.currency
                        });
                      else if (!busy) setRetainedPayment(null);
                      setPaymentBusy(busy);
                    }}
                    requestPayment={checkoutRequestPayment}
                  />
                ) : (
                  <button
                    type="button"
                    disabled
                    className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-transparent px-4 py-3 text-[14px] font-medium text-neutral-500"
                  >
                    <LockKeyhole aria-hidden="true" className="size-4" />{" "}
                    {t('checkoutUnavailable')}</button>
                )}
              </div>
              <p className="mt-4 mb-0 text-[12px] leading-5 text-neutral-400">
                {recoveryWithoutOffer
                  ? t('paymentStatusOnly')
                  : checkoutCatalogue && !testCatalogue
                    ? t('sandboxPaymentNoAdmissionIsIssuedHere')
                    : t('noReservationOrPaymentIsMade')}
              </p>
              <span role="status" aria-live="polite" className="sr-only">
                {quoting
                  ? t('updatingTestQuote')
                  : membership.state === "loading"
                    ? t('checkingYourAccount')
                    : readyQuote
                      ? t('testQuoteUpdated', { total: formattedTotal ?? '' })
                      : ""}
              </span>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

function TicketAction({
  children,
  busy = false,
  ...props
}: React.ComponentProps<"button"> & { busy?: boolean }) {
  return (
    <button
      {...props}
      type="button"
      aria-busy={busy}
      className="relative flex min-h-[48px] w-full items-center justify-center rounded-xl border-0 bg-neutral-100 px-8 py-3 text-[14px] font-medium text-neutral-950 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:aria-busy:opacity-100"
    >
      {children}
      {busy && (
        <LoaderCircle
          aria-hidden="true"
          className="absolute right-4 size-4 animate-spin"
        />
      )}
    </button>
  );
}
