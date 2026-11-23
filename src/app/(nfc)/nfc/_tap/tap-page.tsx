import { TapConfirm, type NfcTapView } from "./tap-confirm";

export function TapPage({ view }: { view: NfcTapView }) {
  return <TapConfirm view={view} />;
}
