import { ComponentPropsWithoutRef } from "react";
import { Link } from "@/components/core/Link/Link";

type LockedProps = {
  type?: "tier" | "allowList" | "admin" | "user";
  content?: string;
  tier?: NonNullable<any>["role"];
} & ComponentPropsWithoutRef<"div">;

export const Locked = ({ type, content, tier, ...rest }: LockedProps) => {
  const message =
    type === "user"
      ? "This content is only available for registered members"
      : type === "tier"
        ? `This content is available for members with ${tier ?? "Some"} access or higher`
        : type === "allowList"
          ? "Content requires authorization from the author"
          : "This content is restricted";
  const title =
    type === "user"
      ? "Members Only"
      : type === "tier" || type === "allowList"
        ? "Access Restricted"
        : "Access Locked";
  return (
    <div className="fixed inset-0 z-50 flex h-screen w-screen items-center justify-center">
      <div className="relative z-2 flex w-full flex-col flex-wrap items-center justify-center gap-10 rounded-[6px] bg-off-foreground/20 py-[100px] backdrop-blur-sm md:w-[calc((100vw-215px)*7/12+90px)]">
        <div
          className="grid h-24 w-24 place-items-center rounded-full border border-solid"
          style={{ background: "0 0" }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            height="18"
            viewBox="0 0 16 18"
            width="16"
          >
            <path
              d="m12.5556 7.22222v-1.77778c0-2.45459-1.9899-4.44444-4.44449-4.44444-2.4546 0-4.44444 1.98985-4.44444 4.44444v1.77778m4.44444 3.99998v1.7778m-2.84444 4h5.68893c1.4934 0 2.2402 0 2.8106-.2906.5018-.2557.9097-.6637 1.1654-1.1654.2906-.5705.2906-1.3172.2906-2.8107v-1.2444c0-1.49348 0-2.24022-.2906-2.81065-.2557-.50177-.6636-.90972-1.1654-1.16538-.5704-.29065-1.3172-.29065-2.8106-.29065h-5.68893c-1.49348 0-2.24021 0-2.81064.29065-.50177.25566-.90972.66361-1.16538 1.16538-.29065.57043-.29065 1.31717-.29065 2.81065v1.2444c0 1.4935 0 2.2402.29065 2.8107.25566.5017.66361.9097 1.16538 1.1654.57043.2906 1.31716.2906 2.81064.2906z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.33333"
            />
          </svg>
        </div>
        <h2 className="sm-title">{title}</h2>
        <div>{message}</div>
        <div className="relative contents">
          <Link
            href="/register"
            className="border-faded-foreground/&.8)] hover:bg-faded-foreground/&.3)] relative flex h-[41px] w-full min-w-[120px] flex-[0_0_auto] flex-row items-center justify-center gap-[12px] overflow-hidden rounded-lg border-[1px] border-solid px-[16px] py-0 uppercase transition-colors duration-300 ease-in-out hover:border-background/10 hover:text-background"
          >
            <svg
              className="absolute left-[16px] m-0 inline-block h-full w-[11px] object-contain"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              height="13"
              viewBox="0 0 11 13"
              width="11"
            >
              <path
                clipRule="evenodd"
                d="m.5.00000087.000001 8.99999913h8.292889l-2.32842 2.3284c-.19527.1953-.19527.5119 0 .7071.19526.1953.51184.1953.7071 0l3.18203-3.18195c.1952-.19526.1952-.51184 0-.7071l-3.18203-3.18198c-.19526-.19527-.51184-.19527-.7071 0-.19527.19526-.19527.51184 0 .7071l2.32842 2.32843h-7.29289v-7.99999921z"
                fill="currentColor"
                fillRule="evenodd"
              />
            </svg>
            <span className="h-full w-full text-center">
              <span>{content ?? "Get Access"}</span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};
