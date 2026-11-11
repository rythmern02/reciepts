import fs from "fs";
import path from "path";
import sharp from "sharp";

function pngToIco(pngBuffers: { buffer: Buffer; size: number }[]) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type (1 for icon)
  header.writeUInt16LE(pngBuffers.length, 4); // count

  let offset = 6 + pngBuffers.length * 16;
  const entries: Buffer[] = [];

  for (const { buffer, size } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(buffer.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    entries.push(entry);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map((p) => p.buffer)]);
}

export async function generateIcons() {
  const publicDir = path.join(process.cwd(), "public");
  const appDir = path.join(process.cwd(), "src", "app");
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  // Base SVG icon (squircle background with centered receipt mark)
  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <filter id="subtle-shadow" x="-10%" y="-10%" width="120%" height="125%">
        <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000" flood-opacity="0.55" />
      </filter>
    </defs>
    <!-- Dark rounded canvas -->
    <rect width="512" height="512" rx="112" fill="#0a0a0a" />
    <rect width="508" height="508" x="2" y="2" rx="110" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="4" />
    
    <!-- Centered receipt paper mark with torn bottom -->
    <g transform="translate(106, 78) scale(16.6)" filter="url(#subtle-shadow)">
      <path
        d="M1 1h16v18l-2-1.6-2 1.6-2-1.6-2 1.6-2-1.6-2 1.6-2-1.6L1 19z"
        fill="#f2efe7"
      />
      <!-- Receipt print lines -->
      <rect x="4" y="5" width="10" height="1.6" rx="0.4" fill="#151515" />
      <rect x="4" y="8.4" width="7" height="1.6" rx="0.4" fill="#151515" />
      <rect x="4" y="11.8" width="9" height="1.6" rx="0.4" fill="#151515" />
    </g>
  </svg>`;

  // Raw receipt SVG without squircle (for logo.svg)
  const rawLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="220" viewBox="0 0 18 22">
    <path
      d="M1 1h16v18l-2-1.6-2 1.6-2-1.6-2 1.6-2-1.6-2 1.6-2-1.6L1 19z"
      fill="#f2efe7"
    />
    <rect x="4" y="5" width="10" height="1.6" rx="0.3" fill="#151515" />
    <rect x="4" y="8.4" width="7" height="1.6" rx="0.3" fill="#151515" />
    <rect x="4" y="11.8" width="9" height="1.6" rx="0.3" fill="#151515" />
  </svg>`;

  fs.writeFileSync(path.join(publicDir, "icon.svg"), iconSvg);
  fs.writeFileSync(path.join(publicDir, "logo.svg"), rawLogoSvg);

  // Generate PNG sizes
  const sizes = [16, 32, 48, 64, 128, 256];
  const pngBuffers: { buffer: Buffer; size: number }[] = [];
  for (const s of sizes) {
    const buf = await sharp(Buffer.from(iconSvg)).resize(s, s).png().toBuffer();
    pngBuffers.push({ size: s, buffer: buf });
  }

  // Generate ICO
  const icoBuffer = pngToIco(pngBuffers);
  fs.writeFileSync(path.join(publicDir, "favicon.ico"), icoBuffer);
  fs.writeFileSync(path.join(appDir, "favicon.ico"), icoBuffer);

  // Generate apple-icon.png (180x180) and icon.png (512x512)
  const appleBuf = await sharp(Buffer.from(iconSvg)).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, "apple-icon.png"), appleBuf);
  fs.writeFileSync(path.join(appDir, "apple-icon.png"), appleBuf);

  const icon512 = await sharp(Buffer.from(iconSvg)).resize(512, 512).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, "icon.png"), icon512);
  fs.writeFileSync(path.join(appDir, "icon.png"), icon512);

  const logoPng = await sharp(Buffer.from(iconSvg)).resize(512, 512).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, "logo.png"), logoPng);
}

if (process.argv[1]?.endsWith("generate-icons.ts") || process.argv[1]?.endsWith("generate-icons.js")) {
  generateIcons().then(() => console.log("Done generating icons"));
}
