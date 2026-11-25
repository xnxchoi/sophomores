import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

// Review-B r2: the vendored scene requests none of their audio (their sound module 63913 only forwards to ours, Howler gone).
const DIR = join(process.cwd(), "public/vendor/stripe-press/static/immutable/chunks");

// three.js keeps its own (unused) Audio class in 1hkd; the check is for their sound: audio paths, audio data and Howler.
test("no vendored chunk carries an audio path, audio data or a Howl", () => {
  for (const file of readdirSync(DIR).filter((name) => name.endsWith(".js"))) {
    const source = readFileSync(join(DIR, file), "utf8");
    assert.equal(/\/audio\/|\.m4a|data:audio|\.Howl\(|Howler/.test(source), false, file);
  }
});

test("their sound module keeps its eight exports, each forwarding to ours (globalThis.__SPSOUND)", () => {
  const source = readFileSync(join(DIR, "12s2cqzsl56ip.js"), "utf8");
  assert.equal(source.includes('63913,e=>{let f=n=>(...a)=>globalThis.__SPSOUND?.[n]?.(...a);e.s(["t",0,f("t"),"B",0,f("B"),"J",0,f("J"),"D",0,f("D"),"X",0,f("X"),"G",0,f("G"),"r",0,f("r"),"z",0,f("z")])}'), true);
  assert.equal(source.includes("43469,(e,t,n)=>{}"), true);
});
