import { Tape3DScene } from "@/components/UX/TapePlayer/visuals/Tape3DScene";

export const StationHideaway = () => {
  return (
    <section
      className={
        "relative z-1 flex w-full flex-col items-center gap-x-[4em] gap-y-[4em] overflow-hidden pt-[1.2em] pb-[4em]"
      }
    >
      <div className="relative top-0 grid h-auto min-h-screen w-full grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-x-6 gap-y-6 bg-scroll px-6 pt-130 pb-78 max-xs:py-64">
        <div
          className="-ml-[1vw] max-xs:hidden"
          style={{
            gridArea: "1/1/2/3"
          }}
        >
          <div className="m-0 text-center text-[13vw] tracking-[-.05vw] uppercase">
            LO
          </div>
        </div>
        <div
          className="relative z-5 flex flex-col items-center pt-[.4em]"
          style={{
            gridArea: "1/5/2/9"
          }}
        ></div>
        <div
          className="relative z-2"
          style={{
            gridArea: "1/10/2/13"
          }}
        >
          <div></div>
        </div>
        <div
          className="ml-0 pt-[8rem]"
          style={{
            gridArea: "2/4/3/6"
          }}
        ></div>
        <div
          className="flex w-full justify-end"
          style={{
            gridArea: "3/8/4/10"
          }}
        ></div>
        <div className="absolute inset-0 block overflow-hidden"></div>
        <Tape3DScene />
        <div></div>
      </div>
    </section>
  );
};
