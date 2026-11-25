import { writeSync } from "node:fs";

/*
 * Key-grant alert mail (src/lib/commerce/keys/tick-alerts.ts; owner, 25 Nov: "email alerts via Zoho is fine").
 *
 *   node --import tsx scripts/key-grant-alert.ts deliver          (key-grant-alert-mail.service, its own user, every minute)
 *   node --import tsx scripts/key-grant-alert.ts systemd-failed   (key-grant-tick-failed.service, OnFailure of the tick)
 *
 * deliver: one pass over the spool (KEY_GRANT_ALERT_SPOOL) with state in KEY_GRANT_ALERT_STATE. It mails through the
 * existing ZeptoMail account with the member mailer's settings (memberSmtpSettings: TLS required, step timeouts) and
 * a 30 s bound on the whole send, to KEY_GRANT_ALERT_TO. It reads no journal.
 * systemd-failed: spools {"outcome":"failure","reason":"systemd_failed"} for a tick run that failed or timed out.
 * Prints one fixed JSON line; never a credential, an address or an error's message.
 */
async function run(): Promise<Record<string, unknown>> {
  const mode = process.argv[2];
  const alerts = await import("../src/lib/commerce/keys/tick-alerts");
  const dir = alerts.alertSpoolDir();
  if (!dir || process.argv.length !== 3) return { outcome: "refused", reason: "bad_args_or_spool" };
  if (mode === "systemd-failed") {
    const result = await alerts.spoolTickAlert(dir, { kind: "tick_failure", reason: "systemd_failed" });
    return { outcome: result === "written" ? "spooled" : result === "full" ? "spool_full" : "spool_failed" };
  }
  if (mode !== "deliver") return { outcome: "refused", reason: "bad_args_or_spool" };
  const statePath = process.env.KEY_GRANT_ALERT_STATE;
  if (!statePath || !/^\/[A-Za-z0-9_./-]{1,200}$/.test(statePath) || statePath.includes("..")) return { outcome: "refused", reason: "no_state_path" };
  const [{ loadMemberMailConfig, isMemberMailAddress }, { memberSmtpSettings, createSmtpConnectionTransport }] = await Promise.all([
    import("../src/lib/member-auth/mail-config"), import("../src/lib/member-auth/mail"),
  ]);
  let mail: ReturnType<typeof loadMemberMailConfig>;
  try { mail = loadMemberMailConfig(process.env); } catch { mail = null; }
  const to = process.env.KEY_GRANT_ALERT_TO;
  if (!mail || !isMemberMailAddress(to)) return { outcome: "refused", reason: "mail_not_configured" };
  const config = mail;
  const result = await alerts.deliverTickAlerts({
    dir, statePath,
    send: async ({ subject, text }) => {
      const transport = createSmtpConnectionTransport(memberSmtpSettings(config));
      try {
        await alerts.boundedSend(transport.sendMail({
          from: { name: "Sophomores", address: config.from }, to: { address: to }, envelope: { from: config.from, to: [to] },
          subject, text, disableFileAccess: true, disableUrlAccess: true, xMailer: false,
        }), 30_000);
      } finally { transport.close(); }
    },
  });
  return { outcome: "delivered", ...result };
}

void run().then(
  (result) => { writeSync(1, JSON.stringify(result) + "\n"); process.exit(result.outcome === "refused" || result.outcome === "spool_failed" || result.outcome === "spool_full" ? 1 : 0); },
  () => { writeSync(1, JSON.stringify({ outcome: "refused", reason: "unexpected" }) + "\n"); process.exit(1); });
