import { DateTime, Interval } from "luxon";
import { Locale } from "next-intl";

export function basename(str: string, sep: string) {
  return str.substr(str.lastIndexOf(sep) + 1);
}

export function inputClear(target: string) {
  const tg = document.querySelector(target);
  if (tg && tg instanceof HTMLInputElement) {
    tg.value = "";
  }
}

export function cbToggle(target: string, enable: boolean) {
  const tg = document.querySelector(target);
  if (tg && tg instanceof HTMLInputElement) {
    tg.disabled = !enable;
  }
}

export function strip_extension(str: string) {
  return str.substr(0, str.lastIndexOf("."));
}

export function checkWebView() {
  let isWebView;
  if (isWebView === null) {
    function _detectOS(ua: string) {
      if (/Android/.test(ua)) {
        return "Android";
      }
      if (/iPhone|iPad|iPod/.test(ua)) {
        return "iOS";
      }
      if (/Windows/.test(ua)) {
        return "Windows";
      }
      if (/Mac OS X/.test(ua)) {
        return "Mac";
      }
      if (/CrOS/.test(ua)) {
        return "Chrome OS";
      }
      if (/Firefox/.test(ua)) {
        return "Firefox OS";
      }
      return "";
    }

    function _detectBrowser(ua: string) {
      const android = /Android/.test(ua);

      if (/Opera Mini/.test(ua) || / OPR/.test(ua) || / OPT/.test(ua)) {
        return "Opera";
      }
      if (/CriOS/.test(ua)) {
        return "Chrome for iOS";
      }
      if (/Edge/.test(ua)) {
        return "Edge";
      }
      if (android && /Silk\//.test(ua)) {
        return "Silk";
      }
      if (/Chrome/.test(ua)) {
        return "Chrome";
      }
      if (/Firefox/.test(ua)) {
        return "Firefox";
      }
      if (android) {
        return "AOSP";
      }
      if (/MSIE|Trident/.test(ua)) {
        return "IE";
      }
      if (/Safari\//.test(ua)) {
        return "Safari";
      }
      if (/AppleWebKit/.test(ua)) {
        return "WebKit";
      }
      return "";
    }

    function _detectBrowserVersion(ua: string, browser: string) {
      if (browser === "Opera") {
        return /Opera Mini/.test(ua)
          ? _getVersion(ua, "Opera Mini/")
          : / OPR/.test(ua)
            ? _getVersion(ua, " OPR/")
            : _getVersion(ua, " OPT/");
      }
      if (browser === "Chrome for iOS") {
        return _getVersion(ua, "CriOS/");
      }
      if (browser === "Edge") {
        return _getVersion(ua, "Edge/");
      }
      if (browser === "Chrome") {
        return _getVersion(ua, "Chrome/");
      }
      if (browser === "Firefox") {
        return _getVersion(ua, "Firefox/");
      }
      if (browser === "Silk") {
        return _getVersion(ua, "Silk/");
      }
      if (browser === "AOSP") {
        return _getVersion(ua, "Version/");
      }
      if (browser === "IE") {
        return /IEMobile/.test(ua)
          ? _getVersion(ua, "IEMobile/")
          : /MSIE/.test(ua)
            ? _getVersion(ua, "MSIE ")
            : _getVersion(ua, "rv:");
      }
      if (browser === "Safari") {
        return _getVersion(ua, "Version/");
      }
      if (browser === "WebKit") {
        return _getVersion(ua, "WebKit/");
      }
      return "0.0.0";
    }

    function _getVersion(ua: string, token: string) {
      try {
        return _normalizeSemverString(
          ua
            .split(token)[1]
            .trim()
            .split(/[^\w\.]/)[0]
        );
      } catch (o_O) {}
      return "0.0.0";
    }

    function _normalizeSemverString(version: string) {
      const ary = version.split(/[\._]/);
      return `${parseInt(ary[0], 10) || 0}.${parseInt(ary[1], 10) || 0}.${
        parseInt(ary[2], 10) || 0
      }`;
    }

    function _isWebView(
      ua: string,
      os: string,
      browser: string,
      version: string,
      options: any
    ) {
      switch (os + browser) {
        case "iOSSafari":
          return false;
        case "iOSWebKit":
          return _isWebView_iOS(options);
        case "AndroidAOSP":
          return false;
        case "AndroidChrome":
          return parseFloat(version) >= 42
            ? /; wv/.test(ua)
            : /\d{2}\.0\.0/.test(version)
              ? true
              : _isWebView_Android(options);
      }
      return false;
    }

    function _isWebView_iOS(options: any) {
      const document = window.document || {};

      if ("WEB_VIEW" in options) {
        return options.WEB_VIEW;
      }
      return !(
        "fullscreenEnabled" in document ||
        "webkitFullscreenEnabled" in document ||
        false
      );
    }

    function _isWebView_Android(options: any) {
      if ("WEB_VIEW" in options) {
        return options.WEB_VIEW;
      }
      return !(
        "requestFileSystem" in window ||
        "webkitRequestFileSystem" in window ||
        false
      );
    }

    const options = {};
    const nav = window.navigator || {};
    const ua = nav.userAgent || "";
    const os = _detectOS(ua);
    const browser = _detectBrowser(ua);
    const browserVersion = _detectBrowserVersion(ua, browser);

    isWebView = _isWebView(ua, os, browser, browserVersion, options);
  }

  return isWebView;
}

export function htmlDecode(input: string) {
  const doc = new DOMParser().parseFromString(input, "text/html");
  return doc.documentElement.textContent;
}

export function formatDate(dateString: string, locale: Locale) {
  const now = DateTime.now();
  const date = DateTime.fromJSDate(new Date(dateString));
  const interval = Interval.fromDateTimes(date, now);

  const diffDays = interval.length("days");
  // Less than 1 week old
  if (diffDays < 7) {
    if (diffDays >= 1) return `${Math.floor(diffDays)} 일 전`;
    const diffHours = interval.length("hours");
    if (diffHours >= 1) return `${Math.floor(diffHours)} 시간 전`;
    const diffM = interval.length("minutes");
    if (diffM >= 1) return `${Math.floor(diffM)} 분 전`;
    return `방금 전`;
  }
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric"
  };
  const year = date.year;
  const month = date.monthShort;
  const day = date.day;

  // Same year
  if (now.year === year) {
    date.toFormat("MMM DD");
  }
  // Different year
  return `${month} '${year.toString().slice(2)}`;
}

export function getTwoDigMs(hM: string) {
  let mth = "01";
  switch (hM) {
    case "Jan":
      mth = "01";
      break;
    case "Feb":
      mth = "02";
      break;
    case "Mar":
      mth = "03";
      break;
    case "Apr":
      mth = "04";
      break;
    case "May":
      mth = "05";
      break;
    case "Jun":
      mth = "06";
      break;
    case "Jul":
      mth = "07";
      break;
    case "Aug":
      mth = "06";
      break;
    case "Sep":
      mth = "06";
      break;
    case "Oct":
      mth = "06";
      break;
    case "Nov":
      mth = "06";
      break;
    case "Dec":
      mth = "06";
      break;
  }
  return mth;
}

export function titleToSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^\w-]+/g, "");
}

export function getDate(): string {
  const today = new Date();
  const year = today.getFullYear(); // 2023
  const month = (today.getMonth() + 1).toString().padStart(2, "0"); // 06
  const day = today.getDate().toString().padStart(2, "0"); // 18
  return `${year}-${month}-${day}`;
}

export function loadMime(file: File, callback: (mime: string) => void): void {
  const mimes = [
    {
      mime: "image/jpeg",
      pattern: [0xff, 0xd8, 0xff],
      mask: [0xff, 0xff, 0xff]
    },
    {
      mime: "image/png",
      pattern: [0x89, 0x50, 0x4e, 0x47],
      mask: [0xff, 0xff, 0xff, 0xff]
    },
    {
      mime: "image/webp",
      pattern: [0x52, 0x49, 0x46, 0x46],
      mask: [0xff, 0xff, 0xff, 0xff]
    } // you can expand this list @see https://mimesniff.spec.whatwg.org/#matching-an-image-type-pattern
  ];

  function check(bytes: Uint8Array, mime: any) {
    for (let i = 0, l = mime.mask.length; i < l; ++i) {
      if ((bytes[i] & mime.mask[i]) - mime.pattern[i] !== 0) {
        return false;
      }
    }
    return true;
  }

  const blob = file.slice(0, 4); // read the first 4 bytes of the file

  const reader = new FileReader();
  reader.onloadend = function (e: ProgressEvent<FileReader>) {
    if (e.target?.readyState === FileReader.DONE) {
      const tt = e.target.result;
      if (!tt || !(tt instanceof ArrayBuffer)) return false;
      const bytes = new Uint8Array(tt);
      for (let i = 0, l = mimes.length; i < l; ++i) {
        const k = mimes[i];
        if (!k || typeof k !== "object") {
          continue;
        }
        if (check(bytes, k)) {
          return k.mime;
        }
      }
      return false;
    }
  };
  reader.readAsArrayBuffer(blob);
}

export async function clickToCopy() {
  const copyText: HTMLInputElement | null = document.getElementById(
    "myInput"
  ) as HTMLInputElement | null;
  if (!copyText) return;
  const copyButton = document.getElementById("copyButton")!; // You'll need to add an ID to your Copy button for this to work
  const copyTxt = "Copy";
  const copiedTxt = "Copied";
  try {
    await navigator.clipboard.writeText(copyText.value);
    // Change button text
    copyButton.innerText = copiedTxt;
    // Reset button text back to 'Copy' after some time
    setTimeout(() => (copyButton.innerText = copyTxt), 3000);
  } catch (err) {
    console.error("Failed to copy text to clipboard", err);
    copyButton.innerText = "Failed to copy";
  }
}

/**
 * linear interpolation function.
 * @param baseValue value to start from
 * @param toValue value to end at
 * @param delta interpolation factor. 0.0 = no change, 1.0 = full change
 */

export function lerp(baseValue: number, toValue: number, delta = 0.1) {
  return (1 - delta) * baseValue + toValue * delta;
}

export const isElementLoaded = async (selector: string) => {
  while (document.querySelector(selector) === null) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return document.querySelector(selector);
};
export const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const normalizedColor = ([r, g, b]: [number, number, number]): [
  number,
  number,
  number
] => {
  return [r / 255, g / 255, b / 255];
};
export const rgbToHex = ([r, g, b]: [number, number, number]) => {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};
export const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1] ?? "0", 16),
        parseInt(result[2] ?? "0", 16),
        parseInt(result[3] ?? "0", 16)
      ]
    : [255, 255, 255];
};
export const nHex = (hex: string): [number, number, number] => {
  return normalizedColor(hexToRgb(hex));
};

export function isHangul(value: string) {
  const koreanNamePattern = /[가-힣]+/;
  return koreanNamePattern.test(value);
}

export function containsLettersOnly(value: string) {
  const regex = /^(?!.*--)(?!-)[\p{L}]+(-[\p{L}]+)*(?<!-)$/iu;
  return regex.test(value);
}

export function fullNameRegex(value: string) {
  const nameRegex =
    /^(?!.*(--|''|’’|\s{2,}|-'|'–|–'| -| -|' |' ))(?![-'’ ])[\p{L}]+(?:[-'’ ][\p{L}]+)*(?<![-'’ ])$/iu;
  return nameRegex.test(value);
}

export function capitalizeName(name: string): string {
  return name
    .toLowerCase()
    .split(/([-'\u2019 ])/u) // split by hyphen, apostrophe, typographic apostrophe, or space
    .map((part) =>
      /^[\p{L}]/u.test(part)
        ? part.charAt(0).toLocaleUpperCase() + part.slice(1)
        : part
    )
    .join("");
}

export function handelName(value: string) {
  if (isHangul(value)) return value;
  if (containsLettersOnly(value)) return value;
}

export function isAlphabet(charCode: number) {
  return !(
    !(charCode > 64 && charCode < 91) && !(charCode > 96 && charCode < 123)
  );
}
