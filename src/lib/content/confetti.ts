import { PALETTE } from "@/utils/palette";
export type ConfettiPiece = {
  front: string;
  back: string;
  w: number;
  h: number;
  x: number;
  y: number;
  rotation: number;
  vx: number;
  vy: number;
};

const COLORS = [
  [PALETTE.deepCinnabar.hex, PALETTE.arterialRed.hex],
  [PALETTE.mutedOlive.hex, PALETTE.ultramarine.hex],
  [PALETTE.gulfCerulean.hex, PALETTE.ultramarine.hex],
  [PALETTE.saffronAmberLighter1.hex, PALETTE.signalOrange.hex],
  [PALETTE.signalOrange.hex, PALETTE.arterialRed.hex],
  [PALETTE.gulfCerulean.hex, PALETTE.imperialPlum.hex]
] as const;

function between(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/** Pieces start along the bottom edge and launch upward. */
export function spawnConfetti(width: number, height: number, count = 300): ConfettiPiece[] {
  return Array.from({ length: count }, () => {
    const [front, back] = COLORS[Math.floor(Math.random() * COLORS.length)];
    return {
      front,
      back,
      w: between(10, 40),
      h: between(10, 30),
      x: between(0, width),
      y: height - 1,
      rotation: between(0, Math.PI * 2),
      vx: between(-25, 25),
      vy: between(-50, -5)
    };
  });
}

export function stepConfetti(
  pieces: ConfettiPiece[],
  height: number,
  gravity = 0.8,
  drag = 0.075,
  terminal = 20
) {
  const alive: ConfettiPiece[] = [];
  for (const piece of pieces) {
    const vx = piece.vx - piece.vx * drag + (Math.random() > 0.5 ? Math.random() : -Math.random());
    const vy = Math.min(piece.vy + gravity, terminal);
    const y = piece.y + vy;
    if (y >= height + piece.h * 2) continue;
    alive.push({
      ...piece,
      vx,
      vy,
      x: piece.x + vx,
      y,
      rotation: piece.rotation + vx * 0.01
    });
  }
  return alive;
}
