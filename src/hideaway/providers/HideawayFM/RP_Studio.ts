import type { RPStudioOptions } from "@/hideaway/providers/HideawayFM/types";
import { Howl, HowlOptions } from "howler";

declare module "howler" {
  interface Howl {
    _duration: number;
    _sprite: Record<string, [number, number]>;
    _src: string[];
    _format?: string | string[] | undefined;
    _autoplay: boolean;
    _loop: boolean;
    _muted: boolean;
    _volume: number;
    _html5: boolean;
    _sounds: Sound[];
    _preload: boolean;
    _rate: number;
  }
  interface Sound {
    _muted: Howl["_muted"];
    _loop: Howl["_loop"];
    _volume: Howl["_volume"];
    _rate: Howl["_rate"];
    _id: number;
    _node?: GainNode | AudioNode;
    _parent: Howl;
    _loadFn?: HowlListeners["onload"];
    _loadListener: () => void;
    _errorListener: () => void;
    _errorFn?: HowlListeners["onloaderror"];
    _endListener: () => void;

    _seek: number;
    _paused: boolean;
    _ended: boolean;
    _sprite: "__default" | SoundSpriteDefinitions;
    create: () => Sound;
    reset: () => Sound;
    init: () => Sound;
  }
}

export interface SwitchTrackOptions extends HowlOptions {
  trackIndex?: number;
  track?: RPStudioOptions["track"];
  onChangeStart?: (studio: RP_Studio) => void;
  onChangeComplete?: (studio: RP_Studio) => void;
}

/**
 * A `Howl` bound to the two fields HideawayFM needs on the instance itself:
 * the canonical `track` metadata and the `trackIndex` into the roll. This
 * lets a single ref follow whichever Howl is currently in the foreground —
 * metadata travels with the instance rather than being tracked externally.
 */
export class RP_Studio extends Howl {
  trackIndex: number;
  track: RPStudioOptions["track"];

  constructor({ track, trackIndex, ...options }: RPStudioOptions) {
    super(options);
    this.trackIndex = trackIndex;
    this.track = track;
  }

  get uuid() {
    return this.track.id;
  }

  get title() {
    return this.track.title;
  }

  /**
   * Re-point this Howl at a new source in place, rebinding `track`/`trackIndex`
   * so the instance's identity continues to match what it is actually playing.
   * Mirrors the prototype `switchTrack` used in the old RadioProvider but on a
   * real subclass so `this` resolves correctly.
   */
  switchTrack({
    onChangeStart,
    onChangeComplete,
    trackIndex,
    track,
    ...o
  }: SwitchTrackOptions): void {
    onChangeStart?.(this);

    this.unload();

    this._duration = 0;
    this._sprite = {};
    this._src = typeof o.src === "string" ? [o.src] : o.src;
    this._format = o.format;
    this._autoplay = false;
    this._loop = false;
    this._html5 = o.html5 ?? true;
    const shouldLoad = o.preload !== false;
    this._preload = shouldLoad;

    if (trackIndex !== undefined) {
      this.trackIndex = trackIndex;
    }
    if (track !== undefined) {
      this.track = track;
    }

    if (onChangeComplete) {
      this.once("load", () => onChangeComplete(this));
    }

    if (shouldLoad) this.load();
  }
}
