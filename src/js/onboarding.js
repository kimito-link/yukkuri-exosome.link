/**
 * Onboarding（初回起動の追体験ツアー）
 *
 * 5スライド構成で、なにができるかを体感してもらう。
 * - タップ / スワイプ / ドット / 矢印キー で移動
 * - 右上スキップ・Esc でいつでも終了
 * - localStorage に versioned key で完了フラグ保存
 */

const ONB_KEY = 'onboarding_done_v1';

/** スライド定義（depth指定でパス調整が必要なため関数で返す） */
function getOnboardingSlides(depth = 0) {
    const base = getBasePath(depth);
    return [
        // ───────────────────────────────────────
        // Slide 1: Welcome
        // ───────────────────────────────────────
        {
            id: 'welcome',
            chip: 'Welcome',
            visual: 'trio',
            content: `
                <div class="onboarding__brand">
                    <img class="onboarding__brand-logo" src="${base}images/kimito-link-logo/logo_kimito-link_RGB_color.png" alt="Kimito-Link" onerror="this.style.display='none'">
                    <div class="onboarding__brand-sub">Presents</div>
                </div>
                <h2 class="onboarding__title">ようこそ、<br><em>ゆっくりエクソソーム</em>へ</h2>
                <p class="onboarding__desc">
                    <strong>りんく・こん太・たぬ姉</strong>と一緒に、<br>
                    エクソソームと向き合う毎日を、<br>
                    やさしく記録していくアプリです。
                </p>
            `
        },
        // ───────────────────────────────────────
        // Slide 2: Body Signal Map（コア体験）
        // ───────────────────────────────────────
        {
            id: 'bodymap',
            chip: 'Body Signal Map',
            visual: 'bodymap-mini',
            content: `
                <h2 class="onboarding__title">あなたの体内エクソソームを、<br><em>見える化</em></h2>
                <p class="onboarding__desc">
                    髪・肌・目元・循環・腸・筋肉。<br>
                    6つの部位それぞれに、<br>
                    エクソソームが流れています。
                </p>
                <ul class="onboarding__features">
                    <li>毎日のケアで、対応する部位が光ります</li>
                    <li>今日の自分の状態が、ひと目でわかる</li>
                    <li>続けるほど、活性度がアップ</li>
                </ul>
            `
        },
        // ───────────────────────────────────────
        // Slide 3: Daily Check（肌・疲労）★NEW
        // ───────────────────────────────────────
        {
            id: 'daily-check',
            chip: 'Daily Check',
            visual: 'hero',
            char: 'rink',
            haloClass: '',
            content: `
                <h2 class="onboarding__title">毎日の<em>肌</em>と<em>疲労</em>を、<br>10段階で記録</h2>
                <p class="onboarding__desc">
                    点滴やサプリの効果を「体感」で見える化。<br>
                    業界標準のスケールで、ブレずに記録できます。
                </p>
                <ul class="onboarding__features">
                    <li>肌セルフチェック（ハリ・透明感・うるおいなど5項目）</li>
                    <li>疲労回復度（睡眠・エネルギー・集中力など5項目）</li>
                    <li>1〜10の各スコアに具体例ガイド付きで迷わない</li>
                </ul>
            `
        },
        // ───────────────────────────────────────
        // Slide 4: Boost（点滴・サプリ）
        // ───────────────────────────────────────
        {
            id: 'boost',
            chip: 'Boost',
            visual: 'hero',
            char: 'tanunee',
            haloClass: 'onboarding__halo--brown',
            content: `
                <h2 class="onboarding__title">点滴・サプリも、<br><em>一緒に記録</em></h2>
                <p class="onboarding__desc">
                    クリニックで受けた施術や、<br>
                    NMN・コラーゲンなどのサプリも、<br>
                    タップひとつで記録できます。
                </p>
                <ul class="onboarding__features">
                    <li>エクソソーム点滴・上清液・NMN点滴など16種</li>
                    <li>NMN系には、特別なミトコンドリア演出</li>
                    <li>取った日と肌・疲労の変化が並べて見える</li>
                </ul>
            `
        },
        // ───────────────────────────────────────
        // Slide 5: Memo + Photo Log（質問メモ・写真）★NEW
        // ───────────────────────────────────────
        {
            id: 'memo-photo',
            chip: 'Memo & Photo',
            visual: 'hero',
            char: 'konta',
            haloClass: 'onboarding__halo--gold',
            content: `
                <h2 class="onboarding__title">通院前後の<em>記録</em>も、<br>このアプリで</h2>
                <p class="onboarding__desc">
                    次回先生に聞きたいことを忘れない。<br>
                    自分の変化を写真で残せる。<br>
                    全部、端末内だけで完結します。
                </p>
                <ul class="onboarding__features">
                    <li>📅 次回の点滴・サプリ予定をカウントダウン</li>
                    <li>💬 先生への質問メモ（画面ごとお見せできます）</li>
                    <li>📸 ビフォーアフター写真記録（端末内のみ）</li>
                </ul>
            `
        },
        // ───────────────────────────────────────
        // Slide 6: Start
        // ───────────────────────────────────────
        {
            id: 'start',
            chip: 'Begin',
            visual: 'trio',
            content: `
                <h2 class="onboarding__title">さあ、<br><em>はじめましょう</em></h2>
                <p class="onboarding__desc">
                    最初の一歩は、<br>
                    今日の体内マップを開くだけ。<br>
                    3人組が、いつでも見守っています。
                </p>
                <ul class="onboarding__features">
                    <li>無料・ログイン不要・端末内で完結</li>
                    <li>通知をオンにすると、毎日呼んでくれます</li>
                    <li>続けるほど、3人と仲よくなれます</li>
                </ul>
            `
        }
    ];
}

/** 完了フラグ確認 */
function isOnboardingDone() {
    return YEStorage.get(ONB_KEY, false) === true;
}

/** 完了フラグ保存 */
function markOnboardingDone() {
    YEStorage.set(ONB_KEY, true);
}

/** 完了フラグリセット（Me画面から呼ぶ用） */
function resetOnboarding() {
    YEStorage.remove(ONB_KEY);
}

/**
 * オンボーディングを表示
 * @param {number} depth - ルートからの階層
 * @param {Function} onDone - 終了時のコールバック
 */
function showOnboarding(depth = 0, onDone = null) {
    const slides = getOnboardingSlides(depth);
    let currentIndex = 0;

    // ルート要素を作る
    const root = document.createElement('div');
    root.className = 'onboarding';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'ゆっくりエクソソームの紹介');

    // 粒子背景
    const particles = document.createElement('div');
    particles.className = 'onboarding__particles';
    particles.innerHTML = '<span class="onboarding__particle"></span>'.repeat(5);
    root.appendChild(particles);

    // ヘッダー（スキップ）
    const header = document.createElement('div');
    header.className = 'onboarding__header';
    header.innerHTML = `
        <button class="onboarding__skip" type="button" aria-label="オンボーディングをスキップ">
            スキップ
        </button>
    `;
    root.appendChild(header);

    // スライドコンテナ
    const slidesEl = document.createElement('div');
    slidesEl.className = 'onboarding__slides';
    slides.forEach((slide, i) => {
        const slideEl = document.createElement('article');
        slideEl.className = 'onboarding__slide';
        slideEl.dataset.id = slide.id;
        if (i === 0) slideEl.classList.add('is-active');

        // ビジュアル部分
        let visualHtml = '';
        if (slide.visual === 'trio') {
            visualHtml = `
                <div class="onboarding__visual">
                    <div class="onboarding__trio">
                        <div class="onboarding__trio-member">
                            <img src="${getImagePath('rink', 'smileOpen', depth)}" alt="りんく">
                        </div>
                        <div class="onboarding__trio-member onboarding__trio-member--middle">
                            <img src="${getImagePath('konta', 'smileOpen', depth)}" alt="こん太">
                        </div>
                        <div class="onboarding__trio-member">
                            <img src="${getImagePath('tanunee', 'smileOpen', depth)}" alt="たぬ姉">
                        </div>
                    </div>
                </div>
            `;
        } else if (slide.visual === 'hero') {
            visualHtml = `
                <div class="onboarding__visual">
                    <div class="onboarding__hero">
                        <div class="onboarding__halo ${slide.haloClass || ''}"></div>
                        <div class="onboarding__hero-char">
                            <img src="${getImagePath(slide.char, 'smileOpen', depth)}" alt="${CHARACTERS[slide.char].name}">
                        </div>
                    </div>
                </div>
            `;
        } else if (slide.visual === 'bodymap-mini') {
            // 体内マップのミニプレビュー（実物と同じ構造の縮小版）
            const regions = [
                { id: 'hair',        emoji: '💆', label: '髪',   active: true },
                { id: 'face',        emoji: '✨', label: '美肌', active: true },
                { id: 'eyes',        emoji: '😴', label: '目元', active: false },
                { id: 'circulation', emoji: '💧', label: '循環', active: true },
                { id: 'body',        emoji: '🥗', label: '腸内', active: false },
                { id: 'limbs',       emoji: '🏃', label: '筋肉', active: false }
            ];
            const positions = {
                hair:        { top: '8%',  left: '50%' },
                face:        { top: '22%', left: '18%' },
                eyes:        { top: '22%', left: '82%' },
                circulation: { top: '70%', left: '12%' },
                body:        { top: '92%', left: '50%' },
                limbs:       { top: '70%', left: '88%' }
            };
            const svgPos = {
                hair:        { x: 50, y: 8  },
                face:        { x: 18, y: 22 },
                eyes:        { x: 82, y: 22 },
                circulation: { x: 12, y: 70 },
                body:        { x: 50, y: 92 },
                limbs:       { x: 88, y: 70 }
            };
            visualHtml = `
                <div class="onboarding__visual onboarding__visual--bodymap">
                    <div class="charmap charmap--mini">
                        <div class="charmap__halo"></div>
                        <svg class="charmap__lines" viewBox="0 0 100 100" preserveAspectRatio="none">
                            ${regions.map(r => `<line class="charmap__line ${r.active ? 'is-active' : ''} charmap__point--${r.id}" x1="50" y1="50" x2="${svgPos[r.id].x}" y2="${svgPos[r.id].y}"/>`).join('')}
                        </svg>
                        <div class="charmap__ring"></div>
                        <div class="charmap__face">
                            <img src="${getImagePath('rink', 'smileOpen', depth)}" alt="りんく">
                        </div>
                        ${regions.map(r => `
                            <div class="charmap__point charmap__point--${r.id} ${r.active ? 'is-active' : ''}" style="top:${positions[r.id].top}; left:${positions[r.id].left};">
                                <div class="charmap__point-bubble">
                                    ${r.emoji}
                                    <span class="charmap__point-spark">✨</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        slideEl.innerHTML = `
            ${visualHtml}
            <div class="onboarding__chip">${slide.chip}</div>
            ${slide.content}
        `;
        slidesEl.appendChild(slideEl);
    });
    root.appendChild(slidesEl);

    // タップヒント（最初のスライドのみ）
    const tapHint = document.createElement('div');
    tapHint.className = 'onboarding__tap-hint';
    tapHint.textContent = 'タップで次へ';
    root.appendChild(tapHint);

    // フッター（ドット + CTA）
    const footer = document.createElement('div');
    footer.className = 'onboarding__footer';
    footer.innerHTML = `
        <div class="onboarding__dots" role="tablist">
            ${slides.map((_, i) => `
                <button class="onboarding__dot ${i === 0 ? 'is-active' : ''}"
                        data-index="${i}"
                        role="tab"
                        aria-label="スライド ${i + 1} / ${slides.length}"></button>
            `).join('')}
        </div>
        <button class="onboarding__cta" type="button">
            <span class="onboarding__cta-label">次へ</span>
            <span class="onboarding__cta-arrow">→</span>
        </button>
    `;
    root.appendChild(footer);

    document.body.appendChild(root);
    document.body.style.overflow = 'hidden';

    // ───────────────────────────────────────
    // 操作ロジック
    // ───────────────────────────────────────

    const slideEls = root.querySelectorAll('.onboarding__slide');
    const dotEls = root.querySelectorAll('.onboarding__dot');
    const skipBtn = root.querySelector('.onboarding__skip');
    const ctaBtn = root.querySelector('.onboarding__cta');
    const ctaLabel = root.querySelector('.onboarding__cta-label');
    const ctaArrow = root.querySelector('.onboarding__cta-arrow');

    function updateSlide(newIndex) {
        if (newIndex < 0 || newIndex >= slides.length) return;

        slideEls.forEach((el, i) => {
            el.classList.remove('is-active', 'is-prev');
            if (i === newIndex) el.classList.add('is-active');
            else if (i < newIndex) el.classList.add('is-prev');
        });

        dotEls.forEach((el, i) => {
            el.classList.toggle('is-active', i === newIndex);
        });

        // 最終スライドではスキップ非表示・CTA文言変更
        const isLast = newIndex === slides.length - 1;
        skipBtn.hidden = isLast;
        ctaLabel.textContent = isLast ? 'はじめる' : '次へ';
        ctaArrow.textContent = isLast ? '✨' : '→';

        // タップヒントは最初のスライドだけ
        tapHint.style.display = newIndex === 0 ? '' : 'none';

        currentIndex = newIndex;
    }

    function advance() {
        if (currentIndex < slides.length - 1) {
            updateSlide(currentIndex + 1);
        } else {
            finish();
        }
    }

    function back() {
        if (currentIndex > 0) updateSlide(currentIndex - 1);
    }

    function finish() {
        markOnboardingDone();
        root.classList.add('is-leaving');
        document.body.style.overflow = '';
        setTimeout(() => {
            root.remove();
            if (typeof onDone === 'function') onDone();
        }, 400);
    }

    // CTA
    ctaBtn.addEventListener('click', e => {
        e.stopPropagation();
        advance();
    });

    // スキップ
    skipBtn.addEventListener('click', e => {
        e.stopPropagation();
        finish();
    });

    // ドット
    dotEls.forEach(dot => {
        dot.addEventListener('click', e => {
            e.stopPropagation();
            const idx = parseInt(dot.dataset.index, 10);
            updateSlide(idx);
        });
    });

    // 画面のどこをタップしても次に進む
    // （スキップ/ドット/CTAは stopPropagation で除外済み）
    root.addEventListener('click', e => {
        // テキスト選択中などはスキップ
        const selection = window.getSelection ? window.getSelection().toString() : '';
        if (selection && selection.length > 0) return;
        advance();
    });

    // スワイプ（タップとの誤判定を防ぐため移動量で判定）
    let touchStartX = null;
    let touchStartY = null;
    let touchMoved = false;
    slidesEl.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchMoved = false;
    }, { passive: true });
    slidesEl.addEventListener('touchmove', e => {
        if (touchStartX == null) return;
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) touchMoved = true;
    }, { passive: true });
    slidesEl.addEventListener('touchend', e => {
        if (touchStartX == null) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const THRESHOLD = 50;
        // スワイプの場合のみ進む/戻る、タップは click イベントに任せる
        if (touchMoved) {
            if (dx < -THRESHOLD) advance();
            else if (dx > THRESHOLD) back();
        }
        touchStartX = null;
        touchStartY = null;
    }, { passive: true });

    // キーボード
    function onKey(e) {
        if (e.key === 'ArrowRight' || e.key === 'Enter') advance();
        else if (e.key === 'ArrowLeft') back();
        else if (e.key === 'Escape') finish();
    }
    document.addEventListener('keydown', onKey);
    root.addEventListener('remove', () => {
        document.removeEventListener('keydown', onKey);
    });

    // 90秒の安全タイムアウト（万一操作不能になっても閉じる）
    const safetyTimer = setTimeout(finish, 180000); // 3分
    root.addEventListener('animationend', () => clearTimeout(safetyTimer));
}

/** 初回起動時の自動表示 */
function autoShowOnboardingIfNeeded(depth = 0) {
    if (isOnboardingDone()) return false;
    // すこし遅らせて、アプリシェルが先に見える状態でから出す
    setTimeout(() => showOnboarding(depth), 100);
    return true;
}
