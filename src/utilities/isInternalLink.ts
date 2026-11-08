export const isInternalLink = (href: string) => {
  // Use the platform URL parser; getURL's localhost fallback is not authority
  // to classify absolute links as this site's own origin.
  if (!href || href !== href.trim() || /[\u0000-\u0020\u007f]/.test(href)) return false;
  try {
    const relativeBase = new URL('https://relative.invalid');
    const target = new URL(href, relativeBase);
    if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) return false;
    const networkRelative = href.replaceAll('\\', '/').startsWith('//');
    if (!URL.canParse(href) && !networkRelative && target.origin === relativeBase.origin) return true;

    const configured = process.env.NEXT_PUBLIC_SERVER_URL;
    if (!configured || configured !== configured.trim()) return false;
    const server = new URL(configured);
    if (!['http:', 'https:'].includes(server.protocol) || server.username || server.password) return false;
    return new URL(href, server).origin === server.origin;
  } catch {
    // Invalid destinations and malformed optional configuration are external.
    return false;
  }
};
