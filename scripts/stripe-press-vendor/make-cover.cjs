// Our cover placeholder in their atlas layout (1920 wide: back 0-875, spine 875-1044, front 1044-1920). Quiet: flat
// boards, one small grey label (owner, 25 Nov). The cover faces show image rows ~285-1300 (measured with a ruler
// texture); the strip above is off-face. `diag` draws a labelled orientation test instead.
const sharp = require("sharp"), path = require("path");
const W = 1920, H = 1300, BACK = 875, FRONT = 1044, mode = process.argv[2] || "placeholder";
const svg = mode === "diag"
  ? `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#ddd"/>
     <rect x="${BACK}" width="${FRONT - BACK}" height="${H}" fill="#9ab"/>
     <g font-family="Helvetica" font-size="120" fill="#c00" text-anchor="middle">
     <text x="${(FRONT + W) / 2}" y="200">FRONT TOP</text><text x="${(FRONT + W) / 2}" y="${H - 80}">front bottom</text>
     <text x="${BACK / 2}" y="200">BACK TOP</text><text x="${(FRONT + BACK) / 2}" y="${H / 2}" font-size="60">S</text></g></svg>`
  : `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#e6e5e1"/>
     <rect x="${BACK}" width="${FRONT - BACK}" height="${H}" fill="#dcdbd7"/>
     <text x="${FRONT + 60}" y="370" font-family="Helvetica, Arial, sans-serif" font-size="30" letter-spacing="2" fill="#9a9994">Placeholder</text></svg>`;
sharp(Buffer.from(svg)).png().toFile(path.join(__dirname, "assets", mode === "diag" ? "cover-diag.png" : "cover-placeholder.png")).then(() => console.log("ok", mode));
