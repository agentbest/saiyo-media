/* 記事のアイキャッチ（1200×630 JPEG）を images/media/<slug>.jpg に書き出す。
 *
 *   node tools/eyecatch/render.js            … まだ画像が無い記事だけ作る
 *   node tools/eyecatch/render.js --force    … 全記事作り直す
 *   node tools/eyecatch/render.js <slug>...  … 指定した記事だけ作り直す
 *   node tools/eyecatch/render.js --og       … 一覧・トップ・タグ・LPのOGP画像（images/og/<name>.jpg）のうち無いものを作る
 *                                               （--og --force で全部。描く内容は build-media.js が書く og-specs.json）
 *
 * Chrome をヘッドレスで1つだけ立ち上げ、DevTools Protocol で template.html を順に撮る。
 * 依存パッケージなし（Node 22 以降の組み込み WebSocket を使う）。
 * 記事を足したら、これを流してから node build-media.js（画像があればビルドが記事・一覧・OGPに使う）。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(ROOT, 'media', '_articles');
const OUT = path.join(ROOT, 'images', 'media');
const TEMPLATE = 'file:///' + path.join(__dirname, 'template.html').replace(/\\/g, '/');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9333;
const PILLAR_NAME = { offerbox: 'OfferBox', wantedly: 'Wantedly', onecareer: 'ワンキャリア', hikaku: '媒体比較・選び方', knowhow: '採用ノウハウ', green: 'Green・IT中途採用', infra: 'Infra・長期インターン' };

function fm(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  const o = {};
  if (!m) return o;
  for (const ln of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_]+):\s*(.*)$/.exec(ln);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith('[')) v = v.replace(/^\[|\]$/g, '').split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
    else v = v.replace(/^"|"$/g, '');
    o[kv[1]] = v;
  }
  return o;
}

function data(a) {
  const pname = PILLAR_NAME[a.pillar] || '採用';
  const skip = new Set([pname, a.series, 'OfferBox', 'Wantedly', 'ワンキャリア'].filter(Boolean));
  const chips = (Array.isArray(a.tags) ? a.tags : []).filter(t => !skip.has(t) && t.length <= 10).slice(0, 3);
  return {
    pillar: a.pillar,
    pill: a.series ? `${pname} / ${a.series}` : pname,
    title: String(a.title || '').split('｜')[0],
    chips,
  };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const only = args.filter(x => !x.startsWith('--'));
  fs.mkdirSync(OUT, { recursive: true });
  let list;
  if (args.includes('--og')) {
    const OG = path.join(ROOT, 'images', 'og');
    fs.mkdirSync(OG, { recursive: true });
    const specs = JSON.parse(fs.readFileSync(path.join(__dirname, 'og-specs.json'), 'utf8'));
    list = specs.map(x => ({ key: x.name, out: path.join(OG, x.name + '.jpg'), data: { pillar: x.pillar, pill: x.pill, title: x.title, chips: x.chips || [] } }));
  } else {
    list = fs.readdirSync(SRC).filter(f => f.endsWith('.md')).map(f => {
      const a = fm(fs.readFileSync(path.join(SRC, f), 'utf8'));
      a.slug = a.slug || f.replace(/\.md$/, '');
      return { key: a.slug, out: path.join(OUT, a.slug + '.jpg'), data: data(a) };
    });
  }
  if (only.length) list = list.filter(a => only.includes(a.key));
  else if (!force) list = list.filter(a => !fs.existsSync(a.out));
  console.log(`作る画像: ${list.length}枚`);
  if (!list.length) return;

  const prof = path.join(require('os').tmpdir(), 'saiyo-eyecatch-chrome');
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${prof}`, '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
  let wsUrl;
  for (let i = 0; i < 50 && !wsUrl; i++) {
    await sleep(200);
    try { wsUrl = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(t => t.type === 'page').webSocketDebuggerUrl; } catch (e) {}
  }
  if (!wsUrl) { chrome.kill(); throw new Error('Chrome に接続できません'); }

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const wait = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); } };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const n = ++id; wait.set(n, m => m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result));
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });

  let done = 0;
  try {
    for (const a of list) {
      await send('Page.navigate', { url: TEMPLATE + '?' + encodeURIComponent(a.key) + '#' + encodeURIComponent(JSON.stringify(a.data)) });
      for (let i = 0; i < 100; i++) {
        const r = await send('Runtime.evaluate', { expression: 'document.title' });
        if (r.result.value === 'ready') break;
        await sleep(30);
      }
      const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 86, clip: { x: 0, y: 0, width: 1200, height: 630, scale: 1 } });
      fs.writeFileSync(a.out, Buffer.from(shot.data, 'base64'));
      if (++done % 100 === 0) console.log(`  ${done}/${list.length}`);
    }
  } finally {
    ws.close(); chrome.kill();
  }
  console.log(`${done}枚を書き出しました`);
}

main().catch(e => { console.error(e); process.exit(1); });
