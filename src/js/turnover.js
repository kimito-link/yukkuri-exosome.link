/**
 * 入れ替わりリング（turnover.js）
 *
 * 「なんか変わってる」を実感させるための道具。
 * 記録を貯めないと出てこない情報を置くことで、続ける理由をつくる。
 *
 * 設計上の正直さ：
 *   入れ替わり自体は記録の有無にかかわらず進む。リングは経過した時間を映しているだけで、
 *   アプリの効果ではない。この点はUI上に明記する。
 *
 * 依存: common.js（YEStorage / getTodayKey）
 */

/* ============================================
   入れ替わりの周期（目安・個人差が大きい）
   ============================================ */

const TURNOVER_PARTS = [
    { id: 'chou',   name: '腸内',   cycle: 4,    color: '#c9a96e', note: '腸の粘膜上皮' },
    { id: 'hada',   name: '肌',     cycle: 40,   color: '#c9899a', note: '表皮の角化サイクル' },
    { id: 'meoto',  name: '目元',   cycle: 40,   color: '#c9899a', note: '目のまわりの表皮' },
    { id: 'kinniku',name: '筋肉',   cycle: 60,   color: '#a8c4a2', note: '筋のタンパク質' },
    { id: 'junkan', name: '循環',   cycle: 120,  color: '#8eb4c7', note: '赤血球の寿命' },
    { id: 'kami',   name: '髪',     cycle: 1095, color: '#a78a6b', note: '毛周期は年単位' }
];

/* ============================================
   記録データの読み出し
   ============================================ */

function tvDateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** localStorage を走査して、記録のある日付をすべて集める */
function tvCollectRecordedDates() {
    const dates = new Set();
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            const m = k && k.match(/^ye_(?:skin|fatigue)_(\d{4}-\d{2}-\d{2})$/);
            if (m) dates.add(m[1]);
        }
    } catch (e) { /* localStorage が使えない環境 */ }
    return Array.from(dates).sort();
}

/** 指定日の合計スコア（skin / fatigue いずれも 5項目×10点 = 50点満点） */
function tvTotalOn(kind, dateStr) {
    const scores = YEStorage.get(`${kind}_${dateStr}`, {});
    const vals = Object.values(scores).map(Number).filter(v => !isNaN(v));
    return vals.length ? { total: vals.reduce((s, v) => s + v, 0), count: vals.length } : null;
}

/** 直近 n 日ぶんの日付文字列（古い順） */
function tvRecentDates(n, offset = 0) {
    const out = [];
    for (let i = n - 1 + offset; i >= offset; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        out.push(tvDateKey(d));
    }
    return out;
}

/** 期間平均（記録のある日だけで平均する） */
function tvAverage(kind, dates) {
    const totals = dates.map(d => tvTotalOn(kind, d)).filter(Boolean).map(r => r.total);
    if (!totals.length) return null;
    return { avg: totals.reduce((s, v) => s + v, 0) / totals.length, days: totals.length };
}

/* ============================================
   描画
   ============================================ */

(function () {
    const root = document.getElementById('turnover');
    if (!root) return;

    const recorded = tvCollectRecordedDates();
    const todayStr = getTodayKey();

    // 記録開始日
    const firstStr = recorded.length ? recorded[0] : todayStr;
    const first = new Date(firstStr + 'T00:00:00');
    const today = new Date(todayStr + 'T00:00:00');
    const elapsed = Math.max(0, Math.round((today - first) / 86400000));

    // 直近14日の記録密度
    const last14 = tvRecentDates(14);
    const density = last14.filter(d => tvTotalOn('skin', d) || tvTotalOn('fatigue', d)).length;

    /* ---- リング ---- */
    function ringSvg(part) {
        const laps = Math.floor(elapsed / part.cycle);
        const prog = (elapsed % part.cycle) / part.cycle;
        const r = 44;
        const c = 2 * Math.PI * r;
        const offset = c * (1 - prog);
        const pct = Math.round(prog * 100);
        return `
        <div class="tv__ring">
            <svg viewBox="0 0 108 108" role="img" aria-label="${part.name}の入れ替わり ${pct}パーセント">
                <circle class="tv__ring-track" cx="54" cy="54" r="${r}"/>
                <circle class="tv__ring-arc" cx="54" cy="54" r="${r}" stroke="${part.color}"
                        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"/>
                <text class="tv__ring-pct" x="54" y="52" text-anchor="middle">${pct}%</text>
                <text class="tv__ring-lap" x="54" y="68" text-anchor="middle">${laps > 0 ? `${laps}巡目` : '1巡目'}</text>
            </svg>
            <div class="tv__ring-name" style="color:${part.color}">${part.name}</div>
            <div class="tv__ring-cycle">${part.note}／約${part.cycle >= 365 ? '年単位' : part.cycle + '日'}</div>
        </div>`;
    }

    /* ---- 一巡カード ---- */
    function lapCard() {
        // 直近で一巡を迎えた部位（腸内は頻繁すぎるので7日以上の周期に限る）
        const just = TURNOVER_PARTS
            .filter(p => p.cycle >= 7 && elapsed >= p.cycle)
            .filter(p => (elapsed % p.cycle) < 3)
            .sort((a, b) => b.cycle - a.cycle)[0];
        if (!just) return '';
        const laps = Math.floor(elapsed / just.cycle);
        return `
        <div class="tv__lap">
            <div class="tv__lap-eyebrow">A LAP COMPLETED</div>
            <div class="tv__lap-title">${just.name}が${laps}巡目に入りました</div>
            <p class="tv__lap-body">
                記録を始めた日の${just.name}をつくっていた細胞は、もうここにはありません。
                いまの${just.name}は、この${just.cycle}日ほどのあいだに置き換わったものです。
                入れ替わりは、あなたが見ていなくても進んでいました。
                あなたがしたのは、その期間をそばで記録していたことです。
            </p>
        </div>`;
    }

    /* ---- 手ごたえ（直近7日 vs その前7日） ---- */
    function deltaCard(kind, label) {
        const now = tvAverage(kind, tvRecentDates(7));
        const prev = tvAverage(kind, tvRecentDates(7, 7));
        if (!now || !prev) return null;
        const diff = now.avg - prev.avg;
        const sign = diff > 0.05 ? '+' : (diff < -0.05 ? '' : '±');
        const color = diff > 0.05 ? 'var(--color-primary)' : 'var(--color-text-muted)';
        return `
        <div class="tv__delta-card">
            <div class="tv__delta-l">${label}</div>
            <div class="tv__delta-v" style="color:${color}">${sign}${Math.abs(diff) < 0.05 ? '0' : diff.toFixed(1)}</div>
            <div class="tv__delta-n">今週 ${now.avg.toFixed(1)} ／ 先週 ${prev.avg.toFixed(1)}</div>
        </div>`;
    }

    function deltaSection() {
        const skin = deltaCard('skin', '肌の合計');
        const fatigue = deltaCard('fatigue', '疲労回復度');
        if (!skin && !fatigue) {
            const have = recorded.length;
            const need = Math.max(1, 14 - have);
            return `
            <div class="tv__wait">
                今週と先週をくらべるには、あと <b>${need}</b> 日ぶんの記録が必要です。<br>
                2週間そろうと、ここに差が出ます。
            </div>`;
        }
        return `<div class="tv__delta">${skin || ''}${fatigue || ''}</div>`;
    }

    /* ---- 重なりを見る ---- */
    function overlaySection() {
        const dates = tvRecentDates(7);
        const rows = dates.map(ds => {
            const f = YEStorage.get(`fatigue_${ds}`, {});
            const sleep = Number(f.sleep_quality) || 0;
            const s = tvTotalOn('skin', ds);
            return { ds, sleep, skin: s ? s.total : 0, label: ds.slice(8) + '日' };
        });
        const hasAny = rows.some(r => r.sleep || r.skin);
        if (!hasAny) {
            return `<div class="tv__wait">睡眠の質と肌の記録がそろうと、ここに並べて表示されます。</div>`;
        }
        return `
        <div class="tv__overlay-row">
            ${rows.map(r => `
                <div class="tv__overlay-col">
                    <div class="tv__bar tv__bar--skin" style="height:${Math.max(3, (r.skin / 50) * 26)}px"></div>
                    <div class="tv__bar tv__bar--sleep" style="height:${Math.max(3, (r.sleep / 10) * 26)}px"></div>
                </div>`).join('')}
        </div>
        <div class="tv__overlay-labels">${rows.map(r => `<div>${r.label}</div>`).join('')}</div>
        <div class="tv__legend">
            <span><i style="background:var(--color-primary)"></i>肌の合計</span>
            <span><i style="background:var(--color-accent)"></i>睡眠の質</span>
        </div>`;
    }

    /* ---- 組み立て ---- */
    root.innerHTML = `
        <p class="tv__lead">
            体は、あなたが見ていないあいだも入れ替わり続けています。
            部位ごとに流れる速さが違うので、腸は数日で、肌は数週間で、髪は年単位で一巡します。
        </p>

        <div class="tv__day">
            <div class="tv__day-n">${elapsed}</div>
            <div class="tv__day-l">記録を始めてからの日数</div>
        </div>

        ${lapCard()}

        <div class="tv__rings">
            ${TURNOVER_PARTS.map(ringSvg).join('')}
        </div>

        <div class="tv__panel">
            <div class="tv__panel-h">今週と先週のちがい</div>
            <p class="tv__panel-sub">記録のある日だけで平均を出しています。上がった日も下がった日も、そのまま出します。</p>
            ${deltaSection()}
        </div>

        <div class="tv__panel">
            <div class="tv__panel-h">重なりを見る</div>
            <p class="tv__panel-sub">睡眠の質と肌の合計を並べただけのものです。どちらがどちらの原因かは、この図では分かりません。重なっている日と、ずれている日を眺めてみてください。</p>
            ${overlaySection()}
        </div>

        <div class="tv__panel">
            <div class="tv__panel-h">この2週間</div>
            <p class="tv__panel-sub">連続日数ではなく、直近14日のうち何日つけたかを見ています。休んだ日があっても壊れません。</p>
            <div class="tv__delta">
                <div class="tv__delta-card">
                    <div class="tv__delta-l">つけた日</div>
                    <div class="tv__delta-v" style="color:var(--color-secondary)">${density}<span style="font-size:.9rem; color:var(--color-text-muted)"> / 14</span></div>
                    <div class="tv__delta-n">${density === 0 ? '今日からで大丈夫です' : 'おかえりなさい'}</div>
                </div>
                <div class="tv__delta-card">
                    <div class="tv__delta-l">記録のある日</div>
                    <div class="tv__delta-v" style="color:var(--color-tertiary)">${recorded.length}</div>
                    <div class="tv__delta-n">はじめての記録：${firstStr}</div>
                </div>
            </div>
        </div>

        <div class="tv__note">
            リングが進むのは時間が経ったからで、記録したからではありません。入れ替わりは記録の有無にかかわらず進みます。
            周期の日数は一般的に言われている目安で、部位・年齢・体調によって大きく変わります。実測値ではありません。
            体調について気になることがあるときは、医療機関で医師にご相談ください。
        </div>
    `;

    // リングは描画後に伸ばす（アニメーションを見せる）
    if (!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
        const arcs = root.querySelectorAll('.tv__ring-arc');
        arcs.forEach(a => {
            const to = a.getAttribute('stroke-dashoffset');
            a.setAttribute('stroke-dashoffset', a.getAttribute('stroke-dasharray'));
            requestAnimationFrame(() => requestAnimationFrame(() => {
                a.style.strokeDashoffset = to;
            }));
        });
    }
})();
