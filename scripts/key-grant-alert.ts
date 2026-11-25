import { hostname } from "node:os";
import { createInterface } from "node:readline";
import { writeSync } from "node:fs";

/*
 * Reads the key-grant tick's journal lines on stdin and emails the owner (src/lib/commerce/keys/tick-alerts.ts):
 *
 *   journalctl -f -n 0 -o cat -u key-grant-tick.service | node --import tsx scripts/key-grant-alert.ts
 *
 * (deployment/ops/key-grant-alert.service). Mail goes through the existing Zoho ZeptoMail account
 * (MEMBER_AUTH_MAIL_MODE=smtp and MEMBER_AUTH_SMTP_*, validated by the member-auth loader) to KEY_GRANT_ALERT_TO.
 * It refuses to start without both. Its own problems are one fixed stderr line each; never a credential.
 */
async function main() {
  const [{ loadMemberMailConfig, isMemberMailAddress }, { createTickAlerter, tickAlertFromLine }, nodemailer] = await Promise.all([
    import("../src/lib/member-auth/mail-config"), import("../src/lib/commerce/keys/tick-alerts"), import("nodemailer"),
  ]);
  let mail: ReturnType<typeof loadMemberMailConfig>;
  try { mail = loadMemberMailConfig(process.env); } catch { mail = null; }
  const to = process.env.KEY_GRANT_ALERT_TO;
  if (!mail || !isMemberMailAddress(to)) { writeSync(2, JSON.stringify({ event: "alert_refused", reason: "mail_not_configured" }) + "\n"); process.exit(1); }
  const transport = nodemailer.createTransport({ host: mail.host, port: mail.port, secure: mail.port === 465, auth: { user: mail.username, pass: mail.password } });
  const alerter = createTickAlerter({
    host: hostname(),
    send: async ({ subject, text }) => {
      try { await transport.sendMail({ from: mail.from, to, subject, text }); }
      catch (error) { writeSync(2, JSON.stringify({ event: "alert_send_failed" }) + "\n"); throw error; }
    },
  });
  setInterval(() => void alerter.flush(), 60_000).unref();
  for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
    const alert = tickAlertFromLine(line);
    if (alert) await alerter.push(alert);
  }
  await alerter.flush();
}

void main().then(() => process.exit(0), () => { writeSync(2, JSON.stringify({ event: "alert_refused", reason: "unexpected" }) + "\n"); process.exit(1); });
