# myPage — パネル表示（表/裏）

## 概要

5枚の縦スクロールパネル（A,B,C,D,E）を持つシンプルなデモです。各パネルには表（0）と裏（1）があり、縦スクロール（マウス/タッチ/キーボード）操作で表→裏のフリップ、パネル間の縦スライド遷移を行います。

## ファイル構成

- `index.html` — パネル構造（`img_A0.png` / `img_A1.png` などの画像参照）
- `styles.css` — レイアウト、アニメーション用の CSS。CSS 変数 `--panel-width` / `--panel-height` を使用。
- `script.js` — 入力ハンドリング（`wheel`, `touch`, `keydown`）、フリップ/スライドのロジック。
- 画像アセット — `img_A0.png`, `img_A1.png`, ...（各画像は同サイズを想定）。

## ユーザー目線の動作

- 初期表示は `A0`（A の表）。
- 下方向スクロール（進行）:
  - 表表示中に画面高さの 20% 分スクロール → 表→裏のフリップ。
  - 裏表示中にさらに画面高さの 80% 分スクロール → 次パネルへ縦スライド（到着時は表を優先表示）。
- 上方向スクロール（戻る）:
  - 裏表示中に 20% で裏→表へフリップ。
  - 表表示中に 80% で前のパネルの裏へスライド（到着時は裏を即時表示してトランジションを無効化）。

## 実装の要点

### 入力と閾値

- `wheel` の `deltaY` と `touch` の移動量を累積し、閾値（画面高さの 20% / 80%）で動作を発火します。
- 閾値はウィンドウリサイズで再計算されます。

### フリップアニメーション

- CSS の `transform: translateX(-50%) scaleX(...)` を用い、横中央基準で縮小（scaleX 1→0）→拡大（0→1）します。
- JS で `front.style.transform` / `back.style.transform` を切り替えます。

### スライドアニメーション

- `.panels` 要素に `transform: translateY(-N * PANEL_HEIGHT)` を適用して縦スライドします（`PANEL_HEIGHT` は表示時のパネル高さ、JS で計算）。
- 上方向スライドで前パネルの裏を表示する場合、到着時に裏を即時セットしてトランジションを無効化します。

### レスポンシブと画像サイズ取得

- 実装は最初に読み込まれる表画像の自然サイズ（`naturalWidth` / `naturalHeight`）を参照し、アスペクト比を保ったままビューポート内に収まる表示サイズを計算して `--panel-width` / `--panel-height` に設定します。
- 表示サイズは幅を最大 `90%` のビューポート幅に合わせ、高さがオーバーする場合は高さを `90%` に合わせて縮小します。
- 計算結果は JS 側の `PANEL_WIDTH` / `PANEL_HEIGHT` にも反映され、スライド量は `PANEL_HEIGHT` を使用します。

### 再入制御

- `busy` フラグでアニメーション中の多重発火を防止します。
- スライド直後に不要なフリップが発生しないよう `lockFlip` で短時間ロックします。

## 調整可能な項目（すべて簡単に変更できます）

- `FLIP_TIME`（`script.js`）: 表→裏／裏→表 のアニメ時間（各半分の ms）。
- `SLIDE_TIME`（`script.js`）: パネル間のスライド時間（ms）。
- `FLIP_THRESHOLD` / `SLIDE_THRESHOLD`（`script.js`）: 発火閾値（現在は画面高さの 20% / 80% で自動計算）。
- `--panel-width` / `--panel-height`（`styles.css`）: CSS 変数。JS が自動計算しますが手動設定も可能。
- `PANEL_WIDTH` / `PANEL_HEIGHT`（`script.js`）: JS 側で使われる表示サイズ。スライド量はこれに依存します。
- `lockFlip` のロック時間（`script.js` 内の `setTimeout` の遅延）: スライド到着後にフリップを抑える猶予（ms）。
- 画像の `object-fit`（`styles.css` の `.face img`）: 現在は `cover`、`contain` に変えるとトリミング挙動が変わります。
- 表示パディング比（現在は幅/高さともに最大 90%）: `updatePanelSizeFromImages()` 内の `maxW` / `maxH` を変更して調整。
- 初期パネル（`current` の初期値）: 最初に表示するパネルを変えたい場合は `current` の値を変更します。
- 画像命名規則: `img_<PANEL><0|1>.png`（例: `img_A0.png`, `img_A1.png`）。必要なら命名ルールをデータ属性に変更できます。

## 汎用化・拡張案

- 動的パネル生成: `.panel` を動的に生成し `data-*` 属性でメタを持たせると任意枚数に対応可能。
- クラス化: コードを `PanelScroller` クラスにまとめ、オプションとして閾値・時間・レスポンシブ設定を渡すと再利用しやすくなります。
- Web Component / React ラッパー: カスタム要素化やフレームワークラッパーで導入が容易になります。
- 速度ベース遷移: 距離ベースだけでなくスワイプ速度や慣性を用いると UX が向上します。

## アクセシビリティ

- 現在は矢印キーでの操作をサポートしています。必要に応じて `aria-live` や `aria-hidden` の更新、フォーカス管理を追加してください。

## パフォーマンス注意点

- `will-change: transform` は必要最小限の要素に適用してください。大量の高解像度画像はあらかじめ最適化（圧縮、WebP）してください。

## テスト／ローカルでの確認手順

1. `myPage/index.html` をブラウザで開きます（ローカルファイルで OK）。
2. 画像が揃っていない場合はプレースホルダ SVG があるので即確認できます。

---

必要ならこの README にコード抜粋やパラメータのサンプル変更例を追加します。以下に「コード抜粋」「設定例」「スクリーンショット挿入手順」を追加しました。

## iOS（Safari）特有の注意点と対策（要点）

モバイルでの挙動確認をするとき、特に iOS（Safari）はネイティブのスクロールやバウンス（オーバースクロール）、イベントハンドラのデフォルト動作の扱いで挙動差が出やすいです。以下は「何が起きる可能性があるか」と「どのファイルのどの箇所を対策すべきか」をまとめたものです。実装はここでは行わず、対策の場所とサンプルコードを示します。

- 問題: ネイティブ縦スクロールとスクリプトのタッチ処理が競合する
  - 影響: スワイプに対してブラウザの通常スクロールが同時に動き、想定のフリップ／スライド判定が発火しない、あるいは不安定になる。
  - 対策（修正箇所）: `myPage/script.js` の `touchmove` ハンドラ内で `e.preventDefault()` を呼ぶ（ハンドラは既に `{passive:false}` で登録されているため、preventDefault が効きます）。

  サンプル（README に掲載するだけの例）:

  ```js
  // myPage/script.js の touchmove 内に追加
  window.addEventListener('touchmove', e => {
    if (touchStartY === null) return;
    // ネイティブのスクロールを抑止してジェスチャを完全に制御する
    e.preventDefault();
    // ...既存の処理（delta 計算等）...
  }, {passive:false});
  ```

- 問題: iOS のバウンス（オーバースクロール）やスクロールチェイン
  - 影響: ページ全体がスクロール可能な場合、トップ/ボトム到達時のゴム引っ張り（bounce）によって UX が乱れる。特に body に余白や縦方向の余地があると発生しやすい。
  - 対策（修正箇所）: `styles.css` の `.viewport` や `html,body` に `overscroll-behavior` / `touch-action` を追加、または body のスクロールを抑える（例: `overflow:hidden`）運用を検討します。

  サンプル（README に掲載するだけの例）:

  ```css
  /* myPage/styles.css に追記する想定（ここでは README に例示のみ） */
  .viewport {
    touch-action: none;         /* 対応ブラウザでタッチの既定挙動を無効化 */
    overscroll-behavior: none;  /* スクロールのチェインやバウンスを抑制 */
  }
  ```

- 問題: `touch-action` サポート差と古い iOS の挙動
  - 影響: すべての iOS バージョンで `touch-action` が効くわけではないため、JS 側で明示的に `preventDefault()` を呼ぶ保険が必要。
  - 対策（修正箇所）: `touchmove` での `e.preventDefault()` と、必要なら `pointer` イベントの導入を検討（`pointerdown`/`pointermove`/`pointerup` を使うと統一的に扱えるブラウザが増えています）。

- 問題: ページ全体のスクロール可否
  - 影響: `body` がスクロール可能だと、パネル内のタッチ操作がページスクロールに奪われます。
  - 対策（運用/修正箇所）: テスト時は `body` のスクロールを無効にして（例: `html,body{height:100%; overflow:hidden}`）、コントロールベースで動作を確認するか、`.viewport` に限定して touch イベントをハンドルする設計にします。

テスト推奨手順（iOS）:

- iOS 実機（Safari）で `myPage/index.html` を開いて次を確認してください:
  1. 画面をスワイプして表→裏→スライド の一連動作が期待通り走るか
  2. スワイプ時にページ全体がスクロールしないか（ゴムバウンスが起きないか）
  3. 端末を傾けたとき（回転）に `resize` ハンドラで閾値と表示サイズが再計算されるか

---

このセクションは実装変更を行わず「どの問題があり得るか」と「どこを変更すればよいか（ファイル名と該当箇所の例）」を示しています。実際のパッチ適用をご希望なら、私が `script.js` と `styles.css` に上記の小修正を入れるパッチを作成して適用できます。

## コード抜粋（サンプル）

## macOS（デスクトップ）での注意点と対策

macOS（Safari / Chrome / Firefox）では、トラックパッドやホイール固有の入力特性に起因して動作差が出ることがあります。以下は「起きやすい事象」と「どのファイルのどの箇所を調整すればよいか」のガイドです。実装はここでは行わず、対策箇所とサンプルを示します。

- 問題: トラックパッドの慣性（モーメンタム）による連続的な `wheel` イベント
  - 影響: 2 本指フリックなどで慣性により小さな `wheel` イベントが多数発生し、累積判定で想定外に早く発火したり複数回発火する事がある。
  - 対策（修正箇所）: `myPage/script.js` の `wheel` ハンドラで `e.deltaMode` を正規化し、必要なら「時間窓（タイムウィンドウ）での合算」や「速度（px/ms）判定」を組み合わせる。

  サンプル（README に掲載するだけの例）:

  ```js
  // wheel.deltaMode の正規化（myPage/script.js の wheel イベントで）
  window.addEventListener('wheel', e => {
    e.preventDefault();
    let dy = e.deltaY;
    // deltaMode: 0=pixel, 1=line, 2=page
    if (e.deltaMode === 1) dy *= 16;               // 行単位をピクセル換算 (目安)
    else if (e.deltaMode === 2) dy *= window.innerHeight; // page 単位を換算
    handleDelta(dy);
  }, {passive:false});
  ```

- 問題: 入力デバイスの多様性（トラックパッド / マウス / 外部デバイス）
  - 影響: マウスホイールは段差のある大きな値、トラックパッドは小刻みな値が多いなど感度差がある。
  - 対策: README の調整例として `FLIP_THRESHOLD` / `SLIDE_THRESHOLD` を環境に応じて微調整する案を提示（例: 小型ノートは閾値を下げる、外付けマウスが多い環境は上げる）。

- 問題: 慣性（momentum）制御
  - 対策（検討箇所）: 短時間（例: 150ms）内の合計移動量を評価する「時間窓」や、最近 N イベントの速度（px / ms）を使って閾値を補正する設計。実装例は README にはアイデアのみ掲載。

- 問題: キーボード操作の追加
  - 影響: デスクトップでは `PageUp`/`PageDown`/`Space` を使うユーザーもいるため追加すると親切。
  - 対策（修正箇所）: `myPage/script.js` の `keydown` ハンドラに追加（サンプルを README に掲載）。

  サンプル（README に掲載するだけの例）:

  ```js
  // キーボード追加サンプル
  window.addEventListener('keydown', e => {
    if (e.key === 'PageDown') { slideTo(current+1); }
    else if (e.key === 'PageUp') { slideTo(current-1); }
    else if (e.key === ' ') { slideTo(current+1); }
  });
  ```

- 問題: 高解像度ディスプレイ（Retina）と画像サイズ
  - 影響: `naturalWidth`/`naturalHeight` と表示解像度の差が大きい場合、画像読み込みや描画に時間がかかることがある。
  - 対策: README に「推奨画像出力サイズ」と「最適化（圧縮／WebP）を行うこと」を明記。

テスト推奨手順（macOS）:

- Trackpad（Safari / Chrome）で軽いスワイプ・強いフリック・慣性スワイプを試す。
- Mouse wheel（外付けホイール）でのカリカリ回転や少しずつ動かす操作を試す。
- ブラウザ（Safari / Chrome / Firefox）での挙動差を確認する。
- ウィンドウリサイズやフルスクリーンの切替で `resize` ハンドラと再計算が正しく働くか確認する。

---

この節も README 上のガイドであり、実装変更は行っていません。必要なら私が `wheel.deltaMode` 正規化や簡易モーメンタム対策、追加キーボード対応のパッチを作成します。

### JavaScript（閾値・時間の定義）

```js
// script.js の一部。必要に応じて値を変更してください。
const FLIP_TIME = 200;       // ミリ秒（片側）
const SLIDE_TIME = 500;      // ミリ秒（パネル間スライド）

// 閾値はウィンドウ高さの割合で計算されます（初期化時と resize で再計算）
let FLIP_THRESHOLD = window.innerHeight * 0.2;
let SLIDE_THRESHOLD = window.innerHeight * 0.8;

function flipToBack(panelEl) {
  const front = panelEl.querySelector('.face.front');
  const back  = panelEl.querySelector('.face.back');
  // 横中央を基準に縮める（scaleX）→切替→拡大
  front.style.transition = `transform ${FLIP_TIME}ms ease`;
  back.style.transition  = `transform ${FLIP_TIME}ms ease`;
  front.style.transform = 'translateX(-50%) scaleX(0)';
  setTimeout(() => {
    front.style.transform = 'translateX(-50%) scaleX(1)';
    back.style.transform  = 'translateX(-50%) scaleX(0)';
    // バック側を表示するためのスタイル調整はここで行います
  }, FLIP_TIME);
}
```

### CSS（主要変数）

```css
:root {
  --panel-width: 600px;   /* JS が自動設定しますが手動でも上書き可能 */
  --panel-height: 600px;
}
.viewport { max-width: 100%; }
.panel { height: var(--panel-height); }
.face { left: 50%; transform: translateX(-50%) scaleX(1); }
```

## 設定例（すぐに試せる変更）

- FLIP の時間を速くしたい（よりキビキビ）

```js
// script.js の先頭で
const FLIP_TIME = 120; // 200 -> 120ms
```

- スライドをゆっくり見せたい

```js
const SLIDE_TIME = 800; // 500 -> 800ms
```

- CSS 側でパネルの最大表示幅を手動指定したい

```css
:root { --panel-width: 800px; --panel-height: 600px; }
```

変更後はブラウザで `myPage/index.html` を再読み込みしてください。ウィンドウサイズに応じた自動計算（JS 実行時）を優先する場合は CSS 変数を削除してください。
