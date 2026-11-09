/**
 * Today（ホーム）画面
 *
 * ★2026-11 の再設計。以前のホームは記録フォームを全部ひらいたまま縦に並べており、
 *   スマホで約11画面ぶんあった。「開いたら何をすればいいか」が見えず、毎日は開きにくい。
 *
 *   いまの形:
 *     1. あいさつ（時間帯と日で変わる3人組のひとこと）＋ 直近14日のあしあと
 *     2. きょうの3つ（からだに合図／ミニ知識／ひとこと）— 30秒で終わる
 *     3. いまの時間におすすめの記録を1つだけ
 *     4. 体内マップ（その場でタップして合図を送れる）
 *     5. きろく（睡眠・肌・疲労回復など）は閉じた行。開いたときにだけ中身を描く
 *     6. 寄り道（読みもの・眺める画面）は小さなタイル
 *
 * ★やらないこと（HANDOFF-20260824.md §5。足したくなっても足さない）:
 *   - 「まだ記録がありません」の催促、途切れたことへの警告、未読バッジ
 *   - 連続日数をいちばん上に置く（1日空くとゼロに戻る数字は置かない。
 *     かわりに「直近14日で何日」。空いても1つ減るだけ）
 *   - 肌スコアの下降の強調、写真のビフォーアフターの自動表示
 *   続けたくなる理由は、失う怖さではなく「明日の1枚」に置く。
 *
 * ★効果・効能を言う文は書かない（.claude/skills/longevity/SKILL.md）。
 *   ここの文言は「記録した」「合図を送った」までで止める。
 */

/* ------------------------------------------------------------------
 * 純粋な関数（DOM に触らない。test/today-screen.test.mjs が直接呼ぶ）
 * ------------------------------------------------------------------ */

/** 時間帯。朝 5–11 / 昼 11–17 / 夕 17–22 / 夜 22–5 */
function todaySlot(hour) {
    if (hour >= 5 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 17) return 'day';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
}

const TODAY_GREETING = {
    morning: { icon: '☀️', text: 'おはよう' },
    day:     { icon: '🌤', text: 'こんにちは' },
    evening: { icon: '🌇', text: 'おかえり' },
    night:   { icon: '🌙', text: 'こんばんは' }
};

/**
 * 3人組のひとこと。キャラ × 時間帯。
 * 口調: りんく=「〜なのだ」／こん太=「〜だよ」／たぬ姉=「〜ね・〜わよ」（友達の距離。講義にしない）
 */
const TODAY_LINES = {
    rink: {
        morning: ['おはようなのだ！まずはお水を一杯、いっしょに飲むのだ。', 'おはようなのだ〜。今日の朝ごはん、何色あったのだ？'],
        day:     ['やっほー！お昼は何色食べたのだ？ボクはきいろなのだ。', '来てくれたのだ！いまの体の調子、ちょっと教えてほしいのだ。'],
        evening: ['おかえりなのだ！今日できたこと、ひとつだけ教えてほしいのだ。', 'おつかれさまなのだ。ボクは今日、いっぱい笑ったのだ。'],
        night:   ['そろそろねむいのだ…。「おやすみ」を押して、いっしょに寝るのだ。', '夜ふかしなのだ？ボクもなのだ。でもそろそろ寝るのだ。']
    },
    konta: {
        morning: ['おはよう！今日は1個だけでいいから、体を動かしてみようよ！', 'おはよう！伸びをひとつ、いっしょにやろうよ！'],
        day:     ['午後はちょっと眠くなる時間だね。立ち上がって伸びをしようよ！', 'お水、飲んでる？ボクはいま飲んだところだよ！'],
        evening: ['今日もおつかれさま！お風呂はぬるめでゆっくりだよ。', 'おかえり！今日はどのくらい歩いた？ちょっとでも花マルだよ！'],
        night:   ['今日もよく動いたね。あとは寝るだけだよ！', 'おやすみ前に、深呼吸をみっつ。いっしょにやろうよ。']
    },
    tanunee: {
        morning: ['おはよう。ゆうべは眠れた？まずは眠りの記録からつけてみてね。', 'おはよう。今日もあなたのペースでいいのよ。'],
        day:     ['ねえ、ちゃんと休憩してる？水分もわすれないでね。', '来てくれてうれしいわ。今日はどんな一日になってる？'],
        evening: ['今日もよくがんばったわね。寝る前に肌の調子だけ、ちょっと見ておかない？', 'おかえりなさい。まずはひと息ついてね。記録はそのあとでいいわよ。'],
        night:   ['もうこんな時間ね。続きは明日にして、今日はもう休みましょ。', '今日もおつかれさま。あなたはじゅうぶんやってるわよ。']
    }
};

const TODAY_DONE_LINES = {
    rink:    'きょうの3つ、ぜんぶできたのだ！あとはのんびりするのだ〜。',
    konta:   'きょうの3つ、コンプリートだよ！また明日もいっしょにやろう！',
    tanunee: 'きょうの3つ、そろったわね。今日はもうじゅうぶんよ。'
};

/** 年始からの通算日（毎日ひとつ進む数字。キャラとセリフの持ち回りに使う） */
function todayDayIndex(date) {
    return Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
}

/**
 * 今日のあいさつ。同じ日・同じ時間帯なら何度開いても同じ人が同じことを言う
 * （開くたびに変わると落ち着かない）。時間帯が変わると人が変わる。
 */
function pickTodayLine(date, allDone) {
    const slot = todaySlot(date.getHours());
    const order = ['rink', 'konta', 'tanunee'];
    const idx = todayDayIndex(date);
    const slotNo = ['morning', 'day', 'evening', 'night'].indexOf(slot);
    const charKey = order[(idx + slotNo) % order.length];
    if (allDone) {
        return { charKey, slot, expression: 'smileOpen', message: TODAY_DONE_LINES[charKey] };
    }
    const lines = TODAY_LINES[charKey][slot];
    return { charKey, slot, expression: 'smile', message: lines[idx % lines.length] };
}

/**
 * 「いまのおすすめ」を1つ選ぶ。
 * state: { sleepPending, sleepDone, fatigueDone, skinDone, mindDone, boostDone }
 * 戻り値: { key, icon, title, desc, action: {type:'section'|'link', target} }
 *
 * ★時間帯の一番手が済んでいたら、まだの記録を順に当てる。
 *   ぜんぶ済んでいたら記録は勧めず、眺める画面へ（催促を続けない）。
 */
function pickNowCard(hour, state) {
    const s = state || {};
    const cards = {
        wake:    { key: 'wake',    icon: '☀️', title: '「おはよう」を押す', desc: 'ゆうべの眠りが記録されるよ', action: { type: 'section', target: 'sleep' } },
        bed:     { key: 'bed',     icon: '🌙', title: '寝る前に「おやすみ」', desc: '枕元でタップするだけ。時計いらず', action: { type: 'section', target: 'sleep' } },
        fatigue: { key: 'fatigue', icon: '🩺', title: 'けさの体の感じを残す', desc: '5つのうち、ひとつだけでもOK', action: { type: 'section', target: 'fatigue' } },
        boost:   { key: 'boost',   icon: '💊', title: '点滴・サプリを記録する', desc: '今日とったものをタップするだけ', action: { type: 'link', target: 'boost/' } },
        skin:    { key: 'skin',    icon: '🪞', title: '肌の調子をひとつ残す', desc: '鏡を見たついでに10段階でタップ', action: { type: 'section', target: 'skin' } },
        mind:    { key: 'mind',    icon: '🌷', title: '今日のうれしかったこと', desc: '誰かと話した、何かを学んだ、をタップ', action: { type: 'section', target: 'mindcare' } },
        look:    { key: 'look',    icon: '🔄', title: '入れ替わりリングを眺める', desc: '今日の記録はそろったよ。あとは眺めるだけ', action: { type: 'link', target: 'turnover/' } }
    };
    const done = {
        wake: !s.sleepPending, bed: !!s.sleepPending, fatigue: !!s.fatigueDone,
        boost: !!s.boostDone, skin: !!s.skinDone, mind: !!s.mindDone
    };
    const slot = todaySlot(hour);
    const orderBySlot = {
        morning: ['wake', 'fatigue', 'skin', 'mind', 'boost'],
        day:     ['wake', 'boost', 'mind', 'fatigue', 'skin'],
        evening: ['skin', 'mind', 'boost', 'fatigue'],
        night:   ['bed', 'skin', 'mind']
    };
    for (const key of orderBySlot[slot]) {
        if (!done[key]) return cards[key];
    }
    return cards.look;
}

/** 直近 n 日のマス目（古い順）。activeKeys は 'YYYY-MM-DD' の配列 */
function buildDayDots(date, activeKeys, n) {
    const set = new Set(activeKeys || []);
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date(date);
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        out.push({ key, day: d.getDate(), active: set.has(key), today: i === 0 });
    }
    return out;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { todaySlot, pickTodayLine, pickNowCard, buildDayDots, todayDayIndex, TODAY_LINES, TODAY_DONE_LINES };
}

/* ------------------------------------------------------------------
 * 画面
 * ------------------------------------------------------------------ */

/** ホームの「からだに合図」で使う短い呼び名（selfcare.js の SELFCARE_ITEMS と同じ id） */
const TODAY_CARE_SHORT = {
    sleep: '7時間ねむる',
    skincare: 'スキンケア',
    hair_care: '頭皮ケア',
    water: '水分 1.5L',
    food: '彩りごはん',
    exercise: '20分うごく'
};

/** きろくの行。render は開いたときに1回だけ呼ぶ */
const TODAY_SECTIONS = [
    { id: 'longevity', icon: '🧬', title: '今週の手ごたえ', mount: 'today-longevity', render: () => renderLongevityScore('today-longevity') },
    { id: 'sleep',     icon: '🛏', title: '睡眠',           mount: 'today-sleep',     render: () => renderSleepLog('today-sleep') },
    { id: 'skin',      icon: '🪞', title: '肌の調子',       mount: 'today-skin',      render: () => renderSkinCheck('today-skin') },
    { id: 'fatigue',   icon: '🩺', title: '疲れの抜けぐあい', mount: 'today-fatigue', render: () => renderFatigueCheck('today-fatigue') },
    { id: 'mindcare',  icon: '🌷', title: '心とつながり',   mount: 'today-mindcare',  render: () => renderMindCare('today-mindcare') },
    { id: 'reminder',  icon: '📅', title: '次回の予定',     mount: 'today-reminder',  render: () => renderNextReminder('today-reminder') },
    { id: 'memo',      icon: '💬', title: '先生に聞きたいこと', mount: 'today-memo',  render: () => renderDoctorMemo('today-memo') },
    { id: 'photo',     icon: '📸', title: '写真で残す',     mount: 'today-photo',     render: () => renderPhotoLog('today-photo').catch((err) => console.error('Photo Log failed:', err)) }
];

const TodayScreen = {
    photoCount: null,

    /** 記録の状態をまとめて読む（読むだけ。書かない） */
    readState() {
        const todayKey = getTodayKey();
        const care = YEStorage.get(`selfcare_${todayKey}`, []) || [];
        const quests = App.getTodayQuests();
        const skin = Object.keys(getTodaySkinScores() || {}).length;
        const fat = Object.keys(getTodayFatigueScores() || {}).length;
        const mind = getTodayMindcare().size;
        const sleepRec = getTodaySleep();
        const sleepPending = !!getPendingSleep();
        const boost = getBoostActiveData();
        return {
            care, quests, skin, fat, mind, sleepRec, sleepPending, boost,
            now: {
                sleepPending,
                sleepDone: !!sleepRec,
                fatigueDone: fat > 0,
                skinDone: skin > 0,
                mindDone: mind > 0,
                boostDone: boost.items.length > 0
            }
        };
    },

    /** きろくの行の右に出す一言。未記録のときは何も出さない（催促にしない） */
    sectionStatus(id, st) {
        switch (id) {
            case 'longevity': {
                const score = calcLongevityScore();
                return score && score.hasAny ? scoreToFeelText(score.total) : '';
            }
            case 'sleep':
                if (st.sleepPending) return 'おやすみ中';
                return st.sleepRec ? fmtDuration(st.sleepRec.minutes) : '';
            case 'skin': return st.skin > 0 ? `${st.skin} / ${SKIN_ITEMS.length}` : '';
            case 'fatigue': return st.fat > 0 ? `${st.fat} / ${FATIGUE_ITEMS.length}` : '';
            case 'mindcare': return st.mind > 0 ? `${st.mind}こ` : '';
            case 'reminder': {
                const r = getNextReminder();
                if (!r || !r.date) return '';
                const diff = daysDiff(r.date);
                if (diff === 0) return '今日';
                return diff > 0 ? `あと${diff}日` : formatReminderDate(r.date);
            }
            case 'memo': {
                const n = getOpenMemoCount();
                return n > 0 ? `${n}件` : '';
            }
            case 'photo': return this.photoCount ? `${this.photoCount}枚` : '';
            default: return '';
        }
    },

    stepsHtml(st) {
        const q = st.quests;
        const steps = [
            {
                done: q.care.done, href: '#today-bodymap', char: 'konta',
                title: 'からだに合図を送る',
                desc: q.care.done ? `${q.care.progress}つ送ったよ` : `下のマップをタップ（${q.care.progress} / 3）`
            },
            {
                done: q.quiz.done, href: 'quiz/', char: 'tanunee',
                title: 'ミニ知識 3問',
                desc: q.quiz.done ? `${q.quiz.correct} / 3 正解` : (q.quiz.progress > 0 ? `つづきから（${q.quiz.progress} / 3）` : '1分でおわるよ')
            },
            {
                done: q.advice.done, href: 'advice/', char: 'rink',
                title: '3人組のひとこと',
                desc: q.advice.done ? '受け取ったよ' : 'タップして受け取る'
            }
        ];
        const doneCount = steps.filter(s => s.done).length;
        const r = 26;
        const c = 2 * Math.PI * r;
        const off = c * (1 - doneCount / steps.length);
        return `
            <section class="t-steps ${doneCount === steps.length ? 't-steps--done' : ''}" aria-label="きょうの3つ">
                <div class="t-steps__head">
                    <div>
                        <h2 class="t-steps__title">きょうの3つ</h2>
                        <p class="t-steps__lead">${doneCount === steps.length ? '今日はこれでじゅうぶん。また明日ね' : 'ぜんぶで1分くらい。できるものだけでOK'}</p>
                    </div>
                    <div class="t-ring" role="img" aria-label="3つのうち${doneCount}つ完了">
                        <svg viewBox="0 0 64 64" width="64" height="64">
                            <circle class="t-ring__bg" cx="32" cy="32" r="${r}"/>
                            <circle class="t-ring__fg" cx="32" cy="32" r="${r}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"/>
                        </svg>
                        <span class="t-ring__num">${doneCount}<small>/3</small></span>
                    </div>
                </div>
                <div class="t-steps__list">
                    ${steps.map(s => `
                        <a href="${s.href}" class="t-step ${s.done ? 't-step--done' : ''}">
                            <span class="t-step__char">${characterPicture(getImagePath(s.char, s.done ? 'smileOpen' : 'smile', 0), { alt: '', width: 44 })}</span>
                            <span class="t-step__body">
                                <span class="t-step__title">${s.title}</span>
                                <span class="t-step__desc">${s.desc}</span>
                            </span>
                            <span class="t-step__mark" aria-hidden="true">${s.done ? '✓' : '›'}</span>
                        </a>
                    `).join('')}
                </div>
            </section>
        `;
    },

    nowHtml(st) {
        const card = pickNowCard(new Date().getHours(), st.now);
        const attrs = card.action.type === 'link'
            ? `href="${card.action.target}"`
            : `href="#today-sec-${card.action.target}" data-open-section="${card.action.target}"`;
        return `
            <a class="t-now" ${attrs}>
                <span class="t-now__icon" aria-hidden="true">${card.icon}</span>
                <span class="t-now__body">
                    <span class="t-now__chip">いまのおすすめ</span>
                    <span class="t-now__title">${card.title}</span>
                    <span class="t-now__desc">${card.desc}</span>
                </span>
                <span class="t-now__arrow" aria-hidden="true">›</span>
            </a>
        `;
    },

    careChipsHtml(st) {
        const checked = new Set(st.care);
        return `
            <div class="t-care" role="group" aria-label="今日やったことをタップ">
                <p class="t-care__hint">今日やったことをタップ。マップが光るよ</p>
                <div class="t-care__chips">
                    ${SELFCARE_ITEMS.map(item => `
                        <button type="button" class="t-care__chip ${checked.has(item.id) ? 'is-on' : ''}" data-care="${item.id}" aria-pressed="${checked.has(item.id)}">
                            <span class="t-care__chip-icon" aria-hidden="true">${item.icon}</span>
                            <span>${TODAY_CARE_SHORT[item.id] || item.subtitle}</span>
                        </button>
                    `).join('')}
                </div>
                <a class="t-care__more" href="selfcare/">くわしく記録する ›</a>
            </div>
        `;
    },

    dotsHtml() {
        const active = App.getRecentDays(14);
        const dots = buildDayDots(new Date(), active, 14);
        return `
            <div class="t-days" aria-label="直近14日のうち${active.length}日ひらきました">
                <div class="t-days__num"><strong>${active.length}</strong><span>/ 14日</span></div>
                <div class="t-days__dots" aria-hidden="true">
                    ${dots.map(d => `<span class="t-days__dot ${d.active ? 'is-on' : ''} ${d.today ? 'is-today' : ''}"></span>`).join('')}
                </div>
                <div class="t-days__cap">この2週間のあしあと</div>
            </div>
        `;
    },

    heroHtml(st) {
        const q = st.quests;
        const allDone = q.care.done && q.quiz.done && q.advice.done;
        const line = pickTodayLine(new Date(), allDone);
        const ch = CHARACTERS[line.charKey];
        const g = TODAY_GREETING[line.slot];
        return `
            <header class="t-hero">
                <div class="t-hero__top">
                    <div>
                        <div class="t-hero__date">${formatDateJp()}</div>
                        <h1 class="t-hero__hello"><span aria-hidden="true">${g.icon}</span> ${g.text}</h1>
                    </div>
                    ${yeIsGuest() ? '' : this.dotsHtml()}
                </div>
                <div class="t-hero__talk">
                    <div class="t-hero__char">${characterPicture(getImagePath(line.charKey, line.expression, 0), { alt: ch.name, width: 84, extra: 'fetchpriority="high"' })}</div>
                    <div class="t-hero__bubble">
                        <div class="t-hero__name" style="color:${ch.color}">${ch.name}</div>
                        <p class="t-hero__msg">${line.message}</p>
                    </div>
                </div>
            </header>
        `;
    },

    guestHtml() {
        return `
            <section class="t-guest guest-only">
                <p class="t-guest__lead">ゆっくり3人組と、毎日ちょっとずつセルフケアを記録するアプリです。記録を残すにはログインしてね。</p>
                <div class="t-guest__actions">
                    <button type="button" class="t-guest__login" id="today-guest-login">ログインしてはじめる</button>
                    <a class="t-guest__about" href="lp/">どんなアプリ？</a>
                </div>
            </section>
        `;
    },

    sectionsHtml(st) {
        return `
            <h2 class="app-section-title"><span class="app-section-title__emoji">📝</span>きろく</h2>
            <div class="t-secs">
                ${TODAY_SECTIONS.map(sec => `
                    <details class="t-sec" id="today-sec-${sec.id}" data-sec="${sec.id}">
                        <summary class="t-sec__sum">
                            <span class="t-sec__icon" aria-hidden="true">${sec.icon}</span>
                            <span class="t-sec__title">${sec.title}</span>
                            <span class="t-sec__status" data-sec-status="${sec.id}">${this.sectionStatus(sec.id, st)}</span>
                            <span class="t-sec__caret" aria-hidden="true"></span>
                        </summary>
                        <div class="t-sec__body"><div id="${sec.mount}"></div></div>
                    </details>
                `).join('')}
            </div>
        `;
    },

    exploreHtml() {
        const tiles = [
            { href: 'clock/',    icon: '🕐', title: '体内時計', desc: 'いまの体のモード' },
            { href: 'turnover/', icon: '🔄', title: '入れ替わりリング', desc: '体は入れ替え続けている' },
            { href: 'cinema/',   icon: '🎬', title: '細胞シアター', desc: '6幕で見る細胞の中' },
            { href: 'basics/what-is-exosome/', icon: '🧬', title: 'エクソソームって何？', desc: '3分で読める入門' },
            { href: 'glossary/', icon: '📖', title: '用語集', desc: 'ことばをやさしく' },
            { href: 'line/',     icon: '💬', title: 'たぬ姉に聞く', desc: 'LINEでおしゃべり' }
        ];
        return `
            <h2 class="app-section-title"><span class="app-section-title__emoji">📚</span>ちょっと寄り道</h2>
            <div class="t-tiles">
                ${tiles.map(t => `
                    <a class="t-tile" href="${t.href}">
                        <span class="t-tile__icon" aria-hidden="true">${t.icon}</span>
                        <span class="t-tile__title">${t.title}</span>
                        <span class="t-tile__desc">${t.desc}</span>
                    </a>
                `).join('')}
            </div>
        `;
    },

    dailyWordHtml() {
        const q = getDailyWordOfDay();
        const ch = CHARACTERS[q.char];
        return `
            <section class="t-word" aria-label="今日のひとこと">
                <div class="t-word__chip">Today's Words<span class="t-word__topic">${q.topic}</span></div>
                <div class="t-word__body">
                    <span class="t-word__avatar">${characterPicture(getImagePath(q.char, 'smileOpen', 0), { alt: ch.name, width: 52, extra: 'loading="lazy"' })}</span>
                    <p class="t-word__text">${q.text}</p>
                </div>
                <div class="t-word__foot">
                    <span>— ${ch.name}より。一般的な情報です。効果や安全性を保証するものではありません。</span>
                    <button type="button" class="t-word__share" id="daily-share-btn">シェア</button>
                </div>
            </section>
        `;
    },

    downloadHtml() {
        if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) return '';
        // ホーム画面に置いたウェブアプリ・TWA で開いている人にも出さない（もう入っている）。
        if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return '';
        const APPLE = 'https://apps.apple.com/jp/app/id6775201794';
        const PLAY = 'https://play.google.com/store/apps/details?id=com.kimito.link.yukkuriexosome';
        const ua = (navigator.userAgent || '');
        const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isAndroid = /Android/.test(ua);
        const appleBadge = `<a href="${APPLE}" target="_blank" rel="noopener" class="store-badge" aria-label="App Storeで入手"><img src="images/store-badges/apple-appstore-ja.svg" alt="App Storeで入手" loading="lazy"></a>`;
        const playBadge = `<a href="${PLAY}" target="_blank" rel="noopener" class="store-badge" aria-label="Google Playで手に入れよう"><img src="images/store-badges/google-play-ja.png" alt="Google Playで手に入れよう" width="124" height="48" loading="lazy"></a>`;
        let badges, note;
        if (isIOS) { badges = appleBadge; note = ''; }
        else if (isAndroid) { badges = playBadge; note = ''; }
        else { badges = appleBadge + playBadge; note = '<p class="app-download__note">スマホで開くと、お使いの端末に合ったストアが表示されます</p>'; }
        return `
            <div class="app-download">
                <div class="app-download__chip">Download</div>
                <h2 class="app-download__title">アプリでもっとゆっくり</h2>
                <p class="app-download__lead">ホーム画面から1タップで開けます。基本無料。</p>
                <div class="app-download__badges">${badges}</div>
                ${note}
            </div>
        `;
    },

    /** 体内マップ（セルフケア＋ブースト）を描き直す */
    paintBodyMap(st) {
        const combined = new Set([...st.care, ...st.boost.activeRegions]);
        renderBodyMap('today-bodymap', combined, 0);
        if (st.boost.hasMito) this.paintMitochondria();
    },

    /** NMN をとった日は、マップに小さな光を足す（以前からの演出） */
    paintMitochondria() {
        const svg = document.querySelector('#today-bodymap .bodymap');
        if (!svg) return;
        const ns = 'http://www.w3.org/2000/svg';
        const group = document.createElementNS(ns, 'g');
        group.setAttribute('class', 'bodymap__mitochondria-group');
        const positions = [
            [60, 60], [140, 60], [80, 120], [120, 120], [70, 140], [130, 140], [90, 170], [110, 170],
            [60, 200], [140, 200], [80, 230], [120, 230], [76, 260], [124, 260], [80, 290], [120, 290],
            [100, 110], [100, 145], [50, 180], [150, 180]
        ];
        positions.forEach((pos, i) => {
            const star = document.createElementNS(ns, 'circle');
            star.setAttribute('cx', pos[0]);
            star.setAttribute('cy', pos[1]);
            star.setAttribute('r', 1.6);
            star.setAttribute('class', 'bodymap__star is-active');
            star.style.animationDelay = (i * 0.18) + 's';
            group.appendChild(star);
        });
        svg.appendChild(group);
    },

    /** 記録が変わったあと、上の3つ・おすすめ・行の一言だけを描き直す（開いている行は触らない） */
    refresh() {
        const st = this.readState();
        const steps = document.getElementById('today-steps');
        if (steps) steps.innerHTML = this.stepsHtml(st);
        const now = document.getElementById('today-now');
        if (now) now.innerHTML = this.nowHtml(st);
        TODAY_SECTIONS.forEach(sec => {
            const el = document.querySelector(`[data-sec-status="${sec.id}"]`);
            if (el) el.textContent = this.sectionStatus(sec.id, st);
        });
        return st;
    },

    /** からだに合図（セルフケア項目）をホームから直接つける */
    toggleCare(id) {
        // ゲストは書けない。ログインを開くだけにする
        // （saveTodayData まで進むと、保存されていないのに「+10 EP」と出てしまう）。
        if (yeIsGuest()) {
            if (typeof YEAuth !== 'undefined' && YEAuth.openSignIn) YEAuth.openSignIn().catch(() => {});
            return;
        }
        // ★selfcare.js の保存処理をそのまま使う（EP・達成日・履歴の扱いを2か所に書かない）。
        checkedItems = new Set(loadTodayData());
        if (checkedItems.has(id)) checkedItems.delete(id);
        else checkedItems.add(id);
        saveTodayData();

        const st = this.refresh();
        this.paintBodyMap(st);
        const care = document.getElementById('today-care');
        if (care) care.innerHTML = this.careChipsHtml(st);
    },

    openSection(id, scroll) {
        const el = document.getElementById(`today-sec-${id}`);
        if (!el) return;
        el.open = true;
        if (scroll !== false && el.scrollIntoView) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    },

    render() {
        const root = document.getElementById('today-screen');
        if (!root) return;
        // 外枠（ヘッダー・タブ）を先に出す。この中で今日のチェックインが済むので、
        // 下の「直近14日」に今日が入る。
        injectAppShell('today', 0);

        // 累計の利用日数（Garden のバッジが読む）。以前のホームと同じ数え方。
        if (!yeIsGuest()) {
            const today = getTodayKey();
            if (YEStorage.get('app_last_active', null) === today && YEStorage.get('app_total_days_counted', null) !== today) {
                YEStorage.set('app_total_days', YEStorage.get('app_total_days', 0) + 1);
                YEStorage.set('app_total_days_counted', today);
            }
        }

        const st = this.readState();

        root.innerHTML = `
            <div class="app-screen t-screen">
                ${this.heroHtml(st)}
                ${this.guestHtml()}
                <div id="today-steps">${this.stepsHtml(st)}</div>
                <div id="today-now">${this.nowHtml(st)}</div>

                <div id="today-bodymap"></div>
                <div id="today-care">${this.careChipsHtml(st)}</div>

                ${this.dailyWordHtml()}
                ${this.sectionsHtml(st)}
                ${this.exploreHtml()}
                ${this.downloadHtml()}

                <!-- LINE公式アカウント導線 -->
                <div class="line-connect" id="line-add-qr">
                    <div class="line-connect__chip">LINE公式アカウント</div>
                    <h2 class="line-connect__title">ゆっくり3人組と、LINEでもつながれます</h2>
                    <p class="line-connect__lead">友だち追加は無料です。スマホではボタンからLINEアプリの友だち追加が開きます。iPadやパソコンでは、下のQRコードをスマホのLINEで読み取ってください。</p>
                    <div class="line-connect__body">
                        <img src="images/line/line-qr.png" alt="LINE公式アカウント友だち追加QRコード" class="line-connect__qr" loading="lazy">
                        <a href="#line-add-qr" class="line-connect__cta" data-line-add data-line-href="https://lin.ee/zMVlevv">
                            <span>LINEで友だち追加する</span>
                        </a>
                    </div>
                    <p class="line-connect__note">iPadやパソコンでボタンを押すと、このQRコードまで移るだけです。LINEアプリが無い端末でも、スマホのLINEで読み取って追加できます。</p>
                </div>

                <div class="t-foot-logo">
                    <a href="https://kimito-link.com/" target="_blank" rel="noopener">
                        <img src="images/kimito-link-logo/logo_kimito-link_RGB_color.png" alt="Kimito-Link" width="43" height="32" loading="lazy">
                    </a>
                </div>
            </div>
        `;

        this.paintBodyMap(st);
        this.bind(root);

        // 写真の枚数（IndexedDB）はあとから入れる
        if (typeof getAllPhotos === 'function') {
            getAllPhotos().then((list) => {
                this.photoCount = (list || []).length;
                const el = document.querySelector('[data-sec-status="photo"]');
                if (el) el.textContent = this.sectionStatus('photo', st);
            }).catch(() => {});
        }

        // 医師紹介コードで来た人への歓迎バー（初回のみ）。「今週の手ごたえ」の行の前に入る。
        if (typeof RefPartner !== 'undefined' && RefPartner.showWelcomeOnce) RefPartner.showWelcomeOnce();

        if (typeof upgradeLineAddLinks === 'function') upgradeLineAddLinks();
        if (typeof autoShowOnboardingIfNeeded === 'function') autoShowOnboardingIfNeeded(0);

        // #today-sec-sleep のようなリンクで来たら、その行を開く
        const m = /^#today-sec-([a-z]+)$/.exec(location.hash || '');
        if (m) this.openSection(m[1]);
    },

    bind(root) {
        const rendered = new Set();

        // きろくの行: 開いたときに1回だけ中身を描く
        root.querySelectorAll('details.t-sec').forEach((el) => {
            el.addEventListener('toggle', () => {
                const id = el.getAttribute('data-sec');
                if (!el.open || rendered.has(id)) return;
                rendered.add(id);
                const sec = TODAY_SECTIONS.find(s => s.id === id);
                if (sec) sec.render();
            });
        });

        root.addEventListener('click', (e) => {
            const t = e.target instanceof Element ? e.target : null;
            if (!t) return;

            // からだに合図（チップ／マップの点）
            const chip = t.closest('[data-care]');
            if (chip) {
                this.toggleCare(chip.getAttribute('data-care'));
                return;
            }
            const point = t.closest('#today-bodymap .charmap__point');
            if (point) {
                const region = BODY_REGIONS.find(r => r.id === point.getAttribute('data-id'));
                if (region) this.toggleCare(region.careId);
                return;
            }

            // 「からだに合図を送る」→ マップまで移る
            const toMap = t.closest('a[href="#today-bodymap"]');
            if (toMap) {
                e.preventDefault();
                const map = document.getElementById('today-bodymap');
                if (map) map.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }

            // いまのおすすめ → きろくの行を開く
            const open = t.closest('[data-open-section]');
            if (open) {
                e.preventDefault();
                this.openSection(open.getAttribute('data-open-section'));
                return;
            }

            // 紹介バーの「ロンジェビティ・スコア」→ 行を開いてから見せる
            if (t.closest('.refpartner-welcome__go')) {
                this.openSection('longevity', false);
                return;
            }

            if (t.closest('#today-guest-login')) {
                if (typeof YEAuth !== 'undefined' && YEAuth.openSignIn) {
                    YEAuth.openSignIn().catch(() => App.showToast('ログインを開けませんでした。時間をおいて試してください', '⚠️', 3000));
                }
                return;
            }

            if (t.closest('#daily-share-btn')) {
                const q = getDailyWordOfDay();
                const txt = `【今日のひとこと】\n\n${q.text}\n\n— ${CHARACTERS[q.char].name}（ゆっくりエクソソーム）\n\nhttps://exosome.kimito.link/`;
                if (navigator.share) navigator.share({ text: txt }).catch(() => {});
                else if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => App.showToast('コピーしました', '📋', 1800));
                return;
            }
        });

        // きろくの中で何か入力されたら、上の3つ・おすすめ・行の一言を合わせる
        const secs = root.querySelector('.t-secs');
        if (secs) {
            // ★capture で聞く。肌・疲労のボタンは stopPropagation するので、
            //   ふつうの（bubble の）リスナーには届かない。
            const sync = () => setTimeout(() => {
                this.refresh();
                if (typeof getAllPhotos === 'function') {
                    getAllPhotos().then((list) => {
                        this.photoCount = (list || []).length;
                        const el = document.querySelector('[data-sec-status="photo"]');
                        if (el) el.textContent = this.photoCount ? `${this.photoCount}枚` : '';
                    }).catch(() => {});
                }
            }, 80);
            secs.addEventListener('click', sync, true);
            secs.addEventListener('change', sync, true);
        }

        // 別のタブで記録して戻ってきたとき（クイズ・ひとこと・ブースト）にも合わせる
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                const st = this.refresh();
                this.paintBodyMap(st);
                const care = document.getElementById('today-care');
                if (care) care.innerHTML = this.careChipsHtml(st);
            }
        });
        window.addEventListener('pageshow', (ev) => {
            if (ev.persisted) {
                const st = this.refresh();
                this.paintBodyMap(st);
            }
        });
    }
};

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => TodayScreen.render());
}
