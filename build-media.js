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
 *   配色はLP（index.html）と同じトークン（パープル #6B3FA0 × ネイビー）。
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
<meta name="twitter:card" content="summary">
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

const AUTHOR = `<aside class="author">
  <p class="author__t">監修</p>
  <p class="author__n">松岡 良次</p>
  <p class="author__b">株式会社エージェントベスト代表。大手人材会社およびスタートアップ人材企業にて、IT・スタートアップ・メガベンチャー企業の採用支援に従事。独立後はIT・スタートアップ・コンサル領域に特化し、20〜30代のキャリア支援を行う。（厚生労働大臣許可 13-ユ-316964）</p>
</aside>`;

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
  const toc = heads.length >= 3
    ? `<nav class="toc"><p class="toc__t">この記事の内容</p><ol>`
      + heads.map(h => `<li><a href="#${h.id}">${esc(h.text)}</a></li>`).join('') + `</ol></nav>` : '';
  const rel = (a.related || []).map(s => all.find(x => x.slug === s)).filter(Boolean);
  const relHtml = rel.length
    ? `<section class="related"><h2>あわせて読む</h2><ul>`
      + rel.map(r => `<li><a href="/media/${esc(r.slug)}/">${esc(r.title)}</a></li>`).join('') + `</ul></section>` : '';
  const src = (a.sources || []).filter(s => s && s.name);
  const srcHtml = src.length
    ? `<section class="sources"><h2>出典</h2><ul>`
      + src.map(s => s.url ? `<li><a href="${escAttr(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a></li>` : `<li>${esc(s.name)}</li>`).join('')
      + `</ul></section>` : '';
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: a.title, description: a.description,
    datePublished: a.pubDate, dateModified: a.reviewedAt || a.pubDate,
    author: { '@type': 'Person', name: '松岡 良次' },
    publisher: { '@type': 'Organization', name: '株式会社エージェントベスト' },
    mainEntityOfPage: SITE + url,
  };
  return head({ title: `${a.title}｜求人広告代理店エージェントベスト`, desc: a.description, url, ogType: 'article', jsonld, navCta: '#consult' })
    + crumbs([{ name: 'ホーム', url: '/' }, { name: '記事', url: '/media/' }, { name: p.name, url: `/media/${p.key}/` }, { name: a.title }])
    + `<main class="wrap article">
  <p class="art__kicker">${esc(p.name)}${a.series ? ' / ' + esc(a.series) : ''}</p>
  <h1>${esc(a.title)}</h1>
  <p class="art__meta">公開 ${esc(a.pubDate)}${a.reviewedAt && a.reviewedAt !== a.pubDate ? ' ／ 更新 ' + esc(a.reviewedAt) : ''}</p>
  ${toc}
  <div class="body">
${html}
  </div>
  ${srcHtml}
  ${ctaBlock(a)}
  ${relHtml}
  ${AUTHOR}
</main>
${stickyCta(a)}` + foot();
}

/* ---------- 一覧 ---------- */
function card(a) {
  const p = PILLAR[a.pillar] || PILLARS[0];
  return `<li class="card"><a href="/media/${esc(a.slug)}/">
      <span class="card__tag">${esc(p.name)}</span>
      <span class="card__t">${esc(a.title)}</span>
      <span class="card__d">${esc(a.description || '')}</span>
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
function listPage(o) {
  return head({ title: o.title, desc: o.desc, url: o.url, navCta: entryHref(o.from) })
    + crumbs(o.crumbs)
    + `<main class="wrap listing">
  <h1>${esc(o.h1)}</h1>
  <p class="lead">${esc(o.lead)}</p>
  ${o.nav || ''}
  <p class="count">${o.total}件${o.pages > 1 ? `（${o.page}／${o.pages}ページ）` : ''}</p>
  ${o.items.length ? `<ul class="cards">${o.items.map(card).join('')}</ul>` : `<p class="empty">記事を準備しています。</p>`}
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
    <ul class="cards cards--s">${list.slice(0, 3).map(card).join('')}</ul>
  </section>`;
  }).join('\n');

  return head({
    title: '求人媒体の使いこなしと選び方の記事｜求人広告代理店エージェントベスト',
    desc: 'OfferBox・Wantedly・ワンキャリアの運用ノウハウと、業界・職種・規模ごとの求人媒体の選び方。求人広告代理店が、採用担当者の実務の判断に使える形で1,000本の記事にまとめています。',
    url: '/media/', navCta: entryHref('media-top'),
  })
    + crumbs([{ name: 'ホーム', url: '/' }, { name: '記事' }])
    + `<main class="mtop">
  <section class="mhero">
    <div class="wrap mhero__in">
      <div>
        <p class="mhero__kick">求人広告代理店の採用メディア</p>
        <h1>採用媒体の使いこなしと、選び方。</h1>
        <p class="mhero__lead">どの媒体を選ぶか、申し込んだあとどう運用するか。新卒・中途・インターンの求人媒体を扱う求人広告代理店の立場で、採用担当者が実務で判断に使える形にまとめています。</p>
        <ul class="mhero__stats">
          <li><b>${all.length.toLocaleString()}</b>本の記事</li>
          <li><b>${byPillar.hikaku.length}</b>本の媒体比較</li>
          <li><b>0</b>円の媒体選定相談</li>
        </ul>
        <nav class="mhero__jump" aria-label="記事の探し方">
          <a href="#worry">悩みから</a><a href="#industry">業界から</a><a href="#job">職種から</a><a href="#size">規模から</a><a href="#pillar">媒体から</a><a href="#latest">新着</a>
        </nav>
      </div>
      <aside class="mhero__cta">
        <p class="mhero__cta-t">読んでも決めきれないときは</p>
        <p>採りたい職種・人数・時期を伺って、取り扱い媒体を横並びで比較します。運用中の媒体の見直しだけでも構いません。</p>
        <a class="btn btn-primary" href="${escAttr(entryHref('media-top-hero'))}" data-cta="hero">無料で相談する →</a>
        <p class="mhero__trust">${TRUST.slice(0, 3).map(esc).join(' ／ ')}</p>
      </aside>
    </div>
  </section>

  <div class="wrap">
    <section class="msec" id="worry">
      <h2>よくある悩みから探す</h2>
      <p class="msec__note">運用中にいちばん相談の多いつまずきです。原因の切り分け方から書いています。</p>
      <ul class="worries">${worries.map(a => {
        const p = PILLAR[a.pillar];
        return `<li><a href="/media/${esc(a.slug)}/"><span class="card__tag">${esc(p.name)}</span><span>${esc(shortTitle(a.title))}</span></a></li>`;
      }).join('')}</ul>
    </section>

    ${entries.map(e => `<section class="msec" id="${e.id}">
      <h2>${e.h}</h2>
      <p class="msec__note">${e.note}</p>
      <ul class="chips">${chips(e.s)}</ul>
    </section>`).join('\n    ')}

    ${ctaBand('hikaku', 'media-top-mid')}

    <section class="msec" id="pillar">
      <h2>媒体から探す</h2>
      ${pillarNav('')}
      ${pillarRows}
    </section>

    <section class="msec" id="latest">
      <h2>新着記事</h2>
      <ul class="cards">${page1.map(card).join('')}</ul>
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

/* ---------- CSS（LPと同じトークン） ---------- */
const CSS = `:root{
  --paper:#F3F6FB;--surface:#FFFFFF;--surface-2:#E9EFF8;
  --ink:#0E1B30;--ink-soft:#48586F;--ink-faint:#8291A5;
  --line:#E0E8F2;--line-strong:#CAD6E5;
  --accent:#6B3FA0;--accent-strong:#57318A;--accent-ink:#4C2A7A;--accent-tint:#EDE4F7;
  --success:#12A150;--success-ink:#0B7A3B;--success-tint:#DCF3E6;
  --navy:#0B1A32;--on-navy:#EAF0F8;--on-navy-soft:#9CB0CB;--on-navy-line:#20324D;
  --sans:"Hiragino Kaku Gothic ProN","Hiragino Sans","Yu Gothic",YuGothic,"Noto Sans JP","Segoe UI",sans-serif;
  --mono:"SFMono-Regular","SF Mono","Cascadia Code",Consolas,"Roboto Mono",monospace;
  --maxw:1080px;--readw:740px;--radius:16px;
  --shadow:0 1px 2px rgba(14,27,48,.05),0 16px 38px -20px rgba(14,27,48,.26);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);line-height:1.9;-webkit-font-smoothing:antialiased;overflow-x:hidden}
h1,h2,h3,h4,p,ul,ol{margin:0}
a{color:inherit;text-decoration:none}
.wrap{max-width:var(--maxw);margin:0 auto;padding:0 22px}
.btn{display:inline-flex;align-items:center;gap:9px;font-weight:800;font-size:.95rem;padding:14px 26px;border-radius:11px;cursor:pointer;border:1px solid transparent;transition:transform .15s ease,background .2s ease;white-space:nowrap}
.btn-primary{background:var(--accent);color:#fff;box-shadow:0 10px 26px -10px var(--accent)}
.btn-primary:hover{background:var(--accent-strong);transform:translateY(-1px)}
header.nav{position:sticky;top:0;z-index:50;background:rgba(243,246,251,.88);backdrop-filter:saturate(180%) blur(12px);border-bottom:1px solid var(--line)}
.nav-in{display:flex;align-items:center;justify-content:space-between;height:64px;gap:16px}
.brand{display:flex;align-items:center;gap:11px;font-weight:800}
.brand-logo{display:block;height:34px;width:auto;flex:none}
.brand-sub{display:block;padding-left:11px;border-left:1px solid var(--line);font-family:var(--mono);font-size:.56rem;letter-spacing:.12em;color:var(--ink-faint);font-weight:600}
.nav-links{display:flex;gap:20px;font-size:.9rem;font-weight:700;color:var(--ink-soft);margin-left:auto;margin-right:6px}
.nav-links a:hover{color:var(--accent-ink)}
.cta-mini{padding:10px 18px;font-size:.86rem}
@media (max-width:720px){.nav-links{display:none}}
@media (max-width:560px){.brand-sub{display:none}}
.crumb{border-bottom:1px solid var(--line);background:var(--surface)}
.crumb .wrap{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding-top:11px;padding-bottom:11px;font-size:.78rem;color:var(--ink-faint)}
.crumb a:hover{color:var(--accent-ink)}
.crumb i{font-style:normal;color:var(--line-strong)}
.crumb span{color:var(--ink-soft)}
.article{max-width:var(--readw);padding-top:34px;padding-bottom:70px}
.art__kicker{font-size:.76rem;font-weight:800;letter-spacing:.1em;color:var(--accent-ink);margin-bottom:12px}
.article h1{font-size:1.86rem;line-height:1.5;letter-spacing:-.01em;margin-bottom:12px}
.art__meta{font-family:var(--mono);font-size:.76rem;color:var(--ink-faint);margin-bottom:26px}
@media (max-width:560px){.article h1{font-size:1.44rem}}
.toc{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:20px 24px;margin-bottom:34px}
.toc__t{font-size:.78rem;font-weight:800;letter-spacing:.08em;color:var(--ink-faint);margin-bottom:10px}
.toc ol{margin:0;padding-left:1.25em;font-size:.92rem}
.toc li{margin:5px 0}
.toc a:hover{color:var(--accent-ink);text-decoration:underline}
.body{font-size:1.02rem}
.body h2{font-size:1.34rem;line-height:1.55;margin:44px 0 14px;padding-top:8px;border-top:2px solid var(--navy)}
.body h3{font-size:1.1rem;margin:30px 0 10px}
.body h3.insight{background:var(--accent-tint);color:var(--accent-ink);border-left:4px solid var(--accent);padding:8px 14px;border-radius:0 10px 10px 0;font-size:1rem}
.body h3.insight + p{background:var(--surface);border:1px solid var(--line);border-top:0;border-radius:0 0 12px 12px;padding:16px 18px;margin-top:-10px}
.body h4{font-size:1rem;margin:22px 0 8px;color:var(--ink-soft)}
.body p{margin:0 0 18px}
.body ul,.body ol{margin:0 0 20px;padding-left:1.4em}
.body li{margin:6px 0}
.body strong{font-weight:800}
.body code{font-family:var(--mono);font-size:.88em;background:var(--surface-2);padding:2px 6px;border-radius:5px}
.body a{color:var(--accent-ink);text-decoration:underline;text-underline-offset:3px}
.body hr{border:0;border-top:1px solid var(--line);margin:34px 0}
.body blockquote{margin:0 0 20px;padding:14px 20px;border-left:3px solid var(--accent);background:var(--surface);color:var(--ink-soft);border-radius:0 10px 10px 0}
.body blockquote p:last-child{margin:0}
.tw{overflow-x:auto;margin:0 0 22px;border:1px solid var(--line);border-radius:12px;background:var(--surface)}
.body table{border-collapse:collapse;width:100%;font-size:.92rem}
.body th,.body td{padding:11px 14px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.body th{background:var(--surface-2);font-weight:800;white-space:nowrap}
.body tbody tr:last-child td{border-bottom:0}
.cta-inline{background:var(--navy);color:var(--on-navy);border-radius:var(--radius);padding:22px 24px;margin:34px 0;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px}
.cta-inline p{margin:0;font-weight:700;font-size:.98rem}
.cta-inline a{background:var(--accent);color:#fff;font-weight:800;font-size:.9rem;padding:12px 22px;border-radius:10px;white-space:nowrap}
.cta-inline a:hover{background:var(--accent-strong)}
.sources{margin:44px 0 0;padding-top:22px;border-top:1px solid var(--line)}
.sources h2,.related h2{font-size:.82rem;font-weight:800;letter-spacing:.08em;color:var(--ink-faint);margin-bottom:10px}
.sources ul,.related ul{margin:0;padding-left:1.2em;font-size:.9rem}
.sources li,.related li{margin:6px 0}
.sources a,.related a{color:var(--accent-ink);text-decoration:underline;text-underline-offset:3px}
.cta-end{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:30px 28px;margin:40px 0 0;text-align:center;box-shadow:var(--shadow)}
.cta-end__lead{font-size:1.12rem;font-weight:800;margin-bottom:8px}
.cta-end__sub{font-size:.92rem;color:var(--ink-soft);margin-bottom:20px}
.related{margin-top:40px}
.author{margin-top:40px;padding-top:22px;border-top:1px solid var(--line);font-size:.88rem;color:var(--ink-soft)}
.author__t{font-size:.74rem;font-weight:800;letter-spacing:.1em;color:var(--ink-faint)}
.author__n{font-size:1rem;font-weight:800;color:var(--ink);margin:4px 0 6px}
.listing{padding-top:38px;padding-bottom:70px}
.listing h1{font-size:1.9rem;line-height:1.45;margin-bottom:12px}
.listing .lead{color:var(--ink-soft);font-size:.98rem;max-width:var(--readw);margin-bottom:24px}
.pnav{display:flex;flex-wrap:wrap;gap:9px;margin-bottom:24px}
.pnav a{border:1px solid var(--line-strong);background:var(--surface);border-radius:999px;padding:9px 18px;font-size:.9rem;font-weight:700;color:var(--ink-soft)}
.pnav a:hover{border-color:var(--accent);color:var(--accent-ink)}
.pnav a.on{background:var(--navy);border-color:var(--navy);color:#fff}
.count{font-family:var(--mono);font-size:.8rem;color:var(--ink-faint);margin-bottom:14px}
.cards{list-style:none;margin:0;padding:0;display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(310px,1fr))}
.card a{display:flex;flex-direction:column;gap:7px;height:100%;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:18px 20px;transition:border-color .15s,transform .15s}
.card a:hover{border-color:var(--accent);transform:translateY(-2px)}
.card__tag{font-size:.7rem;font-weight:800;letter-spacing:.08em;color:var(--accent-ink)}
.card__t{font-size:1rem;font-weight:800;line-height:1.6}
.card__d{font-size:.85rem;color:var(--ink-soft);line-height:1.7}
.pager{display:flex;flex-wrap:wrap;gap:7px;margin-top:30px;font-family:var(--mono);font-size:.85rem}
.pager a,.pager span{padding:8px 13px;border-radius:9px;border:1px solid var(--line-strong);background:var(--surface)}
.pager span.on{background:var(--navy);border-color:var(--navy);color:#fff}
.pager a:hover{border-color:var(--accent);color:var(--accent-ink)}
.empty{background:var(--surface);border:1px dashed var(--line-strong);border-radius:var(--radius);padding:40px 24px;text-align:center;color:var(--ink-soft)}
footer{background:var(--navy);color:var(--on-navy-soft);border-top:1px solid var(--on-navy-line);padding:46px 0 40px;font-size:.88rem}
.foot-in{display:flex;flex-wrap:wrap;justify-content:space-between;gap:26px}
.foot-brand{color:#fff;font-weight:800;font-size:1.05rem}
.foot-links{display:flex;flex-wrap:wrap;gap:8px 22px}
.foot-links a:hover{color:#fff}
.foot-copy{margin-top:26px;padding-top:18px;border-top:1px solid var(--on-navy-line);font-size:.78rem;color:#6E8199;line-height:1.8}
/* 記事末の相談フォーム */
.consult{margin:44px 0 0;border-radius:var(--radius);overflow:hidden;background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow);scroll-margin-top:84px}
.consult__head{background:var(--navy);color:var(--on-navy);padding:26px 26px 22px}
.consult__kick{font-size:.72rem;font-weight:800;letter-spacing:.1em;color:var(--on-navy-soft);margin-bottom:6px}
.consult__lead{font-size:1.2rem;font-weight:800;line-height:1.55;margin-bottom:12px}
.consult__head .consult__lead{color:#fff}
.consult__points{list-style:none;padding:0;margin:0;font-size:.9rem;color:var(--on-navy)}
.consult__points li{position:relative;padding-left:1.5em;margin:5px 0;line-height:1.7}
.consult__points li::before{content:"✓";position:absolute;left:0;color:#8EE0B1;font-weight:800}
.consult__form{padding:22px 26px 24px;display:grid;gap:12px}
.consult__form label{display:grid;gap:5px;font-size:.84rem;font-weight:800;color:var(--ink)}
.consult__form .req,.consult__form .opt{margin-left:8px;font-size:.66rem;font-weight:800;padding:1px 7px;border-radius:5px;vertical-align:1px}
.consult__form .req{background:var(--accent-tint);color:var(--accent-ink)}
.consult__form .opt{background:var(--surface-2);color:var(--ink-faint)}
.consult__form input,.consult__form textarea{font:inherit;font-weight:400;font-size:.95rem;padding:11px 13px;border:1px solid var(--line-strong);border-radius:10px;background:#fff;color:var(--ink);width:100%}
.consult__form input:focus,.consult__form textarea:focus{outline:2px solid var(--accent);outline-offset:1px;border-color:var(--accent)}
.cf-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media (max-width:560px){.cf-row{grid-template-columns:1fr}.consult__head,.consult__form{padding-left:18px;padding-right:18px}}
.cf-err{color:#B23B3B;font-size:.84rem;min-height:1.1em}
.cf-submit{justify-content:center;width:100%;font-size:1rem;padding:15px 20px;white-space:normal}
.cf-submit:disabled{opacity:.6;cursor:default;transform:none}
.cf-note{font-size:.74rem;color:var(--ink-faint);text-align:center;line-height:1.7}
.consult__thanks{padding:26px;text-align:center;font-size:.92rem;color:var(--ink-soft)}
.consult__thanks p{margin-bottom:10px}
.consult__thanks a{color:var(--accent-ink);font-weight:800;text-decoration:underline;text-underline-offset:3px}
/* 下部バー */
.sticky-cta{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:60;width:min(680px,calc(100% - 24px));display:flex;align-items:center;gap:12px;background:var(--navy);color:#fff;border-radius:14px;padding:10px 10px 10px 18px;box-shadow:0 18px 40px -12px rgba(11,26,50,.55)}
.sticky-cta[hidden]{display:none}
.sticky-cta p{flex:1;margin:0;font-weight:800;font-size:.92rem;line-height:1.4}
.sticky-cta p span{display:block;font-weight:600;font-size:.72rem;color:var(--on-navy-soft)}
.sticky-cta a{background:var(--accent);color:#fff;font-weight:800;font-size:.9rem;padding:11px 20px;border-radius:10px;white-space:nowrap}
.sticky-cta a:hover{background:var(--accent-strong)}
.sticky-cta__x{background:none;border:0;color:var(--on-navy-soft);font-size:1.2rem;cursor:pointer;padding:4px 6px;line-height:1}
/* 一覧の相談バンド */
.band{margin:44px 0 0;background:var(--navy);color:var(--on-navy);border-radius:var(--radius);padding:26px 28px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px}
.band__lead{font-size:1.15rem;font-weight:800;color:#fff;margin-bottom:8px}
.band ul{list-style:none;padding:0;margin:0;font-size:.88rem}
.band li{position:relative;padding-left:1.4em;margin:3px 0;line-height:1.7}
.band li::before{content:"✓";position:absolute;left:0;color:#8EE0B1;font-weight:800}
.band .btn{white-space:normal}
/* ページ送り */
.pager .gap{border:0;background:none;padding:8px 2px;color:var(--ink-faint)}
/* メディアトップ */
.mhero{background:var(--navy);color:var(--on-navy);padding:46px 0 42px}
.mhero__in{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:34px;align-items:center}
@media (max-width:860px){.mhero__in{grid-template-columns:1fr}}
.mhero__kick{font-size:.74rem;font-weight:800;letter-spacing:.12em;color:var(--on-navy-soft);margin-bottom:10px}
.mhero h1{font-size:2.1rem;line-height:1.4;color:#fff;margin-bottom:14px}
@media (max-width:560px){.mhero h1{font-size:1.6rem}}
.mhero__lead{color:var(--on-navy);font-size:.98rem;margin-bottom:18px}
.mhero__stats{list-style:none;padding:0;margin:0 0 20px;display:flex;flex-wrap:wrap;gap:8px 24px;font-size:.84rem;color:var(--on-navy-soft)}
.mhero__stats b{font-family:var(--mono);font-size:1.5rem;color:#fff;margin-right:4px}
.mhero__jump{display:flex;flex-wrap:wrap;gap:8px}
.mhero__jump a{border:1px solid var(--on-navy-line);background:rgba(255,255,255,.06);border-radius:999px;padding:7px 15px;font-size:.84rem;font-weight:700}
.mhero__jump a:hover{border-color:#fff}
.mhero__cta{background:var(--surface);color:var(--ink);border-radius:var(--radius);padding:24px;box-shadow:var(--shadow)}
.mhero__cta-t{font-weight:800;font-size:1.08rem;margin-bottom:8px}
.mhero__cta p{font-size:.88rem;color:var(--ink-soft);margin-bottom:14px}
.mhero__cta .btn{width:100%;justify-content:center}
.mhero__cta .mhero__trust{font-size:.74rem;color:var(--ink-faint);text-align:center;margin:10px 0 0}
.mtop{padding-bottom:70px}
.msec{margin-top:52px;scroll-margin-top:80px}
.msec h2{font-size:1.4rem;line-height:1.5;margin-bottom:6px}
.msec__note{color:var(--ink-soft);font-size:.92rem;margin-bottom:18px;max-width:var(--readw)}
.worries{list-style:none;margin:0;padding:0;display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}
.worries a{display:flex;flex-direction:column;gap:4px;height:100%;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px 16px;font-weight:800;font-size:.95rem;line-height:1.6;transition:border-color .15s}
.worries a:hover{border-color:var(--accent)}
.chips{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.chips a{display:inline-block;background:var(--surface);border:1px solid var(--line-strong);border-radius:999px;padding:7px 15px;font-size:.88rem;font-weight:700;color:var(--ink-soft)}
.chips a:hover{border-color:var(--accent);color:var(--accent-ink)}
.prow{margin-top:26px}
.prow__h{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:8px}
.prow__h h3{font-size:1.12rem}
.prow__h a{font-size:.86rem;font-weight:800;color:var(--accent-ink)}
.prow__lead{font-size:.86rem;color:var(--ink-soft);margin:2px 0 12px}
.cards--s .card__d{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
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

  const urls = ['/', '/media/'].concat(PILLARS.map(p => `/media/${p.key}/`)).concat(all.map(a => `/media/${a.slug}/`));
  fs.writeFileSync(path.join(DIR, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + urls.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join('\n') + `\n</urlset>\n`, 'utf8');
  fs.writeFileSync(path.join(DIR, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`, 'utf8');
  console.log(`media/ に ${all.length}記事 ＋ ハブ${PILLARS.length}本 ＋ トップを書き出しました`);
  console.log(`sitemap.xml: ${urls.length}URL`);
}

main();
