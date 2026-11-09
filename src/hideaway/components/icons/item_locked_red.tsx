import Image from "next/image";

export const ItemLockedRed = () => {
  return (
    <div
      className="transition-width flex h-4 items-center justify-center gap-x-0 rounded-sm bg-foreground px-2 duration-200"
      style={{ transition: "width .2s cubic-bezier(.55, .085, .68, .53)" }}
    >
      <svg
        id="lock_black"
        xmlns="http://www.w3.org/2000/svg"
        width="11"
        height="12"
        viewBox="0 0 11 12"
        fill="none"
      >
        <mask id="path-1-inside-1_572_830" fill="white">
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M8 4V6H7.00024C6.58237 6.31396 6.06291 6.5 5.5 6.5C4.93709 6.5 4.41763 6.31396 3.99976 6H3V4C3 2.61929 4.11929 1.5 5.5 1.5C6.88071 1.5 8 2.61929 8 4Z"
          />
        </mask>
        <path
          d="M8 6V7H9V6H8ZM7.00024 6V5H6.66644L6.39957 5.20051L7.00024 6ZM3.99976 6L4.60043 5.20051L4.33356 5H3.99976V6ZM3 6H2V7H3V6ZM7 4V6H9V4H7ZM8 5H7.00024V7H8V5ZM6.39957 5.20051C6.14894 5.38881 5.8389 5.5 5.5 5.5V7.5C6.28693 7.5 7.0158 7.2391 7.60092 6.79949L6.39957 5.20051ZM5.5 5.5C5.1611 5.5 4.85106 5.38881 4.60043 5.20051L3.39908 6.79949C3.9842 7.2391 4.71307 7.5 5.5 7.5V5.5ZM3.99976 5H3V7H3.99976V5ZM4 6V4H2V6H4ZM4 4C4 3.17157 4.67157 2.5 5.5 2.5V0.5C3.567 0.5 2 2.067 2 4H4ZM5.5 2.5C6.32843 2.5 7 3.17157 7 4H9C9 2.067 7.433 0.5 5.5 0.5V2.5Z"
          fill="black"
          mask="url(#path-1-inside-1_572_830)"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M9 5H2V10H9V5ZM6 7H5V9H6V7Z"
          fill="black"
        />
      </svg>
      <Image
        src="url(#lock_black)"
        loading="lazy"
        alt=""
        className="vertical-align-middle inline-block h-auto w-[13px] max-w-full 2xl:h-[12px]"
      />
      <div
        className="c-item-tag-label"
        style={{ opacity: 0, display: "none", height: "8px", width: "0px" }}
      >
        <div className="uppercaase bg-transparent pt-[2px] text-[8px] leading-[6px] font-bold tracking-[-.01em] whitespace-nowrap 2xl:leading-[.01em]">
          Non-NDA&#39;d
        </div>
      </div>
    </div>
  );
};
