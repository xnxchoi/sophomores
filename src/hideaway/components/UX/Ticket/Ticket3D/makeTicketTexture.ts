import * as THREE from "three";

export interface TicketTextureInput {
  eventName: string;
  ticketNumber: number | null;
  date: string | null;
  location: string | null;
}

// Texture proportions match the geometry's 2:1 silhouette (see TicketMesh).
// STUB_RATIO corresponds to the geometric perforation x-position so the
// printed dots line up with the notches cut into the mesh outline.
const W = 2400;
const H = 1200;
const STUB_RATIO = 0.7;
const STUB_X = Math.round(W * STUB_RATIO);
const PAD = 96;

const INK = "rgba(20, 16, 12, 0.95)";
const INK_MID = "rgba(20, 16, 12, 0.7)";
const INK_SOFT = "rgba(20, 16, 12, 0.5)";
const INK_GHOST = "rgba(20, 16, 12, 0.18)";
const PAPER_TINT = "rgba(20, 16, 12, 0.04)";
const PAPER_GRAIN = "rgba(20, 16, 12, 0.05)";
const PERF_INK = "rgba(20, 16, 12, 0.55)";

const FONT_SANS =
  "Helvetica Neue, Helvetica, Arial, system-ui, -apple-system, sans-serif";
const FONT_MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
const FONT_SERIF = "Georgia, 'Times New Roman', serif";

/**
 * Generate the canvas texture for the ticket FRONT.
 *
 * Layout — boarding-pass-inspired editorial. Left section is the
 * informational body, right section is the tear-off stub with the
 * ticket number. Hierarchy goes: small brand mark → small eyebrow →
 * BIG date block → time → place → bottom rule with brand wordmark.
 * The big numerals on the stub are the visual anchor.
 */
export function makeTicketTexture(input: TicketTextureInput): THREE.Texture {
  if (typeof document === "undefined") {
    return new THREE.Texture();
  }
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return new THREE.Texture();

  drawPaper(ctx);
  drawPerforation(ctx);
  drawBodyFront(ctx, input);
  drawStubFront(ctx, input.ticketNumber);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipMapLinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generate the canvas texture for the ticket BACK.
 *
 * Intentionally quieter than the front. Holds the brand mark as the
 * anchor, a few lines of mono-caps boilerplate ("This ticket admits
 * one. Non-transferable once activated."), and a repeating ADMIT ONE
 * strip. The stub side mirrors the front's number for continuity.
 */
export function makeTicketBackTexture(
  input: TicketTextureInput
): THREE.Texture {
  if (typeof document === "undefined") {
    return new THREE.Texture();
  }
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return new THREE.Texture();

  drawPaper(ctx);
  drawPerforation(ctx);
  drawBodyBack(ctx, input);
  drawStubBack(ctx, input.ticketNumber);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipMapLinearFilter;
  tex.needsUpdate = true;
  return tex;
}

// ── Shared ────────────────────────────────────────────────────────────────

function drawPaper(ctx: CanvasRenderingContext2D): void {
  // Cool pearl base with a faint vignette so the edges feel hand-laid.
  const bg = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H);
  bg.addColorStop(0, "#f6f4ee");
  bg.addColorStop(1, "#e2e0d8");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Paper grain — cheap white-noise dots.
  ctx.fillStyle = PAPER_GRAIN;
  for (let i = 0; i < 3600; i++) {
    ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
  }

  // Stub gets a faintly different tint so the two sections read distinctly.
  ctx.fillStyle = PAPER_TINT;
  ctx.fillRect(STUB_X, 0, W - STUB_X, H);

  // Outer hairline frame.
  ctx.strokeStyle = "rgba(20,16,12,0.32)";
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, W - 80, H - 80);
}

function drawPerforation(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = "rgba(20,16,12,0.4)";
  ctx.lineWidth = 1.4;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.moveTo(STUB_X, 40);
  ctx.lineTo(STUB_X, H - 40);
  ctx.stroke();
  ctx.setLineDash([]);

  // Heavier dots layered on top for that real-ticket feel.
  ctx.fillStyle = PERF_INK;
  for (let y = 64; y < H - 64; y += 26) {
    ctx.beginPath();
    ctx.arc(STUB_X, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Front face ────────────────────────────────────────────────────────────

function drawBodyFront(
  ctx: CanvasRenderingContext2D,
  input: TicketTextureInput
): void {
  const innerR = STUB_X - 56;

  // Brand monogram — top-left corner, small + understated. Identity, not decor.
  ctx.fillStyle = INK;
  ctx.font = `300 88px ${FONT_SERIF}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("H", PAD, PAD + 76);

  // Wordmark beside the monogram, tiny mono caps.
  ctx.fillStyle = INK_SOFT;
  ctx.font = `600 22px ${FONT_MONO}`;
  ctx.fillText("THE  HIDEAWAY", PAD + 78, PAD + 60);

  // Eyebrow — "ADMIT ONE" up top.
  ctx.fillStyle = INK_MID;
  ctx.font = `700 24px ${FONT_MONO}`;
  ctx.textAlign = "right";
  ctx.fillText("ADMIT  ONE", innerR, PAD + 60);
  ctx.textAlign = "left";

  // Big date block — the visual anchor of the body.
  const { dateLine, timeLine } = splitDate(input.date);
  ctx.fillStyle = INK;
  ctx.font = `300 156px ${FONT_SANS}`;
  ctx.fillText(dateLine, PAD, 380);

  // Time — large mono next to the date.
  if (timeLine) {
    ctx.fillStyle = INK_MID;
    ctx.font = `400 56px ${FONT_MONO}`;
    ctx.fillText(timeLine, PAD, 460);
  }

  // Event name — smaller, sits below the date as the secondary identifier.
  ctx.fillStyle = INK;
  ctx.font = `300 64px ${FONT_SANS}`;
  wrapText(ctx, input.eventName, PAD, 600, innerR - PAD, 78, 2);

  // Location — caps mono, anchors the bottom of the body.
  ctx.fillStyle = INK_MID;
  ctx.font = `600 30px ${FONT_MONO}`;
  ctx.fillText((input.location ?? "—").toUpperCase(), PAD, H - PAD - 16);

  // Bottom hairline rule above the location.
  ctx.strokeStyle = "rgba(20,16,12,0.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, H - PAD - 60);
  ctx.lineTo(innerR, H - PAD - 60);
  ctx.stroke();

  // Tiny meta — sits to the right of the location, balancing weight.
  ctx.fillStyle = INK_SOFT;
  ctx.font = `400 22px ${FONT_MONO}`;
  ctx.textAlign = "right";
  ctx.fillText("hideawayseoul.com", innerR, H - PAD - 16);
  ctx.textAlign = "left";
}

function drawStubFront(
  ctx: CanvasRenderingContext2D,
  ticketNumber: number | null
): void {
  const stubW = W - STUB_X;
  const cx = STUB_X + stubW / 2;
  const num = String(ticketNumber ?? 0).padStart(4, "0");

  // "NO." label up top, centred.
  ctx.fillStyle = INK_MID;
  ctx.font = `700 30px ${FONT_MONO}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("NO.", cx, PAD + 64);

  // Big ticket number — visual anchor of the stub.
  ctx.fillStyle = INK;
  ctx.font = `300 280px ${FONT_MONO}`;
  ctx.fillText(num, cx, H / 2 + 100);

  // Hairline separator above the foot.
  ctx.strokeStyle = "rgba(20,16,12,0.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(STUB_X + 48, H - PAD - 60);
  ctx.lineTo(W - PAD, H - PAD - 60);
  ctx.stroke();

  // ADMIT ONE caps along the foot of the stub.
  ctx.fillStyle = INK_MID;
  ctx.font = `700 26px ${FONT_MONO}`;
  ctx.fillText("ADMIT  ONE", cx, H - PAD - 16);
  ctx.textAlign = "left";
}

// ── Back face ─────────────────────────────────────────────────────────────

function drawBodyBack(
  ctx: CanvasRenderingContext2D,
  input: TicketTextureInput
): void {
  const innerR = STUB_X - 56;

  // Single huge monogram — the back is identity-only.
  ctx.fillStyle = INK_GHOST;
  ctx.font = `300 720px ${FONT_SERIF}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("H", (PAD + innerR) / 2, H / 2 + 240);

  // Wordmark up top.
  ctx.fillStyle = INK_MID;
  ctx.font = `600 24px ${FONT_MONO}`;
  ctx.textAlign = "left";
  ctx.fillText("THE  HIDEAWAY", PAD, PAD + 60);

  // Boilerplate copy at the foot — what the back of a real ticket usually says.
  const lines = [
    "THIS TICKET ADMITS ONE.",
    "NON-TRANSFERABLE ONCE ACTIVATED.",
    "PRESENT THE QR ON YOUR ACCOUNT AT THE DOOR."
  ];
  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 22px ${FONT_MONO}`;
  lines.forEach((line, i) => {
    ctx.fillText(line, PAD, H - PAD - 48 + (i - lines.length + 1) * 32);
  });

  // Hairline rule above the boilerplate.
  ctx.strokeStyle = "rgba(20,16,12,0.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, H - PAD - 144);
  ctx.lineTo(innerR, H - PAD - 144);
  ctx.stroke();

  // Tiny event echo, sits above the boilerplate.
  ctx.fillStyle = INK_SOFT;
  ctx.font = `400 22px ${FONT_MONO}`;
  ctx.fillText(input.eventName.toUpperCase(), PAD, H - PAD - 168);
}

function drawStubBack(
  ctx: CanvasRenderingContext2D,
  ticketNumber: number | null
): void {
  const stubW = W - STUB_X;
  const cx = STUB_X + stubW / 2;
  const num = String(ticketNumber ?? 0).padStart(4, "0");

  // Back-of-stub design: a vertical "ADMIT ONE / NO. xxxx / ADMIT ONE" rhythm.
  ctx.fillStyle = INK_MID;
  ctx.font = `700 24px ${FONT_MONO}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillText("ADMIT  ONE", cx, PAD + 64);
  ctx.fillText("·", cx, PAD + 96);

  ctx.fillStyle = INK_SOFT;
  ctx.font = `600 28px ${FONT_MONO}`;
  ctx.fillText("NO.", cx, H / 2 - 60);

  ctx.fillStyle = INK;
  ctx.font = `300 110px ${FONT_MONO}`;
  ctx.fillText(num, cx, H / 2 + 30);

  ctx.fillStyle = INK_MID;
  ctx.font = `700 24px ${FONT_MONO}`;
  ctx.fillText("·", cx, H - PAD - 96);
  ctx.fillText("ADMIT  ONE", cx, H - PAD - 16);
  ctx.textAlign = "left";
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Take a date string formatted like "Sep 12, 2026" and split it into a
 * display line ("SEP 12") plus a time/year line ("2026"). Falls back
 * gracefully if the input isn't in the expected shape.
 */
function splitDate(d: string | null): {
  dateLine: string;
  timeLine: string;
} {
  if (!d) return { dateLine: "—", timeLine: "" };
  // Most pages format as "Mon Day, Year" — split into a big day line
  // and a smaller year line.
  const m = d.match(/^([A-Za-z]+)\s+(\d+),?\s*(\d{4})?/);
  if (m) {
    return {
      dateLine: `${m[1].toUpperCase()} ${m[2]}`,
      timeLine: m[3] ?? ""
    };
  }
  return { dateLine: d.toUpperCase(), timeLine: "" };
}

/**
 * Generate a roughness map paired with the colour texture. White = rough,
 * black = smooth (three.js convention). The body is left moderately rough
 * so the printed typography reads cleanly head-on; the borders, stub, and
 * the perforation strip are smoother so the iridescence shimmer
 * concentrates there as the card rotates — selective sheen instead of
 * uniform plastic.
 */
export function makeTicketRoughness(): THREE.Texture {
  if (typeof document === "undefined") {
    return new THREE.Texture();
  }
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return new THREE.Texture();

  ctx.fillStyle = "#b4b4b4";
  ctx.fillRect(0, 0, W, H);

  const stubGrad = ctx.createLinearGradient(STUB_X, 0, W, 0);
  stubGrad.addColorStop(0, "#7a7a7a");
  stubGrad.addColorStop(1, "#5a5a5a");
  ctx.fillStyle = stubGrad;
  ctx.fillRect(STUB_X, 0, W - STUB_X, H);

  ctx.strokeStyle = "#3a3a3a";
  ctx.lineWidth = 40;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.strokeStyle = "rgba(60,60,60,0.5)";
  ctx.lineWidth = 90;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  const seam = ctx.createLinearGradient(STUB_X - 50, 0, STUB_X + 50, 0);
  seam.addColorStop(0, "rgba(60,60,60,0)");
  seam.addColorStop(0.5, "rgba(60,60,60,0.85)");
  seam.addColorStop(1, "rgba(60,60,60,0)");
  ctx.fillStyle = seam;
  ctx.fillRect(STUB_X - 50, 0, 100, H);

  for (let i = 0; i < 6000; i++) {
    const v = 140 + Math.floor(Math.random() * 30);
    ctx.fillStyle = `rgba(${v},${v},${v},0.05)`;
    ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipMapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
): void {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const w of words) {
    const probe = line ? `${line} ${w}` : w;
    if (ctx.measureText(probe).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines - 1) break;
    } else {
      line = probe;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);

  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 0) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = `${last}…`;
  }

  ctx.textAlign = "left";
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
}
