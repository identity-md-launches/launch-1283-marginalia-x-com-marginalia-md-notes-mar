// Render the site's own typographic mark locally; no downloaded art or remote assets.
// Optional regeneration tool: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/share-card.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless:true});
try {
  const page = await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
  await page.setContent(`<!doctype html><html><head><style>
    *{box-sizing:border-box}body{margin:0;background:#f6f1e7;color:#1d1a16;font-family:Georgia,'DejaVu Serif',serif;padding:56px 70px}
    header{font-size:38px;border-bottom:1px solid #d9cfbd;padding-bottom:26px}b{color:#b9471f;font-size:48px;margin-right:14px;font-weight:400}
    h1{font-size:64px;font-weight:400;line-height:1.07;letter-spacing:-2px;margin:49px 0 22px}p{font-size:27px;line-height:1.5;margin:0;color:#5a5146}
    footer{border-top:1px solid #d9cfbd;margin-top:44px;padding-top:20px;font-size:21px;color:#5a5146}span{float:right;color:#b9471f}
  </style></head><body><header><b>☞</b>Marginalia</header><h1>Trade it. Say why.<br>The chain keeps the receipt.</h1><p>Nothing pays for being right.</p><footer>Swarm-built. New. It can break. <span>@marginalia_md</span></footer></body></html>`);
  const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/share-card.png');
  fs.mkdirSync(path.dirname(out),{recursive:true});
  await page.screenshot({path:out});
  console.log(out);
} finally { await browser.close(); }
