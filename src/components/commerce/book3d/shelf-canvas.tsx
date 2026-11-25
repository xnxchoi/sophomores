"use client";

import { Environment, Lightformer, PerspectiveCamera, View } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Box3, Vector3, type Group } from "three";
import { BOOK_SIZE, ClosedBook, type BookTextures } from "./book";

export type ShelfBook = { id: string; textures: BookTextures };
export type ShelfRect = { left: number; top: number; width: number; height: number };

// stripe.press's spine row (TEARDOWN §3.2, notes A §5), scaled to our book: every book stands spine out except the
// selected one, which turns to face you (yaw 0 → 1, τ 0.2 s) and comes forward while the others sit back.
const GAP = 0.3, FORWARD = 2.5, BACK = 0.5, TAU = 0.2, DRAG_PX = 140;
// The camera stands close enough that the books fill most of the shelf's height (stripe.press's spines run ~65% of the
// screen).
const CAMERA_Z = 40;

/**
 * The shop's shelf in the site's shared canvas, through a drei View in the page's flow. Each frame the books report
 * their rects on screen, and a click picks the book under it from those (the selected book first): a spine selects,
 * the selected book opens its page (onOpen gets its rect, for the carry). ← → step, Enter opens; a horizontal drag
 * steps one book per 140 px.
 */
export default function ShelfView({ books, selected, onSelect, onOpen, className }: {
  books: ShelfBook[]; selected: number; onSelect: (index: number) => void; onOpen: (index: number, rect: ShelfRect) => void; className?: string;
}) {
  const small = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const [track, setTrack] = useState<HTMLElement | null>(null);
  const rects = useRef<ShelfRect[]>([]);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const step = (by: number) => onSelect(Math.min(Math.max(selected + by, 0), books.length - 1));
  // The rects are kept as fractions of the shelf (the canvas draws on demand, so a scroll doesn't refresh them): they
  // become screen pixels against the shelf's rect at the moment they're used.
  const onScreen = (index: number): ShelfRect | null => {
    const rect = rects.current[index], box = track?.getBoundingClientRect();
    return rect && box ? { left: box.left + rect.left * box.width, top: box.top + rect.top * box.height, width: rect.width * box.width, height: rect.height * box.height } : null;
  };
  const open = () => { const rect = onScreen(selected); if (rect) onOpen(selected, rect); };
  const pick = (x: number, y: number) => {
    const inside = (index: number) => { const rect = onScreen(index); return Boolean(rect && x >= rect.left && x <= rect.left + rect.width && y >= rect.top && y <= rect.top + rect.height); };
    if (inside(selected)) return selected;
    return books.findIndex((_, index) => inside(index));
  };
  // Keys and the drag on a focusable wrapper (drei's View types take neither); the View inside is the pointer target R3F
  // raycasts from, and its pointer events bubble here.
  return <div tabIndex={0} className={className}
    onKeyDown={(event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); step(event.key === "ArrowLeft" ? -1 : 1); }
      else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
    }}
    onPointerDown={(event: ReactPointerEvent) => { drag.current = { x: event.clientX, moved: false }; }}
    onPointerMove={(event: ReactPointerEvent) => {
      const d = drag.current;
      if (!d || Math.abs(event.clientX - d.x) < DRAG_PX) return;
      step(event.clientX < d.x ? 1 : -1); d.x = event.clientX; d.moved = true;
    }}
    // Cleared after the click that ends the drag has been seen (so a drag never also picks a book).
    onPointerUp={() => { setTimeout(() => { drag.current = null; }, 0); }} onPointerCancel={() => { drag.current = null; }}
    onClick={(event) => {
      if (drag.current?.moved) return;
      const index = pick(event.clientX, event.clientY);
      if (index === selected) open(); else if (index >= 0) onSelect(index);
    }}>
  <View className="absolute inset-0"
    // drei re-attaches the ref on every render: keep the element, ignore the null.
    ref={(element: HTMLElement | null) => { if (element && element !== track) setTrack(element); }}>
    <PerspectiveCamera makeDefault fov={18} position={[0, 0, CAMERA_Z]} near={1} far={400} />
    {/* The product book's light (book-canvas.tsx): soft fill, a key from the upper right, reflections from light panels. */}
    <ambientLight intensity={0.6} />
    <directionalLight position={[10, 14, 30]} intensity={1.1} />
    <directionalLight position={[-14, 6, 18]} intensity={0.45} />
    <Environment resolution={128}>
      <Lightformer form="rect" intensity={2} position={[0, 6, 20]} scale={[30, 8, 1]} />
      <Lightformer form="rect" intensity={1} position={[-20, -4, 10]} rotation-y={Math.PI / 3} scale={[20, 6, 1]} />
    </Environment>
    <Suspense fallback={null}>
      <Row books={books} selected={selected} small={small} onRects={(next) => { rects.current = next; }} />
    </Suspense>
  </View>
  </div>;
}

function Row({ books, selected, small, onRects }: {
  books: ShelfBook[]; selected: number; small: boolean; onRects: (rects: ShelfRect[]) => void;
}) {
  const groups = useRef<(Group | null)[]>([]);
  const yaw = useRef<number[]>(books.map((_, i) => (i === selected ? 1 : 0)));
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => { invalidate(); }, [selected, invalidate]);
  const box = useRef(new Box3()), corner = useRef(new Vector3());

  useFrame((state, delta) => {
    const k = 1 - Math.exp(-Math.min(delta, 0.05) / TAU), { width: W, depth: D } = BOOK_SIZE;
    const next = books.map((_, i) => {
      const target = i === selected ? 1 : 0, now = yaw.current[i] ?? 0, eased = now + (target - now) * k;
      return Math.abs(target - eased) > 1e-3 ? eased : target;
    });
    const moving = next.some((value, i) => value !== (i === selected ? 1 : 0));
    yaw.current = next;
    // Each book's slot widens from its spine to its cover as it turns; the row slides so the selected book is centred.
    const widths = yaw.current.map((y) => D + (W - D) * y);
    const centres: number[] = [];
    widths.reduce((x, w) => { centres.push(x + w / 2); return x + w + GAP; }, 0);
    const offset = centres[selected] ?? 0;
    groups.current.forEach((group, i) => {
      if (!group) return;
      const y = yaw.current[i];
      // Spine out, a book's spine sits W/2 in front of its centre: it is pulled back by that, and a little more.
      group.position.set(centres[i] - offset, 0, -(W / 2 + BACK) * (1 - y) + FORWARD * y);
      group.rotation.y = (Math.PI / 2) * (1 - y);
    });
    if (moving) state.invalidate();
    // Every book's rect on the shelf, as fractions of it: the click picks from these, and the selected one starts the
    // carry into its page.
    {
      onRects(groups.current.map((group) => {
        if (!group) return { left: 0, top: 0, width: 0, height: 0 };
        box.current.setFromObject(group);
        const { min, max } = box.current;
        let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
        for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) {
          corner.current.set(x, y, z).project(state.camera);
          const px = (corner.current.x + 1) / 2, py = (1 - corner.current.y) / 2;
          left = Math.min(left, px); right = Math.max(right, px); top = Math.min(top, py); bottom = Math.max(bottom, py);
        }
        return { left, top, width: right - left, height: bottom - top };
      }));
    }
  });

  return <group>
    {books.map((book, i) => <group key={book.id} ref={(group) => { groups.current[i] = group; }}>
      <ClosedBook textures={book.textures} small={small} />
    </group>)}
  </group>;
}
