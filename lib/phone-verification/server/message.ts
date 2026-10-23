import { simpleParser } from "mailparser";
import { carrierSender, type Carrier } from "./carriers";

export type CarrierMessage = {
  phone: string;
  token: string;
  carrier: Carrier;
  messageId: string;
};
const invalid = () => new Error("Invalid verification message");

export async function parseCarrierMessage(
  raw: string,
  options: { recipient: string; maxBytes?: number }
): Promise<CarrierMessage> {
  try {
    if (!raw || Buffer.byteLength(raw) > (options.maxBytes ?? 524_288))
      throw invalid();
    if (
      options.recipient !== "verify@sophomores.co" &&
      options.recipient !== "verify@example.invalid"
    )
      throw invalid();
    const mail = await simpleParser(raw, {
      skipHtmlToText: true,
      skipTextToHtml: true,
      skipImageLinks: true,
      keepDeliveryStatus: true
    });
    for (const key of ["from", "to", "message-id", "subject"]) {
      if (mail.headerLines.filter((header) => header.key === key).length > 1)
        throw invalid();
    }
    if (
      mail.attachments.length ||
      mail.from?.value.length !== 1 ||
      !mail.text ||
      !mail.messageId ||
      mail.messageId.length > 256
    )
      throw invalid();
    const to = Array.isArray(mail.to)
      ? mail.to.flatMap((entry) => entry.value)
      : mail.to?.value;
    if (
      to?.length !== 1 ||
      to[0].address?.toLowerCase() !== options.recipient ||
      mail.cc ||
      mail.bcc
    )
      throw invalid();
    const sender = carrierSender(mail.from.value[0].address ?? "");
    if (!sender || /^(?:\s*(?:re|fw|fwd)\s*:)/i.test(mail.subject ?? ""))
      throw invalid();
    if (
      mail.headers.has("resent-from") ||
      mail.headers.has("resent-to") ||
      mail.headers.has("in-reply-to") ||
      mail.headers.has("references")
    )
      throw invalid();
    const text = mail.text.replace(/\r\n/g, "\n").trim();
    const lines = text.split("\n");
    const challenge = /^SPHMRS ([A-Za-z0-9_-]{43})$/.exec(lines[0]);
    if (
      !challenge ||
      (text.match(/SPHMRS/g) ?? []).length !== 1 ||
      lines.some((line) =>
        /^\s*>|forwarded message|original message|전달된 메시지|원본 메시지/i.test(
          line
        )
      )
    )
      throw invalid();
    return { ...sender, token: challenge[1], messageId: mail.messageId };
  } catch {
    throw invalid();
  }
}
