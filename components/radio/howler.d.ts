declare module "howler" {
  export class Howl {
    constructor(options: { src: string[]; html5?: boolean });
    play(): void;
    pause(): void;
    unload(): void;
  }
}
