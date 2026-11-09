import { z } from "zod";

/**
 * URL schema that accepts only `http:` and `https:` schemes.
 *
 * Zod's built-in `z.url()` accepts any RFC-valid URL, which includes
 * `javascript:alert(1)` and `data:text/html,...`. Persisting such a value
 * as a profile link and later rendering it as `<a href={user.link}>` is
 * stored XSS. This schema rejects every non-http(s) scheme at validation
 * time so the bad value never reaches the database.
 */
export const httpUrl = z.url().refine((v) => /^https?:\/\//i.test(v), {
  message: "URL must start with http:// or https://"
});
