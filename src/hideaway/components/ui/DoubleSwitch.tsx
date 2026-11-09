import {
  ComponentPropsWithoutRef,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { cn } from "@/lib/utils";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { HA_Button as Button } from "@/components/ui/button";

type SwitchPart = ComponentPropsWithoutRef<"button"> & {
  name: string;
  value: string;
  label?: string;
};
type SwitchProps = {
  state?: boolean;
  left: SwitchPart;
  right: SwitchPart;
  onChange?: () => void;
  default?: boolean;
} & ComponentPropsWithoutRef<"div">;
gsap.registerPlugin(Flip);
export default function DoubleSwitch(props: SwitchProps) {
  const [state, setState] = useState(props.state || false);
  const { onChange } = props;
  const { left, right } = props;
  const locRef = useRef(false);
  const leftRef = useRef<HTMLButtonElement>(null!),
    rightRef = useRef<HTMLButtonElement>(null!);
  const flip = useRef<HTMLDivElement>(null!);
  const flipButton = useCallback(
    (st: boolean) => {
      const a = Flip.getState(flip.current);
      (st ? rightRef : leftRef)["current"].append(flip.current);
      Flip.from(a, { duration: 0.4 });
    },
    [leftRef, rightRef, flip]
  );
  useEffect(() => {
    flipButton(state);
    locRef.current = state;
    onChange && onChange();
  }, [flipButton, onChange, state]);

  return (
    <div
      data-flip-button="wrap"
      className={cn("filter-bar small", ...[props.className])}
    >
      <Button
        data-flip-button="button"
        data-price="button"
        ref={leftRef}
        value={left.value}
        onMouseEnter={() => flipButton(false)}
        onMouseLeave={() => flipButton(locRef.current)}
        onClick={() => {
          setState(false);
        }}
        data-price-state="quarter"
        className={cn(
          "filter-button small",
          { active: !state },
          ...[left.className]
        )}
      >
        {left.label && <div className="p-reg">{left.label}</div>}
        {left.children}
        {!props.state && (
          <div
            data-flip-button="bg"
            className="tab-button__bg"
            data-flip-id="auto-1"
            ref={flip}
          />
        )}
      </Button>
      <Button
        data-flip-button="button"
        data-price="button"
        onMouseEnter={() => flipButton(true)}
        onMouseLeave={() => flipButton(locRef.current)}
        onClick={() => {
          setState(true);
        }}
        ref={rightRef}
        data-price-state="annual"
        value={right.value}
        className={cn("filter-button small", { active: state })}
      >
        {right.label && <div className="p-reg">{right.label}</div>}
        {right.children}
        {props.state === true ? (
          <div
            data-flip-button="bg"
            className="tab-button__bg"
            data-flip-id="auto-1"
            ref={flip}
          />
        ) : (
          <></>
        )}
      </Button>
    </div>
  );
}
