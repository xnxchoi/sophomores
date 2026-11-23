"use client";
// Positive: a dynamic import of a whole catalogue still lands in a client chunk.
export async function loadKorean() {
  return (await import("../../../messages/ko.json")).default;
}
