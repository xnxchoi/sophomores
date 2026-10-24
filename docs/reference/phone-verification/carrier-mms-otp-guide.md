# Korean Carrier MMS-to-Email Gateway & Zoho Mail Inbound OTP Guide

> **Target Systems**: South Korean Cellular Providers (SK Telecom, KT, LG Uplus & MVNOs)  
> **Inbound Ingress**: Zoho Mail (`concierge@sophomores.co` with alias `verify@sophomores.co`)  
> **Use Case**: Reverse-MMS / Mobile-Originated (MO) Phone Verification Pipeline

---

## 1. Definitive Carrier Gateway Domain Reference

When a South Korean mobile subscriber sends an SMS/MMS to an email address (`verify@sophomores.co`), the carrier's MMSC (Multimedia Messaging Service Center) relays the cellular message via an SMTP gateway.

### Core Carrier Specifications

| Carrier (통신사) | Network Infra | Primary Active Domain | Secondary / Legacy Domains | Sender Format (`From:`) | DNS & SPF Configuration Status | DMARC Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SK Telecom (SKT)** | MNO & SKT MVNOs (알뜰폰) | **`vmms.nate.com`** | `emms.nate.com`, `mms.nate.com`, `sktmms.nate.com` | `010XXXXXXXX@vmms.nate.com` | **Active**<br>• MX: `100 vmms.nate.com`<br>• SPF: `include:s1.vmms.nate.com` ~ `s4.vmms.nate.com`<br>• CIDRs: `211.188.197.95-190` | `p=none` (via organizational `nate.com`) |
| **KT** | MNO & KT MVNOs (알뜰폰) | **`ktfmms.magicn.com`** | `magicn.com` | `010XXXXXXXX@ktfmms.magicn.com` | **Active**<br>• MX: `10 ktfmms.magicn.com`<br>• SPF: `61.74.64.212`, `61.74.66.0/24`, `211.246.105.0/24 -all` (Hardfail) | No DMARC record |
| **LG Uplus (LGU+)** | MNO & LGU+ MVNOs (알뜰폰) | **`mmsmail.uplus.co.kr`** | `lguplus.com` *(informal/docs)*, `ez-i.co.kr` *(legacy)* | `010XXXXXXXX@mmsmail.uplus.co.kr` | **Active**<br>• SPF: `106.103.232.84/85`, `106.103.204.115/116`, AWS Seoul relays (`52.78.30.230`, `43.200.232.104`, etc.) `~all` | `p=reject` (`_dmarc.mmsmail.uplus.co.kr`) |

### Key Carrier Telephony Characteristics

1. **Number Portability (MNP / 번호이동):**
   * Carrier MMS gateways reflect the **active serving network**, not the number's original allocation block. A user originally registered on SKT (`010-3xxx-xxxx`) who ported to KT routes through KT's MMSC and arrives from `@ktfmms.magicn.com`.
2. **MVNOs (알뜰폰):**
   * MVNOs (CJ Hello, KT M Mobile, Toss Mobile, Liiv M, SK 7mobile, U+ 알뜰모바일) do not operate separate MMSC email gateways. They utilize their host MNO's core network. Incoming mail identifies the **physical host network** (`skt`, `kt`, or `lgu`), not the MVNO brand.
3. **MMS vs. SMS Handset Behavior:**
   * Texting an email address forces mobile devices (iOS Messages, Samsung Messages) to dispatch via **MMS (OMA-MMS / 3GPP TS 23.140)** rather than standard SMS.
   * Depending on mobile subscriptions, MMS may incur nominal per-message carrier fees (50–100 KRW) if not bundled.

---

## 2. Zoho Mail Admin Console Security Configuration

Securing inbound carrier MMS on Zoho Mail requires preventing SMTP spoofing while avoiding false-positive spam drops.

### Step 1: Inbound SPF / Spam Verification Rules

Log in to the [Zoho Mail Admin Console](https://mailadmin.zoho.com):
1. Navigate to: **Security & Compliance** → **Spam Control** → **Spam Verification**.
2. **SPF Fail Action:** Set to **`Permanent Reject`** or **`Move to Quarantine`**.
   * *KT Protection:* KT publishes an explicit `-all` (hardfail) SPF record. Any forged KT email sent from unauthorized MTAs triggers hard fail and will be dropped.
3. **SPF Soft Fail Action:** Set to **`Move to Quarantine`** or **`Mark as Spam`** (Do NOT set to "Process further").
   * *SKT & LGU+ Protection:* Both publish `~all` (softfail) policies. Forged SKT/LGU+ messages sent from arbitrary attacker MTAs evaluate as `SoftFail`. Moving softfails out of the inbox prevents automated verification workers from processing forged identities.
4. **DKIM & DMARC Verification Action:**
   * **DKIM Check:** Must remain **`Process further / None`** (do NOT reject or quarantine).
     * *Critical:* Korean carrier MMS gateways **do not sign outgoing emails with DKIM**. Requiring DKIM will reject 100% of legitimate carrier messages.
   * **DMARC Check:** Keep as **`Process further`** or follow sender policy.

### Step 2: Separate `verify@` Alias from Human Concierge Workflow

Because `verify@sophomores.co` is an alias of `concierge@sophomores.co`, all incoming OTP traffic will land in the primary inbox unless isolated.

1. Log into [Zoho Mail](https://mail.zoho.com) as `concierge@sophomores.co`.
2. **Create a Dedicated Folder:**
   * Create folder: `OTP_Queue`.
3. **Create an Inbound Filter Rule:**
   * Navigate to: **Settings** → **Filters** → **New Filter**.
   * **Name:** `Route Inbound Carrier OTP`
   * **Conditions (Match ALL):**
     * `To / Cc` contains: `verify@sophomores.co`
     * `From` contains: `vmms.nate.com` **OR** `ktfmms.magicn.com` **OR** `mmsmail.uplus.co.kr`
   * **Actions:**
     * **Move to Folder:** `OTP_Queue`
     * **Do not mark as Spam:** Checked (prevents Bayesian filters from dropping short 6-digit messages).

> [!WARNING]
> **Do NOT add carrier domains to the Global Allowed / Whitelist Senders list.**  
> In Zoho Mail, adding domains to the global Allowlist can bypass authentication checks entirely, allowing attackers to deliver spoofed messages directly to the inbox. Always use folder routing filters instead.

---

## 3. Backend Ingestion & Authentication Architecture

### 1. Ingestion Model (Zoho Mail REST API)

In the Sophomores architecture, incoming messages are consumed via Zoho Mail REST API:
* Endpoint: `/api/accounts/{accountId}/messages/{messageId}/originalmessage`
* Header retrieval: Extracts raw RFC 822 MIME source including `Authentication-Results` and `Received-SPF`.

### 2. ARC & SPF Validation Gate

Zoho Mail seals incoming emails with ARC (Authenticated Received Chain). The backend must verify that Zoho's internal MX authenticated the carrier:

```http
Authentication-Results: mx.zohomail.com;
    spf=pass (mx.zohomail.com: domain of vmms.nate.com designates 211.188.197.95 as permitted sender)
    smtp.mailfrom=01012345678@vmms.nate.com;
    dkim=none;
```

#### TypeScript Ingress Verification Check

```typescript
export function verifyZohoSpfPass(headers: Map<string, string>): boolean {
  const authResults = headers.get('authentication-results') || '';
  const receivedSpf = headers.get('received-spf') || '';

  // 1. Must explicitly report spf=pass from Zoho's MX
  const isSpfPass = 
    /spf=pass/i.test(authResults) || 
    /^pass\b/i.test(receivedSpf);

  if (!isSpfPass) return false;

  // 2. Reject if any failure flags exist
  if (/spf=(fail|softfail|neutral|temperror|permerror)/i.test(authResults)) {
    return false;
  }

  return true;
}
```

---

## 4. Operational & Security Guardrails

1. **Apple ID / iCloud Conflict Check:**
   * If `verify@sophomores.co` is registered as an Apple ID, iPhone users will send an end-to-end encrypted iMessage instead of cellular MMS, which never routes through carrier MMSC gateways.
   * **Action:** Ensure `verify@sophomores.co` is never registered as an Apple ID.
2. **Delivery Latency & Polling Windows:**
   * MMSC-to-SMTP relay latency ranges from 3 to 15 seconds (up to 45 seconds during carrier peak hours).
   * Set OTP challenge expiry to **5 minutes (300,000 ms)**.
3. **Data Retention & Privacy (PIPA / 개인정보보호법):**
   * Storing unencrypted mobile numbers, tokens, and carrier origins in an email inbox creates compliance risk under South Korea's Personal Information Protection Act.
   * Purge message content immediately after verification matching or configure an auto-delete policy on the `OTP_Queue` folder.
4. **Application-Specific Credentials:**
   * Never store primary Zoho master credentials in server configurations. Use dedicated OAuth tokens or scoped Application Passwords.
