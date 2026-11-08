export type TranslatePosition = {
  corner: TranslatingCorner;
  offset?:
    | {
        x?: TranslatingTextOffset | number;
        y: TranslatingTextOffset | number;
      }
    | { x: TranslatingTextOffset | number; y?: TranslatingTextOffset | number };
  number: number;
};
export type TranslatingItemProps = {
  id: string;
  text: string;
  size?: "default" | "large";

  introPosition?: TranslatePosition;
  positions: TranslatePosition[];
  introPositionMobile?: TranslatePosition;
  positionsMobile?: TranslatePosition[];
  hideMobile?: boolean;
};
export type TranslatingTextProps = TranslatingItemProps;
export type TranslatingCorner = `${"TOP" | "BOTTOM"}_${"LEFT" | "RIGHT"}`;
export type TranslatingTextOffset =
  `${"UP" | "DOWN" | "LEFT" | "RIGHT"}_${number}`;
