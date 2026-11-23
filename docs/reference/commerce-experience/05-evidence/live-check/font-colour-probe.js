(() => {
  const cs = (el) => el ? getComputedStyle(el) : null;
  const root = document.documentElement, body = document.body;
  const pick = (sel) => { const el = document.querySelector(sel); return el ? cs(el).fontFamily : null; };
  const r = cs(root), b = cs(body);
  return JSON.stringify({
    path: location.pathname, theme: root.dataset.theme,
    colour: { bg: r.getPropertyValue('--background').trim(), fg: r.getPropertyValue('--foreground').trim(), bodyBg: b.backgroundColor, bodyFg: b.color },
    font: { html: r.fontFamily, body: b.fontFamily, h1: pick('h1'), p: pick('main p') || pick('p'), mono: pick('.font-mono'), heading: pick('.font-heading'), serif: pick('.font-serif'), dots: pick('.font-dots'), teaser: pick('.font-teaser-serif') },
    faces: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight + ' ' + f.style).sort()
  });
})()
