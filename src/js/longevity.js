/**
 * Longevity Score - ロンジェビティ・スコア（擬似・体内細胞年齢）
 *
 * 動画「健康を可視化する最新技術（エイジテック）」より。
 * 欧米では AI・バイオマーカーで「生物学的年齢」と実年齢の差を可視化する
 * 流れがある。それを、このアプリが持つ日々のデータだけで
 * "ゲーム的に・端末内だけで" 再現する。
 *
 * 既存データを集計するだけの読み取り専用 widget。
 * 他システム（EP・体内マップ・各チェック）には一切書き込まない＝安全。
 *
 * スコア配点（合計100点）:
 *   セルフケア（6項目）        30点   = 達成項目 / 6 * 30
 *   心と社会のケア（4項目）    20点   = 達成項目 / 4 * 20
 *   睡眠（6.5〜8.5hが満点）    20点
 *   疲労回復度（平均/10）      20点   = 平均 / 10 * 20
 *   ブースト（当日記録あり）   10点
 *
 * 擬似・体内細胞年齢:
 *   スコアを「若さの相対オフセット」に変換して表示する。
 *   実年齢を聞かない（オンボーディング不要・正直）ので、
 *   "実年齢より◯歳若い/老けた相当" という相対表現にとどめる。
 *   100点 → -7歳相当 / 50点 → ±0 / 0点 → +7歳相当（線形）
 */

/** 指定 Date のロンジェビティ・スコア内訳を計算（読み取り専用） */
function calcLongevityScore(dateLike) {
    const d = dateLike ? new Date(dateLike) : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${day}`;

    // 1) セルフケア（6項目）
    const careArr = YEStorage.get(`selfcare_${dateKey}`, []) || [];
    const careMax = (typeof SELFCARE_ITEMS !== 'undefined') ? SELFCARE_ITEMS.length : 6;
    const carePts = careMax ? Math.min(1, careArr.length / careMax) * 30 : 0;

    // 2) 心と社会のケア（4項目）
    const mindArr = YEStorage.get(`mindcare_${dateKey}`, []) || [];
    const mindMax = (typeof MINDCARE_ITEMS !== 'undefined') ? MINDCARE_ITEMS.length : 4;
    const mindPts = mindMax ? Math.min(1, mindArr.length / mindMax) * 20 : 0;

    // 3) 睡眠（6.5〜8.5h = 満点。外れるほど減点）
    const sleepRec = YEStorage.get(`sleep_${dateKey}`, null);
    let sleepPts = 0;
    if (sleepRec && sleepRec.minutes) {
        const h = sleepRec.minutes / 60;
        if (h >= 6.5 && h <= 8.5) sleepPts = 20;
        else if (h >= 5 && h < 6.5) sleepPts = 14;
        else if (h > 8.5 && h <= 10) sleepPts = 14;
        else if (h >= 4 && h < 5) sleepPts = 8;
        else if (h > 10) sleepPts = 8;
        else sleepPts = 4; // 4h未満
    }

    // 4) 疲労回復度（平均 / 10）
    const fatScores = YEStorage.get(`fatigue_${dateKey}`, {}) || {};
    const fatVals = Object.values(fatScores).map(Number).filter(n => !isNaN(n));
    let fatPts = 0;
    if (fatVals.length) {
        const avg = fatVals.reduce((s, v) => s + v, 0) / fatVals.length;
        fatPts = Math.min(1, avg / 10) * 20;
    }

    // 5) ブースト（当日記録あり）
    const boostArr = YEStorage.get(`boost_${dateKey}`, []) || [];
    const boostPts = boostArr.length > 0 ? 10 : 0;

    const total = Math.round(carePts + mindPts + sleepPts + fatPts + boostPts);
    const hasAny = careArr.length || mindArr.length || sleepRec || fatVals.length || boostArr.length;

    return {
        total: Math.max(0, Math.min(100, total)),
        hasAny: !!hasAny,
        parts: {
            care:  { pts: Math.round(carePts),  max: 30, label: 'セルフケア' },
            mind:  { pts: Math.round(mindPts),  max: 20, label: '心と社会' },
            sleep: { pts: Math.round(sleepPts), max: 20, label: '睡眠' },
            fat:   { pts: Math.round(fatPts),   max: 20, label: '疲労回復' },
            boost: { pts: Math.round(boostPts), max: 10, label: 'ブースト' }
        }
    };
}

/** スコア → 擬似・体内年齢オフセット（"実年齢より◯歳"） */
function scoreToCellAgeOffset(score) {
    // 100点 → -7 / 50点 → 0 / 0点 → +7
    return Math.round(((50 - score) / 50) * 7);
}

/** スコア → 色・ラベル */
function evalLongevity(score) {
    if (score >= 80) return { color: '#7ca97a', label: 'いきいき',   char: 'rink',   emoji: '🌟' };
    if (score >= 60) return { color: '#8eb4c7', label: '好調',       char: 'konta',  emoji: '🌿' };
    if (score >= 40) return { color: '#c9a96e', label: 'ふつう',     char: 'tanunee',emoji: '🌙' };
    if (score >= 20) return { color: '#c9899a', label: 'お疲れ気味', char: 'tanunee',emoji: '🛌' };
    return                  { color: '#b39a8b', label: 'これから',   char: 'rink',   emoji: '🌱' };
}

/** 直近7日のスコア */
function getLongevity7Days() {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const s = calcLongevityScore(d);
        days.push({
            label: d.getDate() + '日',
            score: s.total,
            hasData: s.hasAny,
            isToday: i === 0
        });
    }
    return days;
}

/**
 * Today画面に Longevity Score カードを挿入
 */
function renderLongevityScore(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const s = calcLongevityScore();
    const ev = evalLongevity(s.total);
    const offset = scoreToCellAgeOffset(s.total);
    const days = getLongevity7Days();
    const maxBar = 100;

    // ゲージ（半円ではなく横バー＋大きな数値。SVGなしで軽量に）
    const ageText = offset < 0
        ? `実年齢より <strong style="color:${ev.color};">${Math.abs(offset)}歳 若い</strong> 相当`
        : offset > 0
            ? `実年齢より <strong style="color:${ev.color};">${offset}歳 上</strong> 相当`
            : `実年齢 <strong style="color:${ev.color};">ぴったり</strong> 相当`;

    const partRow = (p) => `
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:5px;">
            <div style="flex:0 0 64px; font-size:.68rem; color:#8a7d76;">${p.label}</div>
            <div style="flex:1; height:8px; background:#f0e8df; border-radius:99px; overflow:hidden;">
                <div style="width:${p.max ? (p.pts / p.max) * 100 : 0}%; height:100%; background:${ev.color}; border-radius:99px;"></div>
            </div>
            <div style="flex:0 0 38px; text-align:right; font-size:.66rem; color:#8a7d76; font-variant-numeric:tabular-nums;">${p.pts}/${p.max}</div>
        </div>
    `;

    container.innerHTML = `
        <div class="longevity" style="background:linear-gradient(135deg,#fff,#faf4ee); border-radius:22px; padding:22px 20px; box-shadow:0 4px 20px rgba(46,38,34,.06); margin-bottom:20px; border:1px solid ${ev.color}33;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <div style="font-family:'Noto Serif JP',serif; font-size:1rem; font-weight:600; letter-spacing:.08em;">
                    🧬 ロンジェビティ・スコア
                </div>
                <div style="font-size:.62rem; color:#8a7d76; letter-spacing:.1em; border:1px solid #ebe0d0; padding:2px 8px; border-radius:99px;">エイジテック風</div>
            </div>

            ${s.hasAny ? `
                <div style="display:flex; align-items:center; gap:16px; margin-bottom:14px;">
                    <div style="flex:0 0 auto; text-align:center;">
                        <div style="font-family:'Noto Serif JP',serif; font-size:2.6rem; font-weight:700; color:${ev.color}; line-height:1;">${s.total}</div>
                        <div style="font-size:.6rem; color:#8a7d76; letter-spacing:.1em;">/ 100</div>
                    </div>
                    <div style="flex:1; min-width:0;">
                        <div style="display:inline-block; padding:3px 12px; border-radius:99px; background:${ev.color}1a; color:${ev.color}; font-size:.78rem; font-weight:700; letter-spacing:.06em; margin-bottom:6px;">${ev.emoji} ${ev.label}</div>
                        <div style="font-size:.82rem; color:#2e2622; line-height:1.5;">🧫 擬似・体内細胞年齢：${ageText}</div>
                    </div>
                </div>

                <div style="background:#fff; border-radius:14px; padding:12px 14px; margin-bottom:14px;">
                    <div style="font-size:.64rem; color:#8a7d76; letter-spacing:.1em; margin-bottom:8px;">スコアの内訳（今日）</div>
                    ${partRow(s.parts.care)}
                    ${partRow(s.parts.mind)}
                    ${partRow(s.parts.sleep)}
                    ${partRow(s.parts.fat)}
                    ${partRow(s.parts.boost)}
                </div>
            ` : `
                <div style="text-align:center; padding:14px 8px 18px;">
                    <div style="font-size:2.2rem; margin-bottom:6px;">🧬</div>
                    <div style="font-size:.82rem; color:#2e2622; line-height:1.6; margin-bottom:4px;">今日のケアを記録すると、<br>スコアと擬似・体内細胞年齢が表示されます。</div>
                    <div style="font-size:.68rem; color:#8a7d76;">セルフケア・睡眠・心のケア・疲労・ブーストから自動計算。</div>
                </div>
            `}

            <div style="padding-top:6px;">
                <div style="font-size:.72rem; color:#8a7d76; letter-spacing:.1em; margin-bottom:6px;">この1週間（スコア）</div>
                <div style="display:flex; gap:4px; align-items:flex-end; height:44px;">
                    ${days.map(d => {
                        const h = d.hasData ? Math.max(4, (d.score / maxBar) * 44) : 4;
                        const dev = evalLongevity(d.score);
                        const bg = d.hasData ? dev.color : '#ebe0d0';
                        return `<div style="flex:1; height:${h}px; background:${bg}; border-radius:4px 4px 0 0; min-height:4px;" title="${d.label}: ${d.hasData ? d.score + '点' : '記録なし'}"></div>`;
                    }).join('')}
                </div>
                <div style="display:flex; gap:4px; margin-top:4px;">
                    ${days.map(d => `<div style="flex:1; text-align:center; font-size:.6rem; color:${d.isToday ? ev.color : '#8a7d76'}; font-weight:${d.isToday ? '700' : '400'};">${d.isToday ? '今日' : d.label}</div>`).join('')}
                </div>
            </div>

            <div style="margin-top:12px; padding:8px; background:#faf6f1; border-radius:8px; font-size:.62rem; color:#8a7d76; line-height:1.5; letter-spacing:.03em;">
                💡 このスコア・年齢は習慣化を楽しむための<strong>イメージ表示</strong>で、医療的な生物学的年齢の測定値ではありません。
            </div>
        </div>
    `;
}
