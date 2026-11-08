function clamp(input: number, min: number, max: number) {
	return Math.max(min, Math.min(input, max));
}

function mapRange(
	inMin: number,
	inMax: number,
	input: number,
	outMin: number,
	outMax: number,
) {
	return ((input - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

function lerp(start: number, end: number, amount: number) {
	return (1 - amount) * start + amount * end;
}

function truncate(value: number, decimals: number) {
	return Number.parseFloat(value.toFixed(decimals));
}

function modulo(n: number, d: number) {
	if (d === 0) return n;
	if (d < 0) return Number.NaN;
	return ((n % d) + d) % d;
}

const Maths = {lerp, clamp, mapRange, truncate, modulo};

export {clamp, lerp, mapRange, modulo, truncate};
export default Maths;

export function map(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

export function vec(x: number, y: number): Point {
  return { x, y };
}

export function vecAdd(a: Point, b: Point): Point {
  return {
    x: a.x + b.x, y: a.y + b.y
  };
}

export function vecSub(a: Point, b: Point): Point {
  return {
    x: a.x - b.x, y: a.y - b.y
  };
}

export function vecMult(v: Point, scalar: number): Point {
  return {
    x: v.x * scalar, y: v.y * scalar
  };
}

export interface Point {
  x: number;
  y: number;
}

export function vecLerp(start: Point, end: Point, t: number): Point {
  return {
    x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t
  };
}

// mix is an alias for lerp
export const mix = lerp;