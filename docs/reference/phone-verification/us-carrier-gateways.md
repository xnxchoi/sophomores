# United States Carrier SMS/MMS-to-Email Gateway Reference & Viability Audit

> **Target Systems**: US Cellular Providers (Verizon, AT&T, T-Mobile, US Cellular, MVNOs)  
> **Use Case**: Reverse-MMS / Mobile-Originated (MO) Inbound Verification  
> **Location**: `docs/reference/phone-verification/us-carrier-gateways.md`  
> **Companion Dataset**: [`carrier-gateways.json`](./carrier-gateways.json)

---

## 1. Executive Summary & Critical Feasibility Assessment

> [!CAUTION]
> **Reverse-MMS / Phone-to-Email OTP is fundamentally unviable for US phone verification in production.**  
> While South Korea's three major telcos (SKT, KT, LGU+) maintain stable, operational MMSC-to-email gateways, the United States carrier ecosystem has actively **sunset and decommissioned** free consumer email-to-SMS/MMS gateways.

1. **AT&T / Cricket:** Permanently shut down and decommissioned all gateway servers and DNS records on **June 17, 2025**. Sending a text to an email from an AT&T handset fails or is discarded silently upstream.
2. **T-Mobile / Metro:** Sunsetting and actively blocking consumer gateway routing (`tmomail.net`) as of late 2024 / 2025.
3. **Verizon / Visible:** Officially announced full retirement of `vtext.com` and `vzwpix.com` by **March 31, 2027**. While currently resolving DNS, traffic is aggressively filtered by Cloudfilter/Proofpoint heuristics, subject to silent drops, and restricted to non-automated consumer traffic.
4. **Failure Rate for US Users:** If deployed as a primary verification flow in the US, **over 65–75% of users (all AT&T and T-Mobile subscribers) will experience immediate delivery failure**, with remaining Verizon users subject to high latency and spam quarantine.

---

## 2. US Carrier Gateway Specifications

### Live DNS & Gateway Status (Audited October 2026)

| Carrier | Service Type | Domain | Active Status | SPF Policy | DMARC Policy | MX Relays |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Verizon** | MMS Gateway | **`vzwpix.com`** | **Phasing Out** (Cutoff: March 31, 2027) | `include:vtext.com -all` (Hardfail) | `p=reject; pct=10` | `vrz-mms.mx.a.cloudfilter.net` |
| **Verizon** | SMS Gateway | **`vtext.com`** | **Phasing Out** (Cutoff: March 31, 2027) | `include:vrz-e2xms.spf.a.cloudfilter.net -all` | `p=reject; pct=10` | `vrz-sms.mx.a.cloudfilter.net` |
| **AT&T** | MMS Gateway | **`mms.att.net`** | **DEAD / DECOMMISSIONED** (Shut down June 17, 2025) | None (DNS deleted) | None | None (NXDOMAIN / No MX) |
| **AT&T** | SMS Gateway | **`txt.att.net`** | **DEAD / DECOMMISSIONED** (Shut down June 17, 2025) | None (DNS deleted) | None | None (NXDOMAIN / No MX) |
| **T-Mobile** | Unified Gateway | **`tmomail.net`** | **DEPRECATED / RESTRICTED** (Phased out 2024–2025) | `include:tmo.spf.a.cloudfilter.net ... -all` | None | `tmo-west.mx.a.cloudfilter.net` |
| **US Cellular** | MMS Gateway | **`mms.uscc.net`** | Legacy (Acquired by T-Mobile) | `mx ~all` | `p=quarantine` (via `uscc.net`) | `sc1.mx.uscc.net` |
| **Cricket** | MMS Gateway | **`mms.cricketwireless.net`** | Legacy / Inactive (AT&T network) | `include:att-emg.spf.a.cloudfilter.net -all` | None | `att-e2xms-west.mx.a.cloudfilter.net` |

---

## 3. Carrier Deep-Dive Analysis

### 1. Verizon (`vzwpix.com` & `vtext.com`)
* **Sender Format**: `[10-digit-phone]@vzwpix.com` (e.g., `2125551234@vzwpix.com`).
* **MMS vs. SMS**: When texting an email address from an iOS or Android device on Verizon, the native messaging client automatically dispatches via MMS (`vzwpix.com`).
* **Authentication Infrastructure**:
  * **SPF**: Uses Cloudfilter / Proofpoint outbound relays (`vrz-e2xms.spf.a.cloudfilter.net`):
    * `18.233.72.84`, `18.204.60.119`, `18.236.37.117`, `50.112.76.133`.
  * **DMARC**: Strict `p=reject` with partial percentage ramp-up (`pct=10`).
  * **DKIM**: Unsigned.
* **Deprecation Notice**: Verizon has issued an official notice that all email-to-text and text-to-email services will be completely terminated on **March 31, 2027**. Furthermore, Verizon enforces aggressive anti-spam thresholds that trigger silent drops for transactional or automated text bodies.

### 2. AT&T (`txt.att.net` & `mms.att.net`)
* **Decommissioning Date**: June 17, 2025.
* **Current State**: AT&T removed all DNS records (`MX`, `A`, `TXT`) for `mms.att.net` and `txt.att.net`. 
* **Operational Result**: If an AT&T subscriber enters `verify@sophomores.co` into their SMS/MMS composer and hits send, the AT&T MMSC rejects the submission with a local network error or drops it silently. It is impossible to receive reverse-MMS from AT&T users.

### 3. T-Mobile (`tmomail.net`)
* **Current State**: T-Mobile began restricting and disabling `tmomail.net` gateway routing in December 2024 to curb smishing and comply with 10DLC mandates.
* **Operational Result**: While the domain retains MX and SPF records, consumer-to-email routing is heavily throttled or disabled on modern SIM profiles (especially those using T-Mobile RCS/Chat features).

---

## 4. Why Reverse-MMS Works in Korea but Fails in the US

| Factor | South Korea (SKT, KT, LGU+) | United States (Verizon, AT&T, T-Mobile) |
| :--- | :--- | :--- |
| **Gateway Infrastructure** | Active, maintained by all 3 MNOs under telecom interoperability rules. | Decommissioned (AT&T 2025) or phased out (Verizon 2027, T-Mobile 2024). |
| **Regulatory Climate** | PIPA compliance; carrier MMS core intact. | FCC mandate on anti-robotexting & mandatory CTIA A2P 10DLC registration. |
| **Carrier Coverage** | **100% of subscribers** (SKT, KT, LGU+ & all MVNOs supported). | **< 30% coverage** (Only legacy Verizon subscribers; AT&T and T-Mobile drop). |
| **Deliverability** | Reliable (3–15 seconds delivery via MMSC). | Extremely poor (high latency, aggressive Cloudfilter drops, non-delivery). |
| **Viability for Auth** | **Production Viable** (with SPF/ARC verification). | **DO NOT USE in Production**. |

---

## 5. Recommended Alternative Architecture for US Phone Verification

For US telephone numbers (+1 country code), do **not** route through reverse-MMS email gateways. Instead, adopt standard North American verification practices:

1. **A2P 10DLC Outbound SMS (Industry Standard):**
   * Register a US A2P 10DLC Campaign (via The Campaign Registry / TCR) using an API provider:
     * **Twilio Verify API**
     * **Telnyx Verify**
     * **AWS SNS / Pinpoint**
   * The server dispatches a 6-digit OTP code to the user's phone, and the user inputs it into the web form.
2. **Passkeys / WebAuthn (Zero SMS Cost):**
   * For US audiences where iOS (FaceID) and Android (fingerprint) adoption is >90%, use FIDO2/WebAuthn passkeys for passwordless authentication without carrier dependencies.
3. **Regional Dispatch Routing:**
   * In your verification router:
     ```typescript
     if (phoneNumber.startsWith('+82')) {
       // South Korea: Route to Reverse-MMS (verify@sophomores.co)
       return startReverseMmsTrial(phoneNumber);
     } else {
       // North America & International: Fallback to standard A2P SMS API / Passkey
       return startStandardSmsOtp(phoneNumber);
     }
     ```
