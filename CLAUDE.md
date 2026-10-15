# saiyo-media — 求人広告代理店LP（採用企業向け・B2B）

- 公開予定URL: https://saiyo-media.agent-best.net/ （GitHub Pages、`.nojekyll` ＋ `CNAME`）※ドメインは公開前に要確認
- サービス: **求人広告代理店**（2026-09-30に3媒体の販売パートナーLPから転換。松岡さん「3媒体に絞りたいわけではない」）。新卒＝マイナビ2028・OfferBox・ワンキャリア・チアキャリア／中途＝doda・マイナビ転職・type・Wantedly／長期インターン＝Infra。他にも取り扱いあり（媒体を足すときは index.html の NEWGRAD/MID/INTERN 相当のカードと目的別表・フォームの選択肢・フッターの商標表記を直す）。媒体の事実は saiyo-media-gen/data/baitai-list.md
- アクセント色: パープル `#6B3FA0`（媒体色は OfferBox=ティール / Wantedly=ブルー / ワンキャリア=アンバー）
- 構成は `index.html` 1ファイル完結（外部CDNゼロ）＋ロゴ画像。B2B LP共通ルール（[[agentbest-b2b-lp-family]]）に従う。

## 訴求の軸
- 「求人媒体選びを、ひとつの窓口で」。料金は各媒体の正規料金のまま・上乗せなし（手数料は媒体側から）。
- 中立の媒体選定 → 申込 → 運用（スカウト代行／OfferBox運用代行 完全成果報酬20万円/1名）まで。

## 表記ルール（Wantedly PRガイドライン 2024/11 準拠）
- 会社名は「ウォンテッドリー（株式会社）」、サービス名は「Wantedly」。
- Wantedlyの文脈で「人材」「人材サービス」と読める表現は使わない（◯採用 △求人 ✕人材）。Wantedlyは募集情報等提供事業者で職業紹介ではない。
- ロゴは使わない（ブランドガイドラインの確認が必要なためテキスト表記のみ）。
- 「認定パートナー」とは書かない（認定条件＝直近6ヶ月で新規10件。未達なら「販売パートナー」）。
- 広告・リリースを出す時は事前に pr@wantedly.com へ一報（ガイドラインの要請）。

## 数値の出典（2026-09-10時点）
- OfferBox: 27卒登録25万人／累計導入2万社以上／オリコン3年連続No.1 — offerbox.jp/company/
- Wantedly: 登録ユーザー約450万人／成功報酬0円／ライト72万〜・スタンダード90万〜・プレミアム132万〜（税抜） — public-sales-materials.wantedly.com の2026年版サービス資料
- ワンキャリア: 導入7,000社以上／学生35万人以上（2025年3月末）／上位校約95%／クチコミ70万件以上 — service.onecareer.jp

## CTA
ページ内フォーム（コーポレートと同一Googleフォーム、SOURCE付記）→ サンクス画面に Timerex リンク。直リンクに戻さない。

## 2026-09-30 の決めごと
- LPに媒体ごとの料金・登録者数は載せない（媒体が増えると保てない。Wantedlyのプラン料金は公式非公開、ワンキャリアの金額は書かない方針）。料金欄は「料金の決まり方」だけ
- 「業界最大級」「No.1」など媒体側の最上級表現は載せない（注記と基準日が頁ごとに違う）
- 代表プロフィールは jobsite と同じ文面に統一済み

## 問い合わせ導線（2026-10-11）
- **記事末は記事内フォーム**（`build-media.js` の `ctaBlock`、送信は `media/assets/media.js`）。LPと同じGoogleフォーム・同じ entry ID。相談内容は任意、文面に「興味のある媒体／読んでいた記事URL」を付ける。送信後はLPと同じくTimerexを案内（直リンクにはしない）。
- 文言は柱ごと（`PILLAR_CTA`）。媒体の料金・最上級表現は書かない。金額はOfferBox運用代行（20万円／1名）だけ。
- 本文中の `/#entry` リンクはビルド時に `#consult`（記事末フォーム）へ置換。スクロール途中で下部バー（`.sticky-cta`）、閉じたらそのタブでは出さない。
- 一覧・トップからLPへは `/?from=<ページ>&media=<媒体>#entry`。LPは media を事前チェックし、from を文面末尾に「（導線：…）」で付ける。
- GA4（G-1XXMP8Y1B4）: `cta_click`（cta_location）／`form_start`／**`generate_lead`（送信成功。form_location=article|lp）**。LPにもGAタグを入れた（それまでLPは計測なし）。
- メディアトップ（/media/）は悩み→業界→職種→規模→媒体→新着の入口構成。業界・職種・規模のチップは hikaku の series/target から自動。悩みの12本は `WORRIES`。

## 記事の見た目（2026-10-15）
- メディア（/media/ 以下）の見た目はコーポレートの記事（www.agent-best.net/media/、agentbest-lp の `src/pages/media/[slug].astro`）に揃えた。白地×#1C1C2E、見出しはグレー帯＋左線、メタはチップ、目次・出典ボックス・シェア・関連記事・同じ柱の他の記事（巡回6件）・監修者（SNSリンク付き）の順。LPのパープルはメディアでは使わない。
- 記事末フォーム・下部バー・GA4イベントの仕組みは変えていない（色だけコーポレートのCTAに合わせた）。
- アイキャッチ（1200×630 JPEG）は `images/media/<slug>.jpg`。`node tools/eyecatch/render.js` で無い記事だけ作る（`--force` で全作り直し、slug指定で個別）。ヘッドレスChromeを1つ立ててDevTools Protocolで撮る（依存なし、1,000枚で約2分）。見た目は `tools/eyecatch/template.html`、色は柱ごと。
- **記事を足したら render.js → build-media.js の順に流す。** 画像がある記事だけ、記事上部・一覧のサムネ・og:image（summary_large_image）・JSON-LDに使う。PNGだと1枚300KBになるのでJPEGにしている。
