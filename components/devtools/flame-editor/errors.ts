interface EnvelopeErrors {
  readonly fatal: string;
  readonly mask: string;
}

type EnvelopeErrorAction =
  | { readonly type: 'renderer-failed'; readonly message: string }
  | { readonly type: 'mask-failed'; readonly message: string }
  | { readonly type: 'mask-ready' };

export const INITIAL_ENVELOPE_ERRORS: EnvelopeErrors = { fatal: '', mask: '' };

/** Mask replacements can recover independently; a stopped renderer still requires a reload. */
export function envelopeErrorReducer(state: EnvelopeErrors, action: EnvelopeErrorAction): EnvelopeErrors {
  switch (action.type) {
    case 'renderer-failed': return { ...state, fatal: action.message };
    case 'mask-failed': return { ...state, mask: action.message };
    case 'mask-ready': return { ...state, mask: '' };
  }
}
