/**
 * 共通スクリプト - 全ページで読み込む
 */

// キャラクター情報
const CHARACTERS = {
    rink: {
        name: 'りんく',
        nameRomaji: 'rink',
        color: '#ff8fa3',
        role: 'ムードメーカー（食事・生活担当）',
        firstPerson: 'ボク',
        ending: 'なのだ',
        images: {
            normal: 'images/characters/link/link-yukkuri-normal-mouth-closed.png',
            smile: 'images/characters/link/link-yukkuri-smile-mouth-closed.png',
            smileOpen: 'images/characters/link/link-yukkuri-smile-mouth-open.png',
            blink: 'images/characters/link/link-yukkuri-blink-mouth-closed.png',
            half: 'images/characters/link/link-yukkuri-half-eyes-mouth-closed.png',
            halfOpen: 'images/characters/link/link-yukkuri-half-eyes-mouth-open.png',
            open: 'images/characters/link/link-yukkuri-normal-mouth-open.png'
        }
    },
    konta: {
        name: 'こん太',
        nameRomaji: 'konta',
        color: '#ffb347',
        role: '元気いっぱい（運動・健康担当）',
        firstPerson: 'ボク',
        ending: 'だよ',
        images: {
            normal: 'images/characters/konta/kitsune-yukkuri-normal.png',
            smile: 'images/characters/konta/kitsune-yukkuri-smile-mouth-closed.png',
            smileOpen: 'images/characters/konta/kitsune-yukkuri-smile-mouth-open.png',
            blink: 'images/characters/konta/kitsune-yukkuri-blink-mouth-closed.png',
            half: 'images/characters/konta/kitsune-yukkuri-half-eyes-mouth-closed.png',
            halfOpen: 'images/characters/konta/kitsune-yukkuri-half-eyes-mouth-open.png',
            open: 'images/characters/konta/kitsune-yukkuri-mouth-open.png'
        }
    },
    tanunee: {
        name: 'たぬ姉',
        nameRomaji: 'tanunee',
        color: '#c19a6b',
        role: '世話焼き（先生役・解説担当）',
        firstPerson: 'わたし',
        ending: 'よ',
        images: {
            normal: 'images/characters/tanunee/tanuki-yukkuri-normal-mouth-closed.png',
            smile: 'images/characters/tanunee/tanuki-yukkuri-smile-mouth-closed.png',
            smileOpen: 'images/characters/tanunee/tanuki-yukkuri-smile-mouth-open.png',
            blink: 'images/characters/tanunee/tanuki-yukkuri-blink-mouth-closed.png',
            half: 'images/characters/tanunee/tanuki-yukkuri-half-eyes-mouth-closed.png',
            halfOpen: 'images/characters/tanunee/tanuki-yukkuri-half-eyes-mouth-open.png',
            open: 'images/characters/tanunee/tanuki-yukkuri-normal-mouth-open.png'
        }
    }
};

/**
 * パスのプレフィックス取得（サブディレクトリ対応）
 * @param {number} depth - 階層の深さ（ルート=0、basics/xxx=2）
 */
function getBasePath(depth = 0) {
    return '../'.repeat(depth);
}

/**
 * 画像パスをプレフィックス付きで返す
 */
function getImagePath(charKey, expression, depth = 0) {
    const path = CHARACTERS[charKey]?.images?.[expression] || CHARACTERS[charKey]?.images?.normal;
    return getBasePath(depth) + path;
}

/**
 * キャラ画像。表示幅に合わせた WebP（360 / 720）を優先し、非対応時は PNG。
 * width は CSS ピクセルの表示サイズ。sizes に使う。
 */
function characterPicture(src, opt) {
    opt = opt || {};
    const alt = String(opt.alt || '').replace(/"/g, '&quot;');
    const w = opt.width || 120;
    const h = opt.height || w;
    const cls = opt.className ? ` class="${opt.className}"` : '';
    const extra = opt.extra ? ` ${opt.extra}` : '';
    const stem = String(src).replace(/\.png$/i, '');
    const decoding = /decoding=/.test(extra) ? '' : ' decoding="async"';
    return `<picture class="ye-pic"><source type="image/webp" srcset="${stem}-360.webp 360w, ${stem}-720.webp 720w" sizes="${w}px"><img src="${src}" alt="${alt}" width="${w}" height="${h}"${cls}${decoding}${extra}></picture>`;
}

/**
 * 現在の日付（YYYY-MM-DD）
 */
function getTodayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * 日付フォーマット（M月D日(曜)）
 */
function formatDateJp(date = new Date()) {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const w = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return `${m}月${d}日（${w}）`;
}

/**
 * ★ゲストのまま書いてよいキー（記録・個人データではないもの）。
 *   これ以外のキーはゲストでは書けず、ログインを求める（fail-closed）。
 *   設計書 DESIGN-kimito-family-prepaint-auth-mode-2026-09-29.md の関所（C-4）実装。
 *   - auth_signed_in: auth.js が持つ認証フラグ自体。書けないとログインが成立しない。
 *   - onboarding_done_v1: オンボーディング既読フラグ（onboarding.js の ONB_KEY）。
 *   - ref_partner: 紹介コード（refpartner.js）。記録ではなく流入元トラッキング。
 */
const YE_GUEST_ALLOWED_KEYS = ['auth_signed_in', 'onboarding_done_v1', 'ref_partner'];

/**
 * 今の認証モードが member か（<html data-auth="member"> かどうか）。
 * auth-mode.js 読込前でも安全に呼べるよう、DOM 属性を直接見る。
 */
function yeIsMemberMode() {
    return document.documentElement.getAttribute('data-auth') === 'member';
}

/**
 * LocalStorage ヘルパー
 */
const YEStorage = {
    get(key, defaultValue = null) {
        try {
            const raw = localStorage.getItem(`ye_${key}`);
            return raw ? JSON.parse(raw) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    },
    /**
     * ★関所: ゲストは YE_GUEST_ALLOWED_KEYS 以外のキーを書けない。
     *   書こうとしたら YEAuth.openSignIn() を呼び、保存はしない（false を返す）。
     *   新しいモジュールがキーを追加しても、ここを通る限り自動的に守られる。
     */
    set(key, value) {
        if (!yeIsMemberMode() && YE_GUEST_ALLOWED_KEYS.indexOf(key) === -1) {
            if (typeof YEAuth !== 'undefined' && YEAuth.openSignIn) YEAuth.openSignIn();
            return false;
        }
        try {
            localStorage.setItem(`ye_${key}`, JSON.stringify(value));
            return true;
        } catch (e) {
            return false;
        }
    },
    remove(key) {
        try {
            localStorage.removeItem(`ye_${key}`);
        } catch (e) {}
    }
};

/**
 * 配列からランダム1要素
 */
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 配列をシャッフル（破壊的でない）
 */
function shuffle(arr) {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * kimito.link 系サービス共通の「運営表記＋法務リンク」（kimito-legal-footer.js）を出す。
 * ★部品は web-ios-android/templates/web/legal-footer/ の無改変コピー（kit の check-drift で同期を見張る）。
 *   サービス固有の値はここの opts だけ。利用規約ページは未作成なので privacy だけ渡す
 *   （ページを作ったら terms を足す。存在しないページへのリンクは出さない）。
 * ★出す場所は2つだけ: injectChrome のフッター（情報ページ全部）と、Me 画面（アプリ内の入口）。
 *   アプリ画面の全タブの下に出すとタブバーと競合するため、各タブには出さない。
 * ★何度呼んでも1つだけ（部品が冪等）。読み込みに失敗してもページ本体は壊さない。
 */
function mountLegalFooter(depth = 0) {
    const opts = { serviceName: 'ゆっくりエクソソーム', privacy: '/privacy/' };
    if (window.KimitoLegalFooter) {
        window.KimitoLegalFooter.mount(opts);
        return;
    }
    const s = document.createElement('script');
    s.async = true;
    s.src = getBasePath(depth) + 'js/kimito-legal-footer.js';
    s.dataset.serviceName = opts.serviceName;
    s.dataset.privacy = opts.privacy;
    // currentScript が取れない環境の保険。mount は冪等。
    s.onload = () => {
        if (window.KimitoLegalFooter) window.KimitoLegalFooter.mount(opts);
    };
    document.head.appendChild(s);
}

/**
 * ヘッダー/フッターを挿入
 */
function injectChrome(depth = 0) {
    const base = getBasePath(depth);
    const header = document.querySelector('[data-header]');
    if (header && !header.innerHTML.trim()) {
        header.innerHTML = `
            <header class="site-header">
                <div class="site-header__inner">
                    <a href="${base}" class="site-logo">
                        <span class="site-logo__icon">🧬</span>
                        <span>ゆっくりエクソソーム</span>
                    </a>
                    <nav>
                        <ul class="site-nav">
                            <li><a href="${base}#articles">記事</a></li>
                            <li><a href="${base}#apps">仕掛け</a></li>
                            <li><a href="${base}characters/">キャラ</a></li>
                            <li><a href="${base}about/">サイトについて</a></li>
                        </ul>
                    </nav>
                    <a href="https://kimito-link.com/" target="_blank" rel="noopener" class="site-header__sister" title="キミトリンクプロジェクト（ブランド）">
                        <img src="${base}images/kimito-link-logo/logo_kimito-link_RGB_maru_blue.png" alt="Kimito-Link" loading="lazy">
                    </a>
                </div>
            </header>
        `;
    }

    const footer = document.querySelector('[data-footer]');
    if (footer && !footer.innerHTML.trim()) {
        footer.innerHTML = `
            <footer class="site-footer">
                <div class="site-footer__inner">
                    <div class="site-footer__sister">
                        <a href="https://kimito-link.com/" target="_blank" rel="noopener" class="site-footer__sister-link">
                            <img src="${base}images/kimito-link-logo/logo_kimito-link_RGB_color.png" alt="Kimito-Link" width="43" height="32" loading="lazy">
                        </a>
                    </div>
                    <div class="site-footer__disclaimer">
                        <strong>免責事項</strong><br>
                        当サイトは、エクソソームに関する一般的な情報をゆっくり3人組のキャラクターを通じて分かりやすく伝えることを目的とした情報サイトです。掲載内容は公開されている文献や一般的な知見をもとにしていますが、医療行為や診断、治療効果を保証するものではありません。施術や健康に関する個別のご相談は、必ず医療機関にて医師にご確認ください。本サイトは医療広告ガイドラインに配慮し、効果の断定的な表現を避けています。
                    </div>
                    <nav class="site-footer__nav">
                        <a href="${base}">ホーム</a>
                        <a href="${base}characters/">キャラ紹介</a>
                        <a href="${base}about/">サイトについて</a>
                        <a href="${base}glossary/">用語集</a>
                    </nav>
                    <div id="kimito-legal-footer"></div>
                    <div class="site-footer__copyright">
                        © exosome.kimito.link — ゆっくり3人組と学ぶエクソソーム<br>
                        <small>キャラクター提供：<a href="https://kimito-link.com/" target="_blank" rel="noopener">Kimito-Link</a></small>
                    </div>
                </div>
            </footer>
        `;
        mountLegalFooter(depth);
    }
}

/**
 * 会話バブルHTMLを生成
 */
function buildDialogTurn(speaker, text, side = 'left', expression = 'smile', depth = 0) {
    const char = CHARACTERS[speaker];
    if (!char) return '';
    const sideClass = side === 'right' ? 'dialog__turn--right' : '';
    const img = characterPicture(getImagePath(speaker, expression, depth), {
        alt: char.name,
        width: 64,
        height: 64,
        extra: 'loading="lazy"'
    });
    return `
        <div class="dialog__turn dialog__turn--${speaker} ${sideClass}">
            <div class="dialog__avatar">
                ${img}
            </div>
            <div class="dialog__body">
                <div class="dialog__name">${char.name}</div>
                <div class="dialog__bubble">
                    <p>${text}</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * 共通の <head> 要素を挿入（アイコン・OG・マニフェスト）
 * 個別の <title>/<meta description> は各HTMLに記述する想定
 */
function injectHeadMeta(depth = 0) {
    const base = getBasePath(depth);
    const head = document.head;
    if (!head) return;

    const ogImageUrl = `${base}icons/og-image.jpg`;
    const tags = [
        // ファビコン
        `<link rel="icon" type="image/x-icon" href="${base}icons/favicon.ico">`,
        `<link rel="icon" type="image/png" sizes="16x16" href="${base}icons/favicon-16.png">`,
        `<link rel="icon" type="image/png" sizes="32x32" href="${base}icons/favicon-32.png">`,
        `<link rel="icon" type="image/png" sizes="48x48" href="${base}icons/favicon-48.png">`,
        // Apple touch icon
        `<link rel="apple-touch-icon" href="${base}icons/apple-touch-icon.png">`,
        // PWA manifest
        `<link rel="manifest" href="${base}manifest.webmanifest">`,
        // テーマカラー
        `<meta name="theme-color" content="#FFFAF3">`,
        // iOS PWA
        `<meta name="apple-mobile-web-app-capable" content="yes">`,
        `<meta name="apple-mobile-web-app-status-bar-style" content="default">`,
        `<meta name="apple-mobile-web-app-title" content="ゆっくりエクソ">`,
        // OG（汎用）
        `<meta property="og:image" content="${ogImageUrl}">`,
        `<meta property="og:image:width" content="1200">`,
        `<meta property="og:image:height" content="630">`,
        `<meta name="twitter:card" content="summary_large_image">`,
        `<meta name="twitter:image" content="${ogImageUrl}">`,
    ];

    // 重複防止：既に同じものがあれば追加しない
    const wrap = document.createElement('div');
    wrap.innerHTML = tags.join('\n');
    Array.from(wrap.children).forEach(el => {
        // 同じ rel/property/name の既存タグはスキップ
        const sel = el.tagName === 'LINK'
            ? `link[rel="${el.getAttribute('rel')}"][sizes="${el.getAttribute('sizes') || ''}"]`
            : el.hasAttribute('property')
                ? `meta[property="${el.getAttribute('property')}"]`
                : `meta[name="${el.getAttribute('name')}"]`;
        if (!head.querySelector(sel)) {
            head.appendChild(el);
        }
    });
}

/**
 * LINE 友だち追加。
 * 既定のリンク先はページ内の QR（#line-add-qr）。iPhone / Android スマホだけ
 * data-line-href（https://lin.ee/...）に差し替える。
 * iPad やパソコンで lin.ee を開くと、LINE のページが「LINEアプリを開く」（line://）になり、
 * アプリが無いとそこで止まる。QR ならその端末に LINE が無くても追加できる。
 */
function lineAppLikely() {
    var ua = navigator.userAgent || '';
    if (/iPhone|iPod/.test(ua)) return true;
    if (/Android/.test(ua) && /Mobile/.test(ua)) return true;
    return false;
}

function upgradeLineAddLinks() {
    if (!lineAppLikely()) return;
    document.querySelectorAll('[data-line-add]').forEach(function (a) {
        var href = a.getAttribute('data-line-href');
        if (href) a.setAttribute('href', href);
    });
}

// DOM ready
if (typeof window !== 'undefined') {
    // headは即実行で間に合うように
    const depthEarly = parseInt(
        (document.body && document.body.dataset.depth) || '0',
        10
    );
    if (document.head) {
        injectHeadMeta(depthEarly);
    }

    document.addEventListener('DOMContentLoaded', () => {
        const depth = parseInt(document.body.dataset.depth || '0', 10);
        injectChrome(depth);
        injectHeadMeta(depth);
        upgradeLineAddLinks();
        bootYeAppUpdate();
    });
}

/**
 * 画面の更新確認（js/app-update.js）。
 * スクリプトの場所は common.js 自身の URL から決める。
 * body の data-depth は多くのページで未設定なので、それに頼ると /me/js/ を見に行ってしまう。
 */
function bootYeAppUpdate() {
    if (document.querySelector('script[data-ye-app-update]')) return;
    let base = '';
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
        const src = scripts[i].src || '';
        if (/js\/common\.js(\?|$)/.test(src)) {
            base = src.replace(/js\/common\.js(\?.*)?$/, '');
            break;
        }
    }
    if (!base) return;
    const s = document.createElement('script');
    s.src = base + 'js/app-update.js';
    s.defer = true;
    s.setAttribute('data-ye-app-update', '');
    document.head.appendChild(s);
}
