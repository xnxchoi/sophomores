type TempusRafFrame = {
  time?: number;
};

export function getLenisRafTime(frame: number | TempusRafFrame | undefined) {
  const time = typeof frame === "number" ? frame : frame?.time;
  return typeof time === "number" && Number.isFinite(time) ? time : null;
}
