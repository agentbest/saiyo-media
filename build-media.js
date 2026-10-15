/* saiyo-media.agent-best.net のオウンドメディアを作る。
 *
 *   node build-media.js            … media/_articles/*.md → media/ 以下のHTML
 *   node build-media.js --check    … 書かずに件数と問題だけ出す
 *
 * 記事の原稿（.md）は別リポジトリ saiyo-media-gen で書き、py publish.py がここへコピーする。
 * **media/ 以下の .html を手で編集しないこと。** 次のビルドで消える。
 *
 * ⚠ 外部の依存（npm パッケージ）は使わない。Node だけで動く。
 * ⚠ CSSは記事ページから外に出して media/assets/media.css にしてある（1,000ページに埋め込まないため）。
 *   見た目はコーポレート（www.agent-best.net/media/、agentbest-lp の src/pages/media/[slug].astro）の記事に揃えている。
 *   LP（index.html）のパープルは使わない（2026-10-15）。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const SRC = path.join(DIR, 'media', '_articles');
const OUT = path.join(DIR, 'media');
const SITE = 'https://saiyo-media.agent-best.net';
const PER_PAGE = 24;
const GA_ID = 'G-1XXMP8Y1B4';   /* 既存サイトと同じプロパティ。サイト別はホスト名で分ける */

/* 柱。記事の frontmatter の pillar と一致させる（saiyo-media-gen/check.py の PILLARS と同じ） */
const PILLARS = [
  { key: 'offerbox',  name: 'OfferBox',        lead: '新卒スカウト型のOfferBoxを、申し込んだあとにどう運用するか。ターゲット設計、オファー文面、承認後の面談まで。' },
  { key: 'wantedly',  name: 'Wantedly',        lead: '共感でつながるWantedlyの会社ページ・ストーリー・募集・スカウトの作り方と運用。新卒も中途も。' },
  { key: 'onecareer', name: 'ワンキャリア',     lead: 'クチコミと就活データを軸にしたワンキャリアの掲載・スカウト・イベントの使い方。' },
  { key: 'hikaku',    name: '媒体比較・選び方', lead: 'OfferBox・Wantedly・ワンキャリア、そして他媒体。規模・業界・職種・予算ごとに、どれを先に検討するか。' },
  { key: 'knowhow',   name: '採用ノウハウ',     lead: 'スカウト文面、母集団形成、内定辞退、採用KPI、新卒スケジュール。媒体をまたいで使える採用の実務。' },
];
const PILLAR = Object.fromEntries(PILLARS.map(p => [p.key, p]));

/* CTA。読者は採用企業だけ。窓口はLPの /#entry */
const CTA = { href: '/#entry', label: '媒体選びを相談する',
  lead: '求人媒体選びを、ひとつの窓口で',
  sub: 'エージェントベストは新卒・中途・インターンの求人媒体を扱う求人広告代理店です。媒体の比較からお申込み、運用まで伴走します。料金は各媒体の正規料金のままです。' };

/* 柱ごとのCTA。記事の読者はすでにその媒体を使っている（運用中）ことが多いので、
 * 「媒体選び」ではなく柱に合わせた相談内容と、当社が出せる具体的な支援を並べる。
 * ⚠ 媒体の料金・登録者数・最上級表現は書かない（2026-09-30の決めごと）。金額は当社の運用代行だけ。
 * ⚠ Wantedly の文脈で「人材」と書かない（PRガイドライン）。 */
const PILLAR_CTA = {
  offerbox: {
    lead: 'OfferBoxの運用、ひとりで抱えていませんか',
    points: ['検索条件・オファー文面・承認後の面談まで、いまの運用を一緒に点検します',
             '運用代行は入社承諾時のみ課金の完全成果報酬（20万円／1名）',
             'これから申し込む場合も、料金はOfferBoxの正規料金のままです'],
    label: 'OfferBoxの運用を相談する', short: 'OfferBoxの運用を無料で相談',
    media: 'OfferBox',
    placeholder: '例：28卒で5名採用予定。オファーの承認率が低いので、文面と検索条件を見直したい。' },
  wantedly: {
    lead: 'Wantedlyの発信とスカウト、止まっていませんか',
    points: ['会社ページ・ストーリー・募集・スカウトのどこで止まっているかを一緒に見ます',
             'スカウト文面の作成から送信・返信対応まで、代行もできます',
             'これから申し込む場合も、料金はWantedlyの正規料金のままです'],
    label: 'Wantedlyの運用を相談する', short: 'Wantedlyの運用を無料で相談',
    media: 'Wantedly',
    placeholder: '例：エンジニアの募集を出しているが応募が少ない。ストーリーとスカウトの回し方を相談したい。' },
  onecareer: {
    lead: 'ワンキャリアの掲載・スカウト・イベント、組み立てから相談できます',
    points: ['採用人数と時期から、掲載・スカウト・イベントの組み合わせを一緒に考えます',
             'ほかの新卒媒体と並べて、どこに予算を置くかを比較します',
             'これから申し込む場合も、料金は正規料金のままです'],
    label: 'ワンキャリアの使い方を相談する', short: 'ワンキャリアの使い方を無料で相談',
    media: 'ワンキャリア',
    placeholder: '例：28卒で10名採用予定。ワンキャリアの掲載とスカウトをどう組み合わせるか相談したい。' },
  hikaku: {
    lead: 'どの媒体にするか、決めきれない方へ',
    points: ['新卒・中途・インターンの取り扱い媒体を、貴社の採用計画に合わせて横並びで比較します',
             '媒体選定・お見積りは無料。申込前提でなくて構いません',
             '料金は各媒体の正規料金のまま。代理店を通しても上乗せはありません'],
    label: '媒体選びを相談する', short: '媒体選びを無料で相談',
    media: '未定・相談したい',
    placeholder: '例：28卒で営業職を5名、中途でエンジニアを2名採用予定。どの媒体を組み合わせるか相談したい。' },
  knowhow: {
    lead: '採用の進め方を、媒体選びから一緒に整理しませんか',
    points: ['採用人数・時期・体制から、どの媒体で何をするかを一緒に整理します',
             'スカウト代行・運用代行と組み合わせて、手が回らない部分を外に出せます',
             '料金は各媒体の正規料金のまま。ご相談・お見積りは無料です'],
    label: '採用の進め方を相談する', short: '採用の進め方を無料で相談',
    media: '未定・相談したい',
    placeholder: '例：人事が1人で新卒と中途を回している。どこを外に出すべきか相談したい。' },
};
const TRUST = ['相談無料', '営業のお電話はしません', '正規料金・上乗せなし', '厚生労働大臣許可 13-ユ-316964'];

/* LPのフォームへの導線。from は問い合わせの文面に付いて、どのページから来たかが分かる */
const entryHref = (from, media) =>
  `/?from=${encodeURIComponent(from)}${media ? '&media=' + encodeURIComponent(media) : ''}#entry`;

/* アイキャッチ（tools/eyecatch/render.js が images/media/<slug>.jpg に作る）。無い記事は画像なしで出す */
const IMG_DIR = path.join(DIR, 'images', 'media');
const imgOf = slug => fs.existsSync(path.join(IMG_DIR, slug + '.jpg')) ? `/images/media/${slug}.jpg` : '';

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const escAttr = esc;

/* ---------- frontmatter ---------- */
function parseFM(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  if (!m) return { fm: null, body: raw };
  const fm = {}; const lines = m[1].split(/\r?\n/);
  let key = null, list = null;
  const unq = v => {
    v = v.trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
    return v;
  };
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (!ln.trim()) continue;
    const item = /^\s+-\s*(.*)$/.exec(ln);
    if (item && list) {
      const kv = /^([A-Za-z_]+)\s*:\s*(.*)$/.exec(item[1]);
      if (kv) { const o = {}; o[kv[1]] = unq(kv[2]); list.push(o); }
      else list.push(unq(item[1]));
      continue;
    }
    const cont = /^\s{2,}([A-Za-z_]+)\s*:\s*(.*)$/.exec(ln);
    if (cont && list && list.length && typeof list[list.length - 1] === 'object') {
      list[list.length - 1][cont[1]] = unq(cont[2]); continue;
    }
    const kv = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(ln);
    if (!kv) continue;
    key = kv[1]; const val = kv[2].trim(); list = null;
    if (val === '') { fm[key] = []; list = fm[key]; continue; }
    if (val.startsWith('[')) {
      fm[key] = val.replace(/^\[|\]$/g, '').split(',').map(s => unq(s)).filter(Boolean);
      continue;
    }
    fm[key] = unq(val);
  }
  return { fm, body: m[2] };
}

/* ---------- markdown（使う記法だけ） ---------- */
function inline(s) {
  s = esc(s);
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) =>
    /^https?:\/\//.test(u) && !u.includes('agent-best.net')
      ? `<a href="${escAttr(u)}" target="_blank" rel="noopener">${t}</a>`
      : `<a href="${escAttr(u)}">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return s;
}
function mdToHtml(src) {
  const lines = String(src).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const heads = [];
  let i = 0;
  const isTableSep = s => /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(s) && s.includes('-');
  while (i < lines.length) {
    let ln = lines[i];
    if (!ln.trim()) { i++; continue; }
    if (/^\s*<(aside|div|figure|table|blockquote)\b/.test(ln)) {
      const buf = [];
      const tag = /^\s*<([a-z]+)/.exec(ln)[1];
      const close = new RegExp('</' + tag + '>');
      while (i < lines.length) { buf.push(lines[i]); if (close.test(lines[i])) { i++; break; } i++; }
      out.push(buf.join('\n')); continue;
    }
    let h = /^(#{2,4})\s+(.*)$/.exec(ln);
    if (h) {
      const lv = h[1].length, txt = h[2].trim();
      if (lv === 2) { const id = 'h' + (heads.length + 1); heads.push({ id, text: txt });
        out.push(`<h2 id="${id}">${inline(txt)}</h2>`); }
      else if (lv === 3 && /^エージェントベストの見解/.test(txt)) out.push(`<h3 class="insight">${inline(txt)}</h3>`);
      else out.push(`<h${lv}>${inline(txt)}</h${lv}>`);
      i++; continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(ln)) { out.push('<hr>'); i++; continue; }
    if (ln.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const head = cells(ln); i += 2;
      const body = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) { body.push(cells(lines[i])); i++; }
      out.push('<div class="tw"><table><thead><tr>'
        + head.map(c => `<th>${inline(c)}</th>`).join('')
        + '</tr></thead><tbody>'
        + body.map(r => '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('')
        + '</tbody></table></div>');
      continue;
    }
    if (/^\s*[-*]\s+/.test(ln)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*]\s+/, '')); i++; }
      out.push('<ul>' + items.map(x => `<li>${inline(x)}</li>`).join('') + '</ul>');
      continue;
    }
    if (/^\s*\d+\.\s+/.test(ln)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++; }
      out.push('<ol>' + items.map(x => `<li>${inline(x)}</li>`).join('') + '</ol>');
      continue;
    }
    if (/^\s*>\s?/.test(ln)) {
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      out.push('<blockquote>' + buf.map(x => `<p>${inline(x)}</p>`).join('') + '</blockquote>');
      continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim()
           && !/^(#{2,4})\s/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i])
           && !/^\s*\d+\.\s+/.test(lines[i]) && !/^\s*>/.test(lines[i])
           && !/^\s*</.test(lines[i]) && !(lines[i].includes('|') && isTableSep(lines[i + 1] || ''))) {
      buf.push(lines[i]); i++;
    }
    if (buf.length) out.push(`<p>${buf.map(inline).join('<br>')}</p>`);
  }
  return { html: out.join('\n'), heads };
}

/* ---------- ページの外枠 ---------- */
const BRAND = `<a class="brand" href="/" aria-label="株式会社エージェントベスト">
      <img class="brand-logo" src="/logo.png" alt="株式会社エージェントベスト" width="508" height="120">
      <span class="brand-sub">求人広告代理店</span>
    </a>`;

function head(o) {
  const canon = SITE + o.url;
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(o.title)}</title>
<meta name="description" content="${escAttr(o.desc)}">
<meta name="robots" content="index,follow">
<meta name="theme-color" content="#0B1A32">
<link rel="canonical" href="${escAttr(canon)}">
<meta property="og:type" content="${o.ogType || 'website'}">
<meta property="og:site_name" content="株式会社エージェントベスト">
<meta property="og:title" content="${escAttr(o.title)}">
<meta property="og:description" content="${escAttr(o.desc)}">
<meta property="og:url" content="${escAttr(canon)}">
<meta property="og:locale" content="ja_JP">
${o.image ? `<meta property="og:image" content="${escAttr(SITE + o.image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">` : '<meta name="twitter:card" content="summary">'}
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" href="/icon-192.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/media/assets/media.css">
${o.jsonld ? `<script type="application/ld+json">${JSON.stringify(o.jsonld)}</script>` : ''}
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>
  window.dataLayer=window.dataLayer||[];
  function gtag(){dataLayer.push(arguments)}
  gtag('js',new Date());
  gtag('config','${GA_ID}');
</script>
<script src="/media/assets/media.js" defer></script>
</head>
<body>
<header class="nav">
  <div class="wrap nav-in">
    ${BRAND}
    <nav class="nav-links">
      <a href="/media/">記事</a>
      <a href="/#media">取り扱い媒体</a>
      <a href="/#price">料金</a>
    </nav>
    <a class="btn btn-primary cta-mini" href="${escAttr(o.navCta || entryHref('media-nav'))}" data-cta="nav">無料相談</a>
  </div>
</header>`;
}

function foot() {
  return `<footer>
  <div class="wrap">
    <div class="foot-in">
      <div>
        <div class="foot-brand">株式会社エージェントベスト</div>
        <div style="margin-top:6px">求人広告代理店（新卒・中途・インターン）</div>
      </div>
      <div class="foot-links">
        <a href="/">求人広告代理店について</a>
        <a href="/media/">記事一覧</a>
        ${PILLARS.map(p => `<a href="/media/${p.key}/">${esc(p.name)}</a>`).join('\n        ')}
        <a href="${escAttr(entryHref('media-footer'))}" data-cta="footer">お問い合わせ</a>
        <a href="https://www.agent-best.net/" target="_blank" rel="noopener">運営会社</a>
      </div>
    </div>
    <div class="foot-copy">掲載の媒体名は各社の商標またはサービス名です。当社は求人広告代理店であり、各サービスの運営者ではありません。<br>運営：株式会社エージェントベスト（有料職業紹介事業 許可番号 13-ユ-316964）</div>
  </div>
</footer>
</body>
</html>`;
}

function crumbs(items) {
  return `<nav class="crumb" aria-label="パンくず"><div class="wrap">`
    + items.map(x => x.url ? `<a href="${escAttr(x.url)}">${esc(x.name)}</a>` : `<span>${esc(x.name)}</span>`).join('<i>›</i>')
    + `</div></nav>`;
}

/* 記事末の相談ブロック。LPへ飛ばさず、その場で送れる短いフォームにする（項目は3つ＋任意の相談内容）。
 * 送信先はLPと同じGoogleフォーム（media.js）。送信後はLPと同じくTimerexの日程予約を案内する。 */
function ctaBlock(a) {
  const c = PILLAR_CTA[a.pillar] || PILLAR_CTA.hikaku;
  return `<section class="consult" id="consult" aria-labelledby="consult-t">
  <div class="consult__head">
    <p class="consult__kick">相談無料 ／ 求人広告代理店エージェントベスト</p>
    <h2 class="consult__lead" id="consult-t">${esc(c.lead)}</h2>
    <ul class="consult__points">${c.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
  </div>
  <form class="consult__form" data-consult novalidate data-media="${escAttr(c.media)}" data-from="${escAttr(a.slug)}" data-title="${escAttr(a.title)}">
    <div class="cf-row">
      <label><span class="cf-l">会社名<span class="req">必須</span></span><input type="text" name="company" required autocomplete="organization"></label>
      <label><span class="cf-l">お名前<span class="req">必須</span></span><input type="text" name="name" required autocomplete="name"></label>
    </div>
    <label><span class="cf-l">メールアドレス<span class="req">必須</span></span><input type="email" name="email" required autocomplete="email"></label>
    <label><span class="cf-l">ご相談内容<span class="opt">任意</span></span><textarea name="message" rows="3" placeholder="${escAttr(c.placeholder)}"></textarea></label>
    <p class="cf-err" role="alert"></p>
    <button type="submit" class="btn btn-primary cf-submit">${esc(c.label)} →</button>
    <p class="cf-note">${TRUST.map(esc).join(' ／ ')}<br>送信いただいた情報は、お問い合わせ対応の目的にのみ利用いたします。</p>
  </form>
  <div class="consult__thanks" hidden>
    <p class="consult__lead">送信しました</p>
    <p>お問い合わせありがとうございます。内容を確認のうえ、担当者よりご連絡いたします。</p>
    <p>お急ぎの場合は、打ち合わせの日程を直接ご予約いただけます。<br><a href="https://timerex.net/s/r_matsuoka/6666f3b5/" target="_blank" rel="noopener" data-cta="timerex">日程を選んで予約する ↗</a></p>
  </div>
</section>`;
}

/* スクロール途中で出る下部バー。#consult が見えたら隠れる（media.js） */
function stickyCta(a) {
  const c = PILLAR_CTA[a.pillar] || PILLAR_CTA.hikaku;
  return `<div class="sticky-cta" hidden>
  <p>${esc(c.short)}<span>正規料金のまま・相談だけでもOK</span></p>
  <a href="#consult" data-cta="sticky">相談する</a>
  <button type="button" class="sticky-cta__x" aria-label="閉じる">×</button>
</div>`;
}

/* 一覧ページ用の相談バンド（LPのフォームへ） */
function ctaBand(key, from) {
  const c = PILLAR_CTA[key] || PILLAR_CTA.hikaku;
  return `<aside class="band">
  <div>
    <p class="band__lead">${esc(c.lead)}</p>
    <ul>${c.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
  </div>
  <a class="btn btn-primary" href="${escAttr(entryHref(from, c.media))}" data-cta="band">${esc(c.label)} →</a>
</aside>`;
}

/* 監修者ブロック。コーポレートの AuthorBlock.astro と同じ文面・同じリンク */
const SNS = [
  ['X（Twitter）', 'https://x.com/r_matsuoka0919', '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'],
  ['Facebook', 'https://www.facebook.com/ryouji.matsuoka919', '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>'],
  ['LinkedIn', 'https://www.linkedin.com/in/%E8%89%AF%E6%AC%A1-%E6%9D%BE%E5%B2%A1-87bb9851/', '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/></svg>'],
  ['note', 'https://note.com/ryouji_matsuoka', '<svg width="20" height="20" viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" rx="6" fill="currentColor"/><path d="M7.4 16.6V8.9h2.28v1.05c.5-.79 1.35-1.24 2.42-1.24 1.86 0 2.94 1.16 2.94 3.13v4.76h-2.35v-4.31c0-1.06-.5-1.63-1.42-1.63-.94 0-1.52.63-1.52 1.7v4.24z" fill="#f8fafb"/></svg>'],
];
const AUTHOR = `<aside class="author">
  <p class="author__t">監修</p>
  <p class="author__n"><a href="https://www.agent-best.net/profile/" target="_blank" rel="noopener">松岡 良次</a></p>
  <p class="author__b">株式会社エージェントベスト代表。大手人材会社およびスタートアップ人材企業にて、IT・スタートアップ・メガベンチャー企業の採用支援に従事。独立後はIT・スタートアップ・コンサル領域に特化し、20〜30代のキャリア支援を行う。（厚生労働大臣許可 13-ユ-316964）</p>
  <div class="author__sns">${SNS.map(([n, u, svg]) => `<a href="${u}" target="_blank" rel="noopener" aria-label="${n}">${svg}</a>`).join('')}</div>
</aside>`;

/* シェアボタン。コーポレートの ShareButtons.astro と同じ並び（外部SDKは読まない。コピーは media.js） */
function shareHtml(url, title, label) {
  const u = encodeURIComponent(url), t = encodeURIComponent(title);
  const btn = (key, name, href, icon) =>
    `<li><a class="share-btn share-btn--${key}" href="${escAttr(href)}" target="_blank" rel="noopener noreferrer" data-share="${key}" aria-label="${name}でシェア" title="${name}でシェア">${icon}</a></li>`;
  const ico = d => `<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
  const svgOf = n => SNS.find(s => s[0].startsWith(n))[2].match(/d="([^"]+)"/)[1];
  return `<aside class="share" aria-label="シェア">
  <span class="share-label">${esc(label || 'この記事をシェア')}</span>
  <ul class="share-list">
    ${btn('x', 'X', `https://x.com/intent/post?url=${u}&text=${t}`, ico(svgOf('X')))}
    ${btn('facebook', 'Facebook', `https://www.facebook.com/sharer/sharer.php?u=${u}`, ico(svgOf('Facebook')))}
    ${btn('linkedin', 'LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, ico(svgOf('LinkedIn')))}
    ${btn('hatena', 'はてなブックマーク', `https://b.hatena.ne.jp/entry/panel/?url=${u}&btitle=${t}`, '<span class="share-hb" aria-hidden="true">B!</span>')}
    <li><button type="button" class="share-btn share-btn--copy" data-share="copy" data-share-url="${escAttr(url)}" aria-label="リンクをコピー" title="リンクをコピー"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button></li>
  </ul>
  <span class="share-done" role="status" aria-live="polite"></span>
</aside>`;
}

/* 2026-09-12 → 2026/9/12（コーポレートの toLocaleDateString('ja-JP') と同じ見え方） */
const jpDate = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? `${m[1]}/${+m[2]}/${+m[3]}` : esc(s); };

/* ---------- 読み込み ---------- */
function load() {
  if (!fs.existsSync(SRC)) return [];
  return fs.readdirSync(SRC).filter(f => f.endsWith('.md')).map(f => {
    const raw = fs.readFileSync(path.join(SRC, f), 'utf8');
    const { fm, body } = parseFM(raw);
    if (!fm) { console.log(`⚠ frontmatter がありません: ${f}`); return null; }
    fm.slug = fm.slug || f.replace(/\.md$/, '');
    fm._body = body;
    return fm;
  }).filter(Boolean);
}

/* ---------- 記事ページ ---------- */
function articleHtml(a, all) {
  const p = PILLAR[a.pillar] || PILLARS[0];
  let { html, heads } = mdToHtml(a._body);
  // 本文中の相談リンク（cta-inline）はLPへ飛ばさず、記事末のフォームへ
  html = html.replace(/href="\/#entry"/g, 'href="#consult" data-cta="inline"');
  const url = `/media/${a.slug}/`;
  const img = imgOf(a.slug);
  const toc = heads.length >= 3
    ? `<nav class="toc" aria-label="目次"><p class="toc__t">目次</p><ol>`
      + heads.map(h => `<li><a href="#${h.id}">${esc(h.text)}</a></li>`).join('') + `</ol></nav>` : '';
  const rel = (a.related || []).map(s => all.find(x => x.slug === s)).filter(Boolean);
  const relHtml = rel.length
    ? `<section class="related"><h2 class="block-title">関連記事</h2><ul class="art-list">`
      + rel.map(r => `<li><a href="/media/${esc(r.slug)}/"><span class="art-title">${esc(r.title)}</span><span class="art-desc">${esc(r.description || '')}</span></a></li>`).join('')
      + `</ul></section>` : '';
  /* 同じ柱の他の記事。コーポレートと同じく「自分の次の6件」を巡回して取り、内部リンクを柱全体に散らす */
  const mates = pillarOrder(all, a.pillar);
  const me = Math.max(0, mates.findIndex(x => x.slug === a.slug));
  const skip = new Set([a.slug, ...rel.map(r => r.slug)]);
  const same = [];
  for (let i = 1; i < mates.length && same.length < 6; i++) {
    const m = mates[(me + i) % mates.length];
    if (!skip.has(m.slug)) same.push(m);
  }
  const sameHtml = same.length
    ? `<section class="same-hub"><h2 class="block-title">${esc(p.name)}の他の記事</h2><ul class="art-list compact">`
      + same.map(r => `<li><a href="/media/${esc(r.slug)}/"><span class="art-title">${esc(shortTitle(r.title))}</span>${r.series ? `<span class="art-theme">${esc(r.series)}</span>` : ''}</a></li>`).join('')
      + `</ul><p class="more"><a href="/media/${p.key}/">${esc(p.name)}の記事一覧を見る →</a></p></section>` : '';
  const src = (a.sources || []).filter(s => s && s.name);
  const srcHtml = src.length
    ? `<div class="sources"><strong>出典</strong><ul>`
      + src.map(s => s.url ? `<li><a href="${escAttr(s.url)}" target="_blank" rel="noopener nofollow">${esc(s.name)}</a></li>` : `<li>${esc(s.name)}</li>`).join('')
      + `</ul>${a.reviewedAt ? `<p class="reviewed">本記事は ${jpDate(a.reviewedAt)} 時点の公開情報にもとづいて作成しています。</p>` : ''}</div>` : '';
  const jsonld = [{
    '@context': 'https://schema.org', '@type': 'Article',
    mainEntityOfPage: { '@type': 'WebPage', '@id': SITE + url }, url: SITE + url,
    headline: a.title, description: a.description,
    datePublished: a.pubDate, dateModified: a.reviewedAt || a.pubDate, inLanguage: 'ja',
    ...(img ? { image: SITE + img } : {}),
    author: { '@type': 'Person', name: '松岡 良次', url: 'https://www.agent-best.net/profile/',
      jobTitle: '代表取締役', worksFor: { '@id': 'https://www.agent-best.net/#organization' },
      sameAs: SNS.map(s => s[1]) },
    publisher: { '@type': 'Organization', '@id': 'https://www.agent-best.net/#organization',
      name: '株式会社エージェントベスト', url: 'https://www.agent-best.net/',
      logo: { '@type': 'ImageObject', url: SITE + '/logo.png' } },
  }, {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: '記事', item: SITE + '/media/' },
      { '@type': 'ListItem', position: 3, name: p.name, item: `${SITE}/media/${p.key}/` },
      { '@type': 'ListItem', position: 4, name: a.title, item: SITE + url },
    ],
  }];
  return head({ title: `${a.title}｜求人広告代理店エージェントベスト`, desc: a.description, url, ogType: 'article', jsonld, navCta: '#consult', image: img })
    + `<main class="wrap article">
  <nav class="breadcrumb" aria-label="パンくず"><a href="/">ホーム</a><span aria-hidden="true">/</span><a href="/media/">記事</a><span aria-hidden="true">/</span><a href="/media/${p.key}/">${esc(p.name)}</a></nav>
  ${img ? `<img class="eyecatch" src="${img}" alt="" width="1200" height="630">` : ''}
  <h1>${esc(a.title)}</h1>
  <p class="meta">
    <a class="meta-hub" href="/media/${p.key}/">${esc(p.name)}</a>${a.series ? `<span class="meta-theme">${esc(a.series)}</span>` : ''}
    <span class="meta-date">更新日 ${jpDate(a.reviewedAt || a.pubDate)}</span>
  </p>
  ${toc}
  <div class="body">
${html}
  </div>
  ${srcHtml}
  ${ctaBlock(a)}
  ${shareHtml(SITE + url, a.title)}
  ${(() => { const tg = (Array.isArray(a.tags) ? a.tags : []).filter(t => LIVE_TAGS.has(t)); return tg.length ? `<section class="tags"><h2 class="block-title">この記事のタグ</h2>${tagCloud(tg)}</section>` : ''; })()}
  ${relHtml}
  ${sameHtml}
  ${AUTHOR}
</main>
${stickyCta(a)}` + foot();
}
const _order = {};
function pillarOrder(all, key) {
  return _order[key] || (_order[key] = all.filter(x => x.pillar === key)
    .sort((x, y) => String(x.series || '').localeCompare(String(y.series || ''), 'ja') || x.title.localeCompare(y.title, 'ja')));
}

/* ---------- 一覧 ---------- */
function card(a) {
  const p = PILLAR[a.pillar] || PILLARS[0];
  const img = imgOf(a.slug);
  return `<li><a href="/media/${esc(a.slug)}/"${img ? ' class="has-img"' : ''}>
      ${img ? `<img class="art-image" src="${img}" alt="" loading="lazy" decoding="async" width="1200" height="630">` : ''}
      <span class="art-body">
        <span class="art-title">${esc(a.title)}</span>
        <span class="art-desc">${esc(a.description || '')}</span>
        <span class="art-meta"><span class="tag">${esc(p.name)}</span>${a.series ? `<span class="theme">${esc(a.series)}</span>` : ''}</span>
      </span>
    </a></li>`;
}
/* ページ送り。42ページぶんの数字を全部並べず、先頭・前後2・末尾と「前へ／次へ」だけ出す */
function pagerHtml(page, pages, base) {
  if (pages <= 1) return '';
  const href = n => `${base}${n === 1 ? '' : 'page-' + n + '.html'}`;
  const show = new Set([1, pages, page - 2, page - 1, page, page + 1, page + 2].filter(n => n >= 1 && n <= pages));
  const nums = [...show].sort((x, y) => x - y);
  const out = [];
  if (page > 1) out.push(`<a href="${href(page - 1)}" rel="prev">← 前へ</a>`);
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) out.push('<span class="gap">…</span>');
    out.push(n === page ? `<span class="on">${n}</span>` : `<a href="${href(n)}">${n}</a>`);
  });
  if (page < pages) out.push(`<a href="${href(page + 1)}" rel="next">次へ →</a>`);
  return `<nav class="pager" aria-label="ページ送り">${out.join('')}</nav>`;
}
/* ---------- タグ ----------
 * コーポレートの /media/tag/ と同じく、柱をまたいでテーマで探す導線。
 * 5本以上の記事に付いているタグだけページを作る（それ未満は薄いページになるので出さない）。
 * 柱名・シリーズ名と同じタグは、柱の一覧・シリーズ表示と重なるので作らない。 */
const TAG_MIN = 5;
let LIVE_TAGS = new Map();   /* タグ → 記事の配列。main() で作る */
const tagUrl = t => `/media/tag/${encodeURIComponent(t)}/`;
function collectTags(all) {
  const skip = new Set([...PILLARS.map(p => p.name), 'OfferBox', 'Wantedly', 'ワンキャリア', '媒体比較', ...all.map(a => a.series).filter(Boolean)]);
  const m = new Map();
  all.forEach(a => (Array.isArray(a.tags) ? a.tags : []).forEach(t => {
    if (skip.has(t)) return;
    if (!m.has(t)) m.set(t, []);
    m.get(t).push(a);
  }));
  return new Map([...m].filter(([, v]) => v.length >= TAG_MIN).sort((x, y) => y[1].length - x[1].length || x[0].localeCompare(y[0], 'ja')));
}
function tagCloud(tags, withCount) {
  return `<ul class="tag-cloud">${tags.map(t => `<li><a href="${escAttr(tagUrl(t))}">${esc(t)}${withCount ? `<span class="count">${LIVE_TAGS.get(t).length}</span>` : ''}</a></li>`).join('')}</ul>`;
}
function tagIndexHtml() {
  const tags = [...LIVE_TAGS.keys()];
  return head({ title: 'タグ一覧｜求人広告代理店エージェントベスト', desc: `採用媒体の記事を、スカウト文面・内定辞退・採用KPIなどのテーマから探せます（${tags.length}タグ）。`, url: '/media/tag/', navCta: entryHref('media-tags') })
    + crumbs([{ name: 'ホーム', url: '/' }, { name: '記事', url: '/media/' }, { name: 'タグ' }])
    + `<main class="wrap listing">
  <h1>タグから探す</h1>
  <p class="lead">媒体をまたいで、テーマから記事を探せます。「スカウト文面」「内定辞退」「採用KPI」のように、知りたいことがはっきりしている場合はこちらが早いです（${tags.length}タグ）。</p>
  ${tagCloud(tags, true)}
  ${ctaBand('knowhow', 'media-tags')}
</main>` + foot();
}

function listPage(o) {
  return head({ title: o.title, desc: o.desc, url: o.url, navCta: entryHref(o.from) })
    + crumbs(o.crumbs)
    + `<main class="wrap listing">
  <h1>${esc(o.h1)}</h1>
  <p class="lead">${esc(o.lead)}</p>
  ${o.nav || ''}
  <p class="count">${o.total}件${o.pages > 1 ? `（${o.page}／${o.pages}ページ）` : ''}</p>
  ${o.items.length ? `<ul class="art-list">${o.items.map(card).join('')}</ul>` : `<p class="empty">記事を準備しています。</p>`}
  ${pagerHtml(o.page, o.pages, o.base)}
  ${ctaBand(o.ctaKey, o.from)}
</main>` + foot();
}

/* ---------- メディアトップ ----------
 * 記事を日付順に並べるだけだと、1,000本のどこから読めばいいか分からない。
 * 読者（採用担当者）の入口は「悩み」「業界」「職種」「規模」なので、その順に入口を並べ、新着は最後に置く。
 * 業界・職種・規模の入口は、媒体比較（hikaku）の series と target から組む（記事を足せば自動で増える）。 */
/* 悩みの入口。slug が無くなったら黙って落とす */
const WORRIES = [
  'ob-shounin-hikui', 'ob-mendan-tsunagaranai', 'ob-naitei-jitai', 'ob-kousuu-tarinai',
  'wt-oubo-nai', 'wt-scout-henshin-nai', 'wt-kakenai', 'oc-entry-nai',
  'oc-scout-judaku-hikui', 'ob-yosan-sukunai', 'ob-hajimete', 'ob-daikou-fuman',
];
const shortTitle = t => String(t).split('｜')[0];

function topHtml(all, byPillar, page1, pages) {
  const bySlug = Object.fromEntries(all.map(a => [a.slug, a]));
  const worries = WORRIES.map(s => bySlug[s]).filter(Boolean);
  const chips = series => all
    .filter(a => a.pillar === 'hikaku' && a.series === series && a.target)
    .sort((x, y) => String(x.target).localeCompare(String(y.target), 'ja'))
    .map(a => `<li><a href="/media/${esc(a.slug)}/">${esc(a.target)}</a></li>`).join('');
  const entries = [
    { id: 'industry', h: '業界から探す', note: '業界ごとに、新卒・中途で先に検討する媒体と、その業界で起きやすいつまずきを整理しています。', s: '業界別' },
    { id: 'job', h: '職種から探す', note: '採りたい職種から、どの媒体のどの機能を使うかを逆算しています。', s: '職種別' },
    { id: 'size', h: '会社の規模・フェーズから探す', note: '採用人数、人事の体制、資金調達の段階で、合う媒体の組み合わせは変わります。', s: '規模・フェーズ別' },
  ];
  const pillarRows = PILLARS.map(p => {
    const list = byPillar[p.key];
    return `<section class="prow">
    <div class="prow__h"><h3>${esc(p.name)}</h3><a href="/media/${p.key}/">すべて見る（${list.length}件）→</a></div>
    <p class="prow__lead">${esc(p.lead)}</p>
    <ul class="art-list">${list.slice(0, 3).map(card).join('')}</ul>
  </section>`;
  }).join('\n');

  return head({
    title: '求人媒体の使いこなしと選び方の記事｜求人広告代理店エージェントベスト',
    desc: 'OfferBox・Wantedly・ワンキャリアの運用ノウハウと、業界・職種・規模ごとの求人媒体の選び方。求人広告代理店が、採用担当者の実務の判断に使える形で1,000本の記事にまとめています。',
    url: '/media/', navCta: entryHref('media-top'),
  })
    + crumbs([{ name: 'ホーム', url: '/' }, { name: '記事' }])
    + `<main class="mtop">
  <div class="wrap">
    <section class="mhero">
      <h1>採用メディア</h1>
      <p class="mhero__lead">求人媒体の選び方と、申し込んだあとの運用を<strong>${all.length.toLocaleString()}本</strong>の記事で解説しています。OfferBox・Wantedly・ワンキャリアの使いこなしから、業界・職種・規模ごとの媒体の選び方（媒体比較${byPillar.hikaku.length}本）まで。新卒・中途・インターンの求人媒体を扱う求人広告代理店の立場で、採用担当者が実務で判断に使える形にまとめています。</p>
      <nav class="jump" aria-label="記事の探し方">
        <a href="#worry">悩みから探す</a><a href="#industry">業界から探す</a><a href="#job">職種から探す</a><a href="#size">規模から探す</a><a href="#pillar">媒体から探す</a><a href="#tag">タグから探す</a><a href="#latest">新着記事</a>
      </nav>
      <aside class="cta-inline">
        <p>読んでも決めきれないときは、採りたい職種・人数・時期から取り扱い媒体を横並びで比較します（${TRUST.slice(0, 3).map(esc).join('・')}）。</p>
        <a href="${escAttr(entryHref('media-top-hero'))}" data-cta="hero">無料で相談する</a>
      </aside>
    </section>

    <section class="msec" id="worry">
      <h2>よくある悩みから探す</h2>
      <p class="msec__note">運用中にいちばん相談の多いつまずきです。原因の切り分け方から書いています。</p>
      <ul class="worries">${worries.map(a => {
        const p = PILLAR[a.pillar];
        return `<li><a href="/media/${esc(a.slug)}/"><span class="w-tag">${esc(p.name)}</span><span>${esc(shortTitle(a.title))}</span></a></li>`;
      }).join('')}</ul>
    </section>

    ${entries.map(e => `<section class="msec" id="${e.id}">
      <h2>${e.h}</h2>
      <p class="msec__note">${e.note}</p>
      <ul class="chips">${chips(e.s)}</ul>
    </section>`).join('\n    ')}

    <section class="msec" id="tag">
      <h2>タグから探す</h2>
      <p class="msec__note">媒体をまたいで、テーマから探せます。</p>
      ${tagCloud([...LIVE_TAGS.keys()].slice(0, 40), true)}
      <p class="more"><a href="/media/tag/">すべてのタグを見る（${LIVE_TAGS.size}タグ）→</a></p>
    </section>

    ${ctaBand('hikaku', 'media-top-mid')}

    <section class="msec" id="pillar">
      <h2>媒体から探す</h2>
      ${pillarNav('')}
      ${pillarRows}
    </section>

    <section class="msec" id="latest">
      <h2>新着記事</h2>
      <ul class="art-list">${page1.map(card).join('')}</ul>
      ${pagerHtml(1, pages, '/media/')}
    </section>

    ${ctaBand('knowhow', 'media-top-end')}
  </div>
</main>` + foot();
}
function pillarNav(active) {
  return `<nav class="pnav"><a href="/media/"${active === '' ? ' class="on"' : ''}>すべて</a>`
    + PILLARS.map(p => `<a href="/media/${p.key}/"${p.key === active ? ' class="on"' : ''}>${esc(p.name)}</a>`).join('') + `</nav>`;
}

/* ---------- CSS（コーポレート www.agent-best.net/media/ の記事と同じ見た目。白地×#1C1C2E） ---------- */
const CSS = `:root{
  --paper:#FFFFFF;--surface:#FFFFFF;--surface-2:#F6F8FA;--surface-3:#F0F2F5;
  --ink:#24292F;--head:#1C1C2E;--ink-soft:#57606A;--ink-faint:#6B7684;
  --line:#E2E6EA;--line-soft:#ECEFF2;--line-strong:#D8DDE3;
  --accent:#1C1C2E;--accent-strong:#33334D;
  --navy:#1C1C2E;--on-navy:#D5D9E0;--on-navy-soft:#A9B1BD;--on-navy-line:rgba(255,255,255,.14);
  --sans:"Noto Sans JP","Hiragino Kaku Gothic ProN","Hiragino Sans","Yu Gothic",YuGothic,"Segoe UI",sans-serif;
  --maxw:1080px;--readw:760px;--hubw:900px;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);line-height:1.9;-webkit-font-smoothing:antialiased;overflow-x:hidden}
h1,h2,h3,h4,p,ul,ol{margin:0}
a{color:inherit;text-decoration:none}
.wrap{max-width:var(--maxw);margin:0 auto;padding:0 20px}
.btn{display:inline-flex;align-items:center;gap:9px;font-weight:700;font-size:.95rem;padding:13px 26px;border-radius:8px;cursor:pointer;border:1px solid transparent;transition:background .15s;white-space:nowrap}
.btn-primary{background:var(--accent);color:#fff}
.btn-primary:hover{background:var(--accent-strong)}
/* ヘッダー */
header.nav{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.94);backdrop-filter:saturate(180%) blur(10px);border-bottom:1px solid var(--line)}
.nav-in{display:flex;align-items:center;justify-content:space-between;height:64px;gap:16px}
.brand{display:flex;align-items:center;gap:11px;font-weight:700}
.brand-logo{display:block;height:34px;width:auto;flex:none}
.brand-sub{display:block;padding-left:11px;border-left:1px solid var(--line);font-size:.62rem;letter-spacing:.1em;color:var(--ink-faint);font-weight:600}
.nav-links{display:flex;gap:20px;font-size:.9rem;font-weight:600;color:var(--ink-soft);margin-left:auto;margin-right:6px}
.nav-links a:hover{color:var(--head)}
.cta-mini{padding:9px 18px;font-size:.86rem}
@media (max-width:720px){.nav-links{display:none}}
@media (max-width:560px){.brand-sub{display:none}}
/* パンくず（一覧・トップ） */
.crumb .wrap{max-width:var(--hubw);display:flex;flex-wrap:wrap;align-items:baseline;gap:.4em;padding-top:20px;font-size:.85rem;color:var(--ink-faint)}
.crumb a:hover{color:var(--head)}
.crumb i{font-style:normal}
/* ===== 記事 ===== */
.article{max-width:var(--readw);padding-top:32px;padding-bottom:64px;font-size:16px}
.article .breadcrumb{font-size:.85rem;color:var(--ink-faint);margin-bottom:12px;display:flex;flex-wrap:wrap;gap:.4em;align-items:baseline}
.article .breadcrumb a:hover{color:var(--head)}
.article .eyecatch{display:block;width:100%;height:auto;border-radius:12px;margin-bottom:24px}
.article h1{font-size:1.65rem;line-height:1.5;margin:8px 0;color:var(--ink)}
.article .meta{font-size:.85rem;color:var(--ink-faint);margin-bottom:28px;display:flex;flex-wrap:wrap;align-items:center;gap:.5em}
.article .meta-hub{font-weight:700;color:var(--head);background:var(--surface-3);border-radius:4px;padding:2px 9px}
.article .meta-hub:hover{background:#e4e8ed}
.article .meta-theme{background:var(--surface-2);border-radius:4px;padding:2px 9px}
.toc{margin:0 0 2.4em;padding:1.1rem 1.4rem 1.2rem;border:1px solid #e3e7eb;border-radius:10px;background:#fbfcfd}
.toc__t{margin:0 0 .5em;font-size:.82rem;font-weight:700;letter-spacing:.08em;color:var(--head)}
.toc ol{margin:0;padding-left:1.4em}
.toc li{margin:.3em 0;font-size:.92rem}
.toc a{color:#384049}
.toc a:hover{color:var(--head);text-decoration:underline}
.body h2{font-size:1.3rem;line-height:1.55;margin:2.5em 0 1em;padding:.4em .8em;border-left:5px solid var(--head);background:var(--surface-2);border-radius:4px;scroll-margin-top:88px;color:var(--ink)}
.body h3{font-size:1.1rem;margin:2em 0 .8em;color:var(--head);scroll-margin-top:88px}
.body h4{font-size:1rem;margin:1.6em 0 .6em;color:var(--head)}
.body p{margin:1.1em 0}
.body ul,.body ol{margin:1.1em 0;padding-left:1.5em}
.body li{margin:.4em 0}
.body strong{color:var(--head)}
.body code{font-size:.88em;background:var(--surface-3);padding:2px 6px;border-radius:4px}
.body a{color:#0b4f8a;text-decoration:underline;text-underline-offset:3px}
.body hr{border:none;border-top:1px solid #e6e9ec;margin:2.5em 0}
.body blockquote{margin:1.4em 0;padding:.9em 1.2em;border-left:4px solid var(--line-strong);background:var(--surface-2);color:#454e59;border-radius:0 6px 6px 0}
.body blockquote p{margin:.4em 0}
/* エージェントベストの見解（コーポレートの .ab-insight と同じ見え方） */
.body h3.insight{margin:2.4em 0 0;padding:1.2rem 1.5rem .2rem;border:1px solid #cdd6dd;border-bottom:0;border-radius:10px 10px 0 0;background:#f4f8fa;font-size:.78rem;font-weight:700;letter-spacing:.06em;color:#1e5f56}
.body h3.insight::before{content:'';display:inline-block;width:14px;height:2px;background:#1e5f56;vertical-align:middle;margin-right:.5em}
.body h3.insight + p{margin:0 0 2.4em;padding:.4rem 1.5rem 1.3rem;border:1px solid #cdd6dd;border-top:0;border-radius:0 0 10px 10px;background:#f4f8fa;font-size:.95rem}
/* 表 */
.tw{overflow-x:auto;margin:1.5em 0}
.body table{border-collapse:collapse;width:100%;font-size:.92rem}
.body th,.body td{border:1px solid #d8dee4;padding:9px 13px;text-align:left;vertical-align:top}
.body th{background:var(--surface-2);white-space:nowrap}
/* 本文中の中間CTA（コーポレートの .cta-inline と同じ） */
.cta-inline{margin:2.4em 0;padding:1.1rem 1.3rem;border:1px solid #d8dee4;border-left:4px solid var(--head);border-radius:8px;background:#f8fafb;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
.cta-inline p{margin:0;font-size:.93rem;font-weight:700;color:var(--head);flex:1 1 320px}
.cta-inline a{flex-shrink:0;display:inline-block;padding:.6rem 1.5rem;background:var(--head);color:#fff !important;border-radius:6px;text-decoration:none !important;font-size:.88rem;font-weight:700;white-space:nowrap}
.cta-inline a:hover{background:var(--accent-strong)}
@media (max-width:600px){.cta-inline{flex-direction:column;align-items:stretch}.cta-inline a{text-align:center}}
/* 出典 */
.sources{margin-top:2.6rem;padding:1.1rem 1.4rem;border:1px solid #e3e7eb;border-radius:10px;font-size:.88rem;color:#454e59}
.sources ul{margin:.6em 0 0;padding-left:1.4em}
.sources li{margin-bottom:.3em}
.sources a{color:#0b4f8a;text-decoration:underline;text-underline-offset:3px}
.sources .reviewed{margin:.9em 0 0;color:#6b7480;font-size:.84rem}
/* シェア */
.share{display:flex;align-items:center;flex-wrap:wrap;gap:10px 14px;margin:2.6rem 0 0;padding:16px 0 0;border-top:1px solid #e6e9ec}
.share-label{font-size:.84rem;font-weight:700;color:var(--ink-faint);letter-spacing:.04em}
.share-list{list-style:none;display:flex;flex-wrap:wrap;gap:8px;padding:0;margin:0}
.share-btn{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;padding:0;border:1px solid var(--line-strong);border-radius:999px;background:#fff;color:#384049;cursor:pointer;transition:background-color .15s,border-color .15s,color .15s}
.share-btn:hover{color:#fff}
.share-btn--x:hover{background:#000;border-color:#000}
.share-btn--facebook:hover{background:#1877F2;border-color:#1877F2}
.share-btn--linkedin:hover{background:#0A66C2;border-color:#0A66C2}
.share-btn--hatena:hover{background:#00A4DE;border-color:#00A4DE}
.share-btn--copy:hover{background:var(--head);border-color:var(--head)}
.share-hb{font-weight:800;font-size:.95rem;line-height:1;letter-spacing:-.02em}
.share-done{font-size:.8rem;color:#1a7f5a;font-weight:700}
/* 関連記事・同じ柱の記事・一覧（タイトル＋説明文の行） */
.related,.same-hub{margin-top:2.8rem}
.block-title{font-size:1.05rem;margin:0 0 .2em;padding:.35em .8em;border-left:5px solid var(--head);background:var(--surface-2);border-radius:4px}
.art-list{list-style:none;padding:0;margin:0}
.art-list li{margin:0;border-bottom:1px solid var(--line-soft)}
.art-list a{display:block;padding:.9em .2em;color:inherit}
.art-list a:hover{background:#fafbfc}
.art-title{display:block;font-weight:700;color:var(--head);line-height:1.6;font-size:.97rem}
.art-list a:hover .art-title{text-decoration:underline}
.art-desc{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-top:.2em;font-size:.86rem;color:var(--ink-soft);line-height:1.75}
.art-meta{display:flex;flex-wrap:wrap;gap:.5em;margin-top:.45em}
.art-meta .tag,.art-meta .theme{font-size:.74rem;border-radius:4px;padding:2px 8px;line-height:1.6}
.art-meta .tag{background:var(--head);color:#fff}
.art-meta .theme{background:var(--surface-3);color:var(--ink-faint)}
.art-list a.has-img{display:grid;grid-template-columns:180px minmax(0,1fr);gap:1em;align-items:center}
.art-image{display:block;width:100%;height:auto;aspect-ratio:1200/630;object-fit:cover;border-radius:9px;background:var(--surface-3)}
.art-body{display:block;min-width:0}
.art-list.compact a{display:flex;justify-content:space-between;align-items:baseline;gap:.8em}
.art-theme{flex-shrink:0;font-size:.74rem;color:var(--ink-faint);background:var(--surface-3);border-radius:4px;padding:2px 8px}
.more{margin:1em 0 0;font-size:.9rem}
/* タグ（コーポレートと同じ丸いチップ） */
.tags{margin-top:2.8rem}
.tags .block-title{margin-bottom:.9em}
.tag-cloud{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:7px}
.tag-cloud li{margin:0}
.tag-cloud a{display:inline-flex;align-items:baseline;gap:.45em;padding:.34em .95em;border:1px solid var(--line-strong);border-radius:999px;background:#fff;color:var(--ink);font-size:.85rem;font-weight:600}
.tag-cloud a:hover{border-color:var(--head);background:var(--head);color:#fff}
.tag-cloud .count{font-size:.76rem;color:var(--ink-faint);font-weight:400}
.tag-cloud a:hover .count{color:#b9bfc9}
.more a{font-weight:700;color:var(--head)}
.more a:hover{text-decoration:underline}
/* 監修者 */
.author{margin-top:3rem;padding:1.25rem 1.5rem;border:1px solid var(--line);border-radius:10px;background:#f8fafb}
.author__t{font-size:.75rem;letter-spacing:.1em;color:var(--ink-faint);margin:0 0 .25rem}
.author__n{font-size:1.05rem;font-weight:700;margin:0 0 .5rem}
.author__n a{color:#122a44}
.author__n a:hover{text-decoration:underline}
.author__b{font-size:.88rem;line-height:1.8;color:#3b4450;margin:0 0 .75rem}
.author__sns{display:flex;gap:.9rem}
.author__sns a{color:var(--ink-faint);transition:color .15s}
.author__sns a:hover{color:#122a44}
/* ===== 一覧 ===== */
.listing{max-width:var(--hubw);padding-top:24px;padding-bottom:64px}
.listing h1{font-size:1.7rem;line-height:1.45;margin:.4em 0}
.listing .lead{color:#454e59;margin-bottom:1.4em}
.pnav{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 1.4em}
.pnav a{font-size:.85rem;padding:.35em 1em;border:1px solid var(--line-strong);border-radius:999px;color:#384049;background:#fff}
.pnav a:hover{border-color:var(--head)}
.pnav a.on{background:var(--head);border-color:var(--head);color:#fff}
.count{font-size:.8rem;color:var(--ink-faint);margin-bottom:.4em}
.pager{display:flex;flex-wrap:wrap;gap:7px;margin-top:30px;font-size:.85rem}
.pager a,.pager span{padding:6px 12px;border-radius:6px;border:1px solid var(--line-strong);background:#fff}
.pager span.on{background:var(--head);border-color:var(--head);color:#fff}
.pager a:hover{border-color:var(--head)}
.pager .gap{border:0;background:none;padding:6px 2px;color:var(--ink-faint)}
.empty{border:1px dashed var(--line-strong);border-radius:10px;padding:40px 24px;text-align:center;color:var(--ink-soft)}
/* フッター */
footer{background:var(--navy);color:var(--on-navy-soft);padding:46px 0 40px;font-size:.88rem}
.foot-in{display:flex;flex-wrap:wrap;justify-content:space-between;gap:26px}
.foot-brand{color:#fff;font-weight:700;font-size:1.05rem}
.foot-links{display:flex;flex-wrap:wrap;gap:8px 22px}
.foot-links a:hover{color:#fff}
.foot-copy{margin-top:26px;padding-top:18px;border-top:1px solid var(--on-navy-line);font-size:.78rem;color:#8a93a0;line-height:1.8}
/* 記事末の相談フォーム（コーポレートの記事末CTAと同じ濃紺の帯＋白いフォーム） */
.consult{margin:36px 0 0;border-radius:12px;overflow:hidden;background:#fff;border:1px solid #d8dee6;scroll-margin-top:84px}
.consult__head{background:var(--navy);color:#fff;padding:2rem 1.5rem 1.4rem;text-align:center}
.consult__kick{font-size:.78rem;font-weight:700;letter-spacing:.08em;color:var(--on-navy-soft);margin-bottom:6px}
.consult__lead{font-size:1.25rem;font-weight:700;line-height:1.55;margin-bottom:12px}
.consult__head .consult__lead{color:#fff}
.consult__points{list-style:none;padding:0;margin:0 auto;font-size:.92rem;color:var(--on-navy);display:inline-block;text-align:left}
.consult__points li{position:relative;padding-left:1.5em;margin:4px 0;line-height:1.7}
.consult__points li::before{content:"✓";position:absolute;left:0;color:#fff;font-weight:700}
.consult__form{padding:22px 24px 24px;display:grid;gap:12px;background:#f7f9fb}
.consult__form label{display:grid;gap:5px;font-size:.84rem;font-weight:700;color:var(--head)}
.consult__form .req,.consult__form .opt{margin-left:8px;font-size:.66rem;font-weight:700;padding:1px 7px;border-radius:4px;vertical-align:1px}
.consult__form .req{background:var(--head);color:#fff}
.consult__form .opt{background:var(--surface-3);color:var(--ink-faint)}
.consult__form input,.consult__form textarea{font:inherit;font-weight:400;font-size:.95rem;padding:10px 12px;border:1px solid var(--line-strong);border-radius:6px;background:#fff;color:var(--ink);width:100%}
.consult__form input:focus,.consult__form textarea:focus{outline:2px solid var(--head);outline-offset:1px;border-color:var(--head)}
.cf-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media (max-width:560px){.cf-row{grid-template-columns:1fr}.consult__form{padding-left:16px;padding-right:16px}}
.cf-err{color:#B23B3B;font-size:.84rem;min-height:1.1em}
.cf-submit{justify-content:center;width:100%;font-size:1rem;padding:14px 20px;white-space:normal}
.cf-submit:disabled{opacity:.6;cursor:default}
.cf-note{font-size:.74rem;color:var(--ink-faint);text-align:center;line-height:1.7}
.consult__thanks{padding:26px;text-align:center;font-size:.92rem;color:var(--ink-soft)}
.consult__thanks p{margin-bottom:10px}
.consult__thanks a{color:var(--head);font-weight:700;text-decoration:underline;text-underline-offset:3px}
/* 下部バー */
.sticky-cta{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:60;width:min(680px,calc(100% - 24px));display:flex;align-items:center;gap:12px;background:var(--navy);color:#fff;border-radius:12px;padding:10px 10px 10px 18px;box-shadow:0 14px 34px -12px rgba(28,28,46,.55)}
.sticky-cta[hidden]{display:none}
.sticky-cta p{flex:1;margin:0;font-weight:700;font-size:.92rem;line-height:1.4}
.sticky-cta p span{display:block;font-weight:500;font-size:.72rem;color:var(--on-navy-soft)}
.sticky-cta a{background:#fff;color:var(--head);font-weight:700;font-size:.9rem;padding:10px 20px;border-radius:8px;white-space:nowrap}
.sticky-cta a:hover{background:#e9ecf0}
.sticky-cta__x{background:none;border:0;color:var(--on-navy-soft);font-size:1.2rem;cursor:pointer;padding:4px 6px;line-height:1}
/* 一覧・トップの相談バンド（コーポレートの記事末CTAと同じ濃紺） */
.band{margin:3rem 0 0;background:var(--navy);color:var(--on-navy);border-radius:12px;padding:2rem 1.5rem;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px}
.band__lead{font-size:1.2rem;font-weight:700;color:#fff;margin-bottom:8px}
.band ul{list-style:none;padding:0;margin:0;font-size:.9rem}
.band li{position:relative;padding-left:1.4em;margin:3px 0;line-height:1.7}
.band li::before{content:"✓";position:absolute;left:0;color:#fff;font-weight:700}
.band .btn{white-space:normal;background:#fff;color:var(--head)}
.band .btn:hover{background:#e9ecf0}
/* ===== メディアトップ（コーポレートの /media/ と同じ構成：見出し帯＋ジャンプ＋カテゴリ格子） ===== */
.mtop .wrap{max-width:var(--hubw)}
.mtop{padding-bottom:64px}
.mhero{padding-top:12px}
.mhero h1{font-size:1.7rem;margin:.4em 0}
.mhero__lead{color:#454e59}
.jump{display:flex;flex-wrap:wrap;gap:8px;margin:1.4em 0 0}
.jump a{font-size:.85rem;padding:.35em 1em;border:1px solid var(--line-strong);border-radius:999px;color:#384049;background:#fff}
.jump a:hover{border-color:var(--head)}
.msec{scroll-margin-top:80px}
.msec h2{font-size:1.3rem;margin:2.6em 0 .6em;padding:.35em .8em;border-left:5px solid var(--head);background:var(--surface-2);border-radius:4px}
.msec__note{margin:-.2em 0 .8em;color:#6b7480;font-size:.92rem}
.worries{list-style:none;margin:0;padding:0;display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}
.worries a{display:flex;flex-direction:column;gap:.2em;height:100%;padding:.7em .9em;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--head);font-weight:600;font-size:.92rem;line-height:1.6}
.worries a:hover{border-color:var(--head);background:#fafbfc}
.w-tag{font-size:.74rem;color:var(--ink-faint);font-weight:400}
.chips{list-style:none;margin:0;padding:0;display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(180px,1fr))}
.chips a{display:block;padding:.6em .9em;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--head);font-weight:600;font-size:.9rem}
.chips a:hover{border-color:var(--head);background:#fafbfc}
@media (max-width:600px){.chips{grid-template-columns:1fr 1fr}.chips a{font-size:.85rem;padding:.6em .7em}}
.prow{margin-top:1.6em}
.prow__h{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:8px}
.prow__h h3{font-size:1rem;color:var(--head);display:flex;align-items:baseline;gap:.6em}
.prow__h h3::before{content:'';width:3px;height:1em;background:#4a5568;border-radius:2px}
.prow__h a{font-size:.86rem;font-weight:700;color:var(--head)}
.prow__h a:hover{text-decoration:underline}
.prow__lead{font-size:.86rem;color:#6b7480;margin:2px 0 4px}
@media (max-width:600px){
  .article{padding-top:20px;padding-bottom:48px;font-size:15.5px}
  .article h1{font-size:1.35rem}
  .body h2{font-size:1.15rem}
  .art-desc{-webkit-line-clamp:1}
  .art-list a.has-img{grid-template-columns:116px minmax(0,1fr);gap:.75em}
}
`;

/* ---------- JS（記事末フォーム・下部バー・計測） ----------
 * フォームの送信先はLP（index.html）と同じGoogleフォーム。entry ID を変えるならLP側も直す。
 * GA4 のイベント: cta_click（data-cta の場所）／ generate_lead（送信成功。form_location=article）
 * ⚠ String.raw にしてある（正規表現のバックスラッシュを残すため）。中で ${} を使わない。 */
const JS = String.raw`(function(){
  var FORM_ACTION='https://docs.google.com/forms/d/e/1FAIpQLSd8Zk9Rxsg292K8R_ttnRYa5d4uXMBkSFrnlEVTFts6feRx6g/formResponse';
  var ENTRY={company:'entry.1620407772',name:'entry.2140471957',email:'entry.417521654',message:'entry.1952858857'};
  var SOURCE='求人広告代理店メディア 記事内フォーム（saiyo-media.agent-best.net）';
  function ev(name,params){try{if(window.gtag)gtag('event',name,params||{});}catch(e){}}

  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('[data-cta]');
    if(a)ev('cta_click',{cta_location:a.getAttribute('data-cta'),page_path:location.pathname});
  });

  /* シェア: リンクのコピーだけJSが要る（SNSはただのリンク） */
  document.addEventListener('click',function(e){
    var el=e.target.closest&&e.target.closest('[data-share]');if(!el)return;
    var kind=el.getAttribute('data-share');ev('share',{method:kind,content_type:'article'});
    if(kind!=='copy')return;
    e.preventDefault();
    var url=el.getAttribute('data-share-url')||location.href, box=el.closest('.share').querySelector('.share-done');
    var done=function(t){if(box){box.textContent=t;setTimeout(function(){box.textContent='';},2200);}};
    if(navigator.clipboard)navigator.clipboard.writeText(url).then(function(){done('コピーしました');},function(){done('コピーできませんでした');});
    else done('コピーできませんでした');
  });

  var forms=document.querySelectorAll('form[data-consult]');
  Array.prototype.forEach.call(forms,function(form){
    var box=form.parentNode, thanks=box.querySelector('.consult__thanks');
    var err=form.querySelector('.cf-err'), btn=form.querySelector('.cf-submit'), label=btn.textContent;
    var started=false;
    form.addEventListener('input',function(){if(!started){started=true;ev('form_start',{form_location:'article',page_path:location.pathname});}});
    form.addEventListener('submit',function(e){
      e.preventDefault();
      err.textContent='';
      var v=function(n){return (form.elements[n].value||'').trim();};
      var company=v('company'),name=v('name'),email=v('email'),message=v('message');
      if(!company||!name||!email){err.textContent='会社名・お名前・メールアドレスをご入力ください。';return;}
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){err.textContent='メールアドレスの形式をご確認ください。';return;}
      btn.disabled=true;btn.textContent='送信中...';
      var data=new FormData();
      data.append(ENTRY.company,company);
      data.append(ENTRY.name,name);
      data.append(ENTRY.email,email);
      data.append(ENTRY.message,(message||'（相談内容の記入なし）')
        +'\n\n興味のある媒体：'+form.getAttribute('data-media')
        +'\n読んでいた記事：'+form.getAttribute('data-title')+'\n'+location.origin+location.pathname
        +'\n\n---\nお問い合わせ元：'+SOURCE);
      fetch(FORM_ACTION,{method:'POST',mode:'no-cors',body:data})
        .then(function(){
          form.hidden=true;thanks.hidden=false;
          ev('generate_lead',{form_location:'article',article:form.getAttribute('data-from'),page_path:location.pathname});
          thanks.scrollIntoView({behavior:'smooth',block:'center'});
          var bar=document.querySelector('.sticky-cta');if(bar)bar.hidden=true;
        })
        .catch(function(){
          btn.disabled=false;btn.textContent=label;
          err.textContent='送信に失敗しました。お手数ですが、時間をおいて再度お試しください。';
        });
    });
  });

  /* 下部バー: 少し読み進めたら出し、相談ブロックが見えている間は隠す。閉じたらそのタブでは出さない */
  var bar=document.querySelector('.sticky-cta'), consult=document.getElementById('consult');
  if(bar&&consult){
    var closed=false;
    try{closed=sessionStorage.getItem('sticky-cta-closed')==='1';}catch(e){}
    /* 相談ブロックの上端が画面に入ったら（それ以降も）隠す。フッターにも被せない */
    var update=function(){
      var reached=consult.getBoundingClientRect().top<window.innerHeight;
      bar.hidden=closed||reached||window.scrollY<700;
    };
    window.addEventListener('scroll',update,{passive:true});
    window.addEventListener('resize',update);
    bar.querySelector('.sticky-cta__x').addEventListener('click',function(){
      closed=true;update();try{sessionStorage.setItem('sticky-cta-closed','1');}catch(e){}
    });
    update();
  }
})();
`;

/* ---------- 出力 ---------- */
function w(rel, html) {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, html, 'utf8');
}

function main() {
  const check = process.argv.includes('--check');
  const all = load();
  all.sort((a, b) => String(b.pubDate || '').localeCompare(String(a.pubDate || '')) || a.slug.localeCompare(b.slug));
  const bad = [];
  all.forEach(a => {
    ['title', 'description', 'pillar', 'pubDate'].forEach(k => { if (!a[k]) bad.push(`${a.slug}: ${k} がありません`); });
    if (a.pillar && !PILLAR[a.pillar]) bad.push(`${a.slug}: 知らない pillar「${a.pillar}」`);
    (a.related || []).forEach(s => { if (!all.some(x => x.slug === s)) bad.push(`${a.slug}: related のリンク先が無い（${s}）`); });
  });
  LIVE_TAGS = collectTags(all);
  const byPillar = {};
  PILLARS.forEach(p => byPillar[p.key] = all.filter(a => a.pillar === p.key));
  console.log(`記事 ${all.length}件`);
  PILLARS.forEach(p => console.log(`  ${p.name}: ${byPillar[p.key].length}件`));
  if (bad.length) { console.log('⚠ 問題:'); bad.slice(0, 40).forEach(x => console.log('   - ' + x)); }
  if (check) return;
  if (bad.length) { console.log('問題があるので書き出しません。'); process.exit(1); }

  if (fs.existsSync(OUT)) {
    fs.readdirSync(OUT).forEach(f => {
      if (f === '_articles' || f === 'assets') return;
      fs.rmSync(path.join(OUT, f), { recursive: true, force: true });
    });
  }
  w('assets/media.css', CSS);
  w('assets/media.js', JS);
  fs.writeFileSync(path.join(DIR, '.nojekyll'), '', 'utf8');
  all.forEach(a => w(`${a.slug}/index.html`, articleHtml(a, all)));

  PILLARS.forEach(p => {
    const list = byPillar[p.key];
    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    for (let n = 1; n <= pages; n++) {
      const items = list.slice((n - 1) * PER_PAGE, n * PER_PAGE);
      w(n === 1 ? `${p.key}/index.html` : `${p.key}/page-${n}.html`, listPage({
        title: `${p.name}の記事一覧${n > 1 ? `（${n}ページ目）` : ''}｜求人広告代理店エージェントベスト`,
        desc: p.lead, url: `/media/${p.key}/${n > 1 ? `page-${n}.html` : ''}`,
        h1: p.name, lead: p.lead, nav: pillarNav(p.key),
        crumbs: [{ name: 'ホーム', url: '/' }, { name: '記事', url: '/media/' }, { name: p.name }],
        items, total: list.length, page: n, pages, base: `/media/${p.key}/`,
        ctaKey: p.key, from: `media-hub-${p.key}`,
      }));
    }
  });

  const topPages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  w('index.html', topHtml(all, byPillar, all.slice(0, PER_PAGE), topPages));
  for (let n = 2; n <= topPages; n++) {
    w(`page-${n}.html`, listPage({
      title: `求人媒体の使いこなしと選び方の記事（${n}ページ目）｜求人広告代理店エージェントベスト`,
      desc: 'OfferBox・Wantedly・ワンキャリアの運用ノウハウと、規模・業界・職種ごとの媒体の選び方。求人広告代理店が実務の判断に使える形でまとめています。',
      url: `/media/${n > 1 ? `page-${n}.html` : ''}`,
      h1: '採用媒体の使いこなしと、選び方。',
      lead: 'どの媒体を選ぶか、申し込んだあとどう運用するか。新卒・中途・インターンの求人媒体を扱う求人広告代理店の立場で、実務の判断に使える形にまとめています。',
      nav: pillarNav(''),
      crumbs: [{ name: 'ホーム', url: '/' }, { name: '記事' }],
      items: all.slice((n - 1) * PER_PAGE, n * PER_PAGE), total: all.length,
      page: n, pages: topPages, base: '/media/',
      ctaKey: 'hikaku', from: 'media-list',
    }));
  }

  w('tag/index.html', tagIndexHtml());
  for (const [t, list] of LIVE_TAGS) {
    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    for (let n = 1; n <= pages; n++) {
      const dir = `tag/${t}/`;
      w(n === 1 ? dir + 'index.html' : `${dir}page-${n}.html`, listPage({
        title: `「${t}」の記事一覧${n > 1 ? `（${n}ページ目）` : ''}｜求人広告代理店エージェントベスト`,
        desc: `「${t}」に関する採用媒体の記事${list.length}本。${list.slice(0, 2).map(a => shortTitle(a.title)).join('、')}など。`,
        url: tagUrl(t) + (n > 1 ? `page-${n}.html` : ''),
        h1: `「${t}」の記事`, lead: `「${t}」のタグが付いた記事です。OfferBox・Wantedly・ワンキャリア・媒体比較・採用ノウハウをまたいで並べています。`,
        nav: `<p class="more" style="margin:0 0 1em"><a href="/media/tag/">← タグ一覧へ</a></p>`,
        crumbs: [{ name: 'ホーム', url: '/' }, { name: '記事', url: '/media/' }, { name: 'タグ', url: '/media/tag/' }, { name: t }],
        items: list.slice((n - 1) * PER_PAGE, n * PER_PAGE), total: list.length, page: n, pages, base: tagUrl(t),
        ctaKey: 'knowhow', from: 'media-tag',
      }));
    }
  }

  const urls = ['/', '/media/', '/media/tag/'].concat([...LIVE_TAGS.keys()].map(tagUrl)).concat(PILLARS.map(p => `/media/${p.key}/`)).concat(all.map(a => `/media/${a.slug}/`));
  fs.writeFileSync(path.join(DIR, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + urls.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join('\n') + `\n</urlset>\n`, 'utf8');
  fs.writeFileSync(path.join(DIR, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`, 'utf8');
  console.log(`media/ に ${all.length}記事 ＋ ハブ${PILLARS.length}本 ＋ トップを書き出しました`);
  console.log(`sitemap.xml: ${urls.length}URL`);
}

main();
