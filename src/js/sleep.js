/**
 * Sleep Log - 睡眠記録（時計いらず）
 *
 * Apple Watch などのウェアラブルは「寝るときに着けたくない」という声が多い。
 * このアプリは端末内完結・ログイン不要なので、
 *   「おやすみ」タップ → 就寝時刻を記録
 *   「おはよう」タップ → 起床時刻を記録 → 睡眠時間を自動計算
 * という、時計をつけずに枕元のスマホをタップするだけの方式にする。
 *
 * エクソソーム/培養上清の世界観とも相性がよい：
 * 成長ホルモンや細胞の修復シグナルは「深い睡眠中」に最も働く。
 * 睡眠を見える化することは、体内エクソ活性のいちばんの土台になる。
 *
 * データ構造（YEStorage, キー = sleep_YYYY-MM-DD は「起床した日」基準）:
 *   {
 *     bedAt:  <ms epoch>,   // 就寝（おやすみ）を押した時刻
 *     wakeAt: <ms epoch>,   // 起床（おはよう）を押した時刻
 *     minutes: <number>     // wakeAt - bedAt（分）
 *   }
 * 就寝だけ押して未起床の「進行中」セッションは sleep_pending に置く。
 */

/** 進行中（就寝のみ記録済み）セッションのキー */
const SLEEP_PENDING_KEY = 'sleep_pending';

/** 起床日（= その睡眠が属する日）のキー */
function sleepDayKey(dateLike) {
    const d = dateLike ? new Date(dateLike) : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `sleep_${y}-${m}-${day}`;
}

function getPendingSleep() {
    return YEStorage.get(SLEEP_PENDING_KEY, null);
}

/** 「おやすみ」: 就寝時刻を記録して進行中にする */
function startSleep() {
    const now = Date.now();
    YEStorage.set(SLEEP_PENDING_KEY, { bedAt: now });
    return now;
}

/** 「おやすみ」を取り消す（押し間違い用） */
function cancelSleep() {
    YEStorage.remove(SLEEP_PENDING_KEY);
}

/**
 * 「おはよう」: 起床時刻を記録し、進行中セッションを確定する。
 * 起床した「今日」の日付キーに保存する。
 * @returns {object|null} 確定した記録（minutes 含む）／進行中がなければ null
 */
function finishSleep() {
    const pending = getPendingSleep();
    if (!pending || !pending.bedAt) return null;

    const wakeAt = Date.now();
    let minutes = Math.round((wakeAt - pending.bedAt) / 60000);
    // 異常値ガード（マイナス・24時間超は丸める）
    if (minutes < 0) minutes = 0;
    if (minutes > 24 * 60) minutes = 24 * 60;

    const record = { bedAt: pending.bedAt, wakeAt, minutes };
    YEStorage.set(sleepDayKey(wakeAt), record);
    YEStorage.remove(SLEEP_PENDING_KEY);
    return record;
}

/** 今日（起床日）の記録 */
function getTodaySleep() {
    return YEStorage.get(sleepDayKey(), null);
}

/** 直近7日分（起床日基準）の記録 */
function getSleep7Days() {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const rec = YEStorage.get(sleepDayKey(d), null);
        days.push({
            date: d,
            label: d.getDate() + '日',
            minutes: rec ? rec.minutes : 0,
            isToday: i === 0,
            hasData: !!rec
        });
    }
    return days;
}

/** ms epoch → "23:45" */
function fmtClock(ms) {
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 分 → "7時間30分" */
function fmtDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}分`;
    if (m === 0) return `${h}時間`;
    return `${h}時間${m}分`;
}

/**
 * 睡眠時間に応じた評価（色 + メッセージ）。
 * 6.5〜8.5時間あたりを「ぐっすり」の目安にする（医療助言ではなく目安）。
 */
function evalSleep(minutes) {
    const h = minutes / 60;
    if (minutes === 0) return { color: '#b39a8b', label: '記録なし', msg: '' };
    if (h < 4)        return { color: '#c9899a', label: 'ショート',   msg: '🌙 少し短めかも。今日は無理せずに。' };
    if (h < 6)        return { color: '#c9a96e', label: 'やや不足',   msg: '☕ もう少し眠れると、修復シグナルが進むよ。' };
    if (h <= 8.5)     return { color: '#7ca97a', label: 'ぐっすり',   msg: '✨ 理想的！睡眠中にエクソ活性がぐんと上がる時間帯。' };
    if (h <= 10)      return { color: '#8eb4c7', label: 'たっぷり',   msg: '😴 しっかり休めたね。' };
    return                   { color: '#a8a2c4', label: 'ロング',     msg: '🛌 ゆっくり休養。体が回復を求めていたのかも。' };
}

/**
 * Today画面に Sleep Log カードを挿入
 */
function renderSleepLog(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    function rebuild() {
        const pending = getPendingSleep();
        const todayRec = getTodaySleep();
        const days = getSleep7Days();
        // 7日のうちデータがある日の平均（目盛り上限の基準）
        const maxBar = Math.max(9 * 60, ...days.map(d => d.minutes)); // 最低でも9時間スケール
        const recordedCount = days.filter(d => d.hasData).length;

        // メイン状態の出し分け：① 進行中 ② 今日記録済み ③ 未記録
        let mainHtml = '';

        if (pending && pending.bedAt) {
            // ① おやすみ中
            const elapsed = Math.max(0, Math.round((Date.now() - pending.bedAt) / 60000));
            mainHtml = `
                <div style="text-align:center; padding:18px 12px; background:linear-gradient(135deg,#2e2d4a,#4a4673); border-radius:16px; color:#fff;">
                    <div style="font-size:1.6rem; margin-bottom:4px;">🌙</div>
                    <div style="font-family:'Noto Serif JP',serif; font-size:1rem; font-weight:600; letter-spacing:.08em;">おやすみなさい</div>
                    <div style="font-size:.78rem; opacity:.85; margin-top:6px;">${fmtClock(pending.bedAt)} に就寝 ・ 経過 ${fmtDuration(elapsed)}</div>
                    <button type="button" id="sleep-wake-btn" style="margin-top:14px; width:100%; max-width:280px; padding:14px; border:none; border-radius:999px; background:#ffd98a; color:#2e2622; font-family:'Noto Serif JP',serif; font-size:1rem; font-weight:700; letter-spacing:.12em; cursor:pointer; box-shadow:0 4px 14px rgba(0,0,0,.18); touch-action:manipulation;">
                        ☀️ おはよう（起床を記録）
                    </button>
                    <div style="margin-top:8px;">
                        <button type="button" id="sleep-cancel-btn" style="background:transparent; border:none; color:rgba(255,255,255,.65); font-size:.68rem; text-decoration:underline; cursor:pointer; letter-spacing:.05em;">就寝の記録を取り消す</button>
                    </div>
                </div>
            `;
        } else if (todayRec) {
            // ② 今日（起床日）記録済み
            const ev = evalSleep(todayRec.minutes);
            mainHtml = `
                <div style="text-align:center; padding:18px 12px; background:#faf6f1; border-radius:16px; border:1px solid ${ev.color};">
                    <div style="font-size:.7rem; color:#8a7d76; letter-spacing:.14em;">昨夜の睡眠</div>
                    <div style="font-family:'Noto Serif JP',serif; font-size:1.9rem; font-weight:700; color:${ev.color}; line-height:1.1; margin:4px 0;">
                        ${fmtDuration(todayRec.minutes)}
                    </div>
                    <div style="display:inline-block; padding:2px 12px; border-radius:999px; background:${ev.color}1a; color:${ev.color}; font-size:.72rem; font-weight:700; letter-spacing:.08em;">${ev.label}</div>
                    <div style="font-size:.72rem; color:#8a7d76; margin-top:8px;">🌙 ${fmtClock(todayRec.bedAt)} → ☀️ ${fmtClock(todayRec.wakeAt)}</div>
                    ${ev.msg ? `<div style="font-size:.8rem; color:#2e2622; margin-top:8px; line-height:1.5;">${ev.msg}</div>` : ''}
                    <div style="margin-top:12px;">
                        <button type="button" id="sleep-redo-btn" style="background:transparent; border:1px solid #ebe0d0; color:#8a7d76; padding:5px 14px; border-radius:999px; font-size:.7rem; letter-spacing:.08em; cursor:pointer;">記録し直す</button>
                    </div>
                </div>
            `;
        } else {
            // ③ 未記録（今夜の就寝を促す）
            mainHtml = `
                <div style="text-align:center; padding:18px 12px;">
                    <div style="font-size:.8rem; color:#8a7d76; line-height:1.6; margin-bottom:14px;">
                        枕元でタップするだけ。時計いらずで睡眠を記録できます。<br>
                        <span style="font-size:.7rem;">寝る前に「おやすみ」、起きたら「おはよう」。</span>
                    </div>
                    <button type="button" id="sleep-bed-btn" style="width:100%; max-width:280px; padding:16px; border:none; border-radius:999px; background:linear-gradient(135deg,#4a4673,#6b6499); color:#fff; font-family:'Noto Serif JP',serif; font-size:1.05rem; font-weight:700; letter-spacing:.14em; cursor:pointer; box-shadow:0 4px 16px rgba(74,70,115,.3); touch-action:manipulation;">
                        🌙 おやすみ（就寝を記録）
                    </button>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="sleep-log" style="background:#fff; border-radius:22px; padding:20px; box-shadow:0 4px 20px rgba(46,38,34,.06); margin-bottom:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <div style="font-family:'Noto Serif JP',serif; font-size:1rem; font-weight:600; letter-spacing:.08em;">
                        🛏 睡眠ログ
                    </div>
                    <div style="font-size:.7rem; color:#8a7d76;">時計いらず</div>
                </div>

                <p style="font-size:.7rem; color:#8a7d76; margin-bottom:14px; letter-spacing:.04em; line-height:1.5;">
                    細胞の修復シグナルは<strong style="color:#6b6499;">深い眠りの間</strong>に最も働きます。<br>
                    睡眠は、体内エクソ活性のいちばんの土台。
                </p>

                ${mainHtml}

                <div style="margin-top:16px; padding-top:14px; border-top:1px solid #ebe0d0;">
                    <div style="font-size:.72rem; color:#8a7d76; letter-spacing:.1em; margin-bottom:6px;">この1週間（睡眠時間）</div>
                    <div style="display:flex; gap:4px; align-items:flex-end; height:48px;">
                        ${days.map(d => {
                            const h = d.hasData ? Math.max(4, (d.minutes / maxBar) * 48) : 4;
                            const ev = evalSleep(d.minutes);
                            const bg = d.hasData ? ev.color : '#ebe0d0';
                            return `<div style="flex:1; height:${h}px; background:${bg}; border-radius:4px 4px 0 0; min-height:4px;" title="${d.label}: ${d.hasData ? fmtDuration(d.minutes) : '記録なし'}"></div>`;
                        }).join('')}
                    </div>
                    <div style="display:flex; gap:4px; margin-top:4px;">
                        ${days.map(d => `<div style="flex:1; text-align:center; font-size:.6rem; color:${d.isToday ? '#6b6499' : '#8a7d76'}; font-weight:${d.isToday ? '700' : '400'};">${d.isToday ? '今日' : d.label}</div>`).join('')}
                    </div>
                </div>

                <div style="margin-top:10px; padding:8px; background:#faf6f1; border-radius:8px; font-size:.65rem; color:#8a7d76; line-height:1.5; letter-spacing:.03em;">
                    💡 Apple Watch がなくてもOK。枕元のスマホをタップするだけ。記録は端末内だけに保存されます。
                </div>
            </div>
        `;

        // ① おやすみ
        const bedBtn = container.querySelector('#sleep-bed-btn');
        if (bedBtn) {
            bedBtn.addEventListener('click', () => {
                startSleep();
                rebuild();
            });
        }

        // ② おはよう（確定 + EP）
        const wakeBtn = container.querySelector('#sleep-wake-btn');
        if (wakeBtn) {
            wakeBtn.addEventListener('click', () => {
                const rec = finishSleep();
                if (rec && typeof App !== 'undefined') {
                    // 1日1回だけ付与（再記録では加算しない）
                    const epKey = `sleep_ep_${getTodayKey()}`;
                    if (!YEStorage.get(epKey, false)) {
                        App.addEP(15, 'sleep_log');
                        YEStorage.set(epKey, true);
                    }
                }
                rebuild();
            });
        }

        // 就寝の取り消し
        const cancelBtn = container.querySelector('#sleep-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                cancelSleep();
                rebuild();
            });
        }

        // 記録し直す（今日の記録を消して、おやすみからやり直す）
        const redoBtn = container.querySelector('#sleep-redo-btn');
        if (redoBtn) {
            redoBtn.addEventListener('click', () => {
                YEStorage.remove(sleepDayKey());
                rebuild();
            });
        }
    }

    rebuild();
}
