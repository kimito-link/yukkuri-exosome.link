/**
 * 体内時計ダイヤル（bodyclock.js）
 *
 * 「時間の経過とともに変化を感じる」ための道具。
 * 開くたびに針が動き、いま体がどのモードにいるかが変わる。
 *
 * 設計上の判断：
 *   オートファジーを時間でカウントする表示は作らない。
 *   ヒトで何時間から、どの臓器でどれだけ起きるかは確定しておらず、
 *   数字を出した時点で誤情報になる。加えて、肌スコアと写真記録のある
 *   このアプリで断食カウントダウンを回すと、食事制限を煽る方向に働く。
 *   ここでは「夜間に日内リズムがあると考えられている」帯として、
 *   目盛りのない薄い輪でだけ示す。
 *
 * 依存: common.js（YEStorage / getTodayKey）, notify.js
 */

const BC_KEY = 'bodyclock_times';

function bcGetTimes() {
    return Object.assign({ wake: '07:00', sleep: '23:00' }, YEStorage.get(BC_KEY, {}));
}

function bcToMin(hhmm) {
    const [h, m] = (hhmm || '0:00').split(':').map(Number);
    return ((h * 60 + m) % 1440 + 1440) % 1440;
}

function bcFmt(min) {
    const m = ((min % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** 現在時刻から見た各フェーズ */
function bcPhases(times) {
    const W = bcToMin(times.wake);
    const S = bcToMin(times.sleep);
    return [
        {
            key: 'rise', name: '立ち上がり', from: W - 60, to: W + 120, color: '#c9a96e',
            body: 'コルチゾールが上がり、体温が上がっていく時間帯です。体内時計をその日の朝に合わせる区間にあたります。',
            tip: '<b>できること：</b>カーテンを開けて、外の明るさを目に入れる。'
        },
        {
            key: 'sharp', name: '頭が働く時間', from: W + 120, to: W + 360, color: '#8eb4c7',
            body: '覚醒の度合いが高く、集中しやすい時間帯とされています。',
            tip: '<b>できること：</b>いちばん面倒な用事をここに置いてみる。'
        },
        {
            key: 'dip', name: '昼下がりの谷', from: W + 360, to: W + 540, color: '#b8a08d',
            body: '多くの人で眠気が来る時間帯です。食後だからというより、体内時計にもともとある谷だと考えられています。',
            tip: '<b>できること：</b>短い仮眠なら夜の眠りに響きにくいと言われています。長く寝すぎないように。'
        },
        {
            key: 'peak', name: '体が動く時間', from: W + 540, to: S - 120, color: '#a8c4a2',
            body: '体温が一日のピークに近づき、筋力や柔軟性が出やすい時間帯とされています。',
            tip: '<b>できること：</b>体を動かすならこのあたり。就寝直前の激しい運動は避ける。'
        },
        {
            key: 'wind', name: '下り坂', from: S - 120, to: S, color: '#c9899a',
            body: 'メラトニンが出はじめ、体が眠る準備に入っていきます。強い光はこの流れを遅らせます。',
            tip: '<b>できること：</b>部屋の明かりを一段落とす。画面の明るさも下げる。'
        },
        {
            key: 'repair', name: '修復の時間', from: S, to: S + 180, color: '#7c6f9e',
            body: '眠りに入って最初の深いノンレム睡眠に、成長ホルモンの大きな山が重なります。体が動かすモードから直すモードへ移る区間です。',
            tip: '<b>できること：</b>とくにありません。眠っているのがいちばんの仕事です。'
        },
        {
            key: 'late', name: '夜の後半', from: S + 180, to: W - 60, color: '#5f5a7a',
            body: '深い眠りの割合が減り、レム睡眠が増えていきます。目覚めに向けて体温が上がりはじめます。',
            tip: '<b>できること：</b>ここで目が覚めてしまっても、時計を見ないほうが眠りに戻りやすいと言われています。'
        }
    ];
}

/** min が [from,to) に入るか（日をまたぐ場合に対応） */
function bcIn(min, from, to) {
    const n = (x) => ((x % 1440) + 1440) % 1440;
    const f = n(from), t = n(to), m = n(min);
    return f <= t ? (m >= f && m < t) : (m >= f || m < t);
}

/* ============================================
   描画
   ============================================ */

(function () {
    const root = document.getElementById('bodyclock');
    if (!root) return;

    const CX = 190, CY = 190;

    function polar(r, deg) {
        const a = (deg - 90) * Math.PI / 180;
        return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
    }

    function arcPath(r, fromMin, toMin) {
        let sweep = (((toMin - fromMin) % 1440) + 1440) % 1440;
        if (sweep === 0) sweep = 1439;
        const startDeg = fromMin / 1440 * 360;
        const sweepDeg = sweep / 1440 * 360;
        const [x1, y1] = polar(r, startDeg);
        const [x2, y2] = polar(r, startDeg + sweepDeg);
        return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${sweepDeg > 180 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    }

    function render() {
        const times = bcGetTimes();
        const phases = bcPhases(times);
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const current = phases.find(p => bcIn(nowMin, p.from, p.to)) || phases[0];

        // 次のフェーズまで
        const idx = phases.indexOf(current);
        const next = phases[(idx + 1) % phases.length];
        let untilNext = ((((current.to - nowMin) % 1440) + 1440) % 1440);

        const S = bcToMin(times.sleep);
        const W = bcToMin(times.wake);

        const ticks = Array.from({ length: 24 }, (_, h) => {
            const deg = h / 24 * 360;
            const [x1, y1] = polar(148, deg);
            const [x2, y2] = polar(h % 6 === 0 ? 138 : 143, deg);
            const [tx, ty] = polar(126, deg);
            return `<line class="bc__tick" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>` +
                (h % 6 === 0 ? `<text class="bc__hour" x="${tx.toFixed(1)}" y="${(ty + 4).toFixed(1)}" text-anchor="middle">${h}</text>` : '');
        }).join('');

        root.innerHTML = `
        <div class="bc__stage">
            <svg viewBox="0 0 380 380" role="img" aria-label="24時間の体内時計ダイヤル。現在は${current.name}">
                <circle cx="190" cy="190" r="168" fill="#ffffff" opacity=".55"/>

                <!-- 自食作用の日内リズム（目盛りなし・外側の薄い輪） -->
                <path d="${arcPath(166, S, W)}" fill="none" stroke="#8eb4c7" stroke-width="5"
                      stroke-linecap="round" opacity=".28"/>

                <!-- フェーズ帯 -->
                ${phases.map(p => `<path d="${arcPath(148, p.from, p.to)}" fill="none" stroke="${p.color}"
                    stroke-width="16" stroke-linecap="butt" opacity="${p === current ? '.95' : '.35'}"/>`).join('')}

                ${ticks}

                <!-- 針 -->
                <g class="bc__hand" style="transform: rotate(${(nowMin / 1440 * 360).toFixed(2)}deg)">
                    <line x1="190" y1="190" x2="190" y2="48" stroke="#2e2622" stroke-width="2.5" stroke-linecap="round"/>
                    <circle cx="190" cy="52" r="6" fill="#2e2622"/>
                </g>
                <circle cx="190" cy="190" r="72" fill="#fff" opacity=".92"/>
                <circle cx="190" cy="190" r="5" fill="#2e2622"/>

                <text class="bc__now-h" x="190" y="180" text-anchor="middle">${bcFmt(nowMin)}</text>
                <text class="bc__now-l" x="190" y="200" text-anchor="middle">${current.name}</text>
            </svg>
        </div>

        <div class="bc__phase" style="border-left-color:${current.color}">
            <div class="bc__phase-eyebrow">いま体は</div>
            <div class="bc__phase-name">${current.name}</div>
            <p class="bc__phase-body">${current.body}</p>
            <div class="bc__tip">${current.tip}</div>
            <div class="bc__next">つぎの「${next.name}」まで、あと約${Math.floor(untilNext / 60)}時間${untilNext % 60}分</div>
        </div>

        <div class="bc__panel">
            <div class="bc__panel-h">自食作用の日内リズム<span class="bc__badge">○ 研究の途中</span></div>
            <p class="bc__panel-sub">
                外側の薄い輪が、それにあたる帯です。細胞のなかの片づけにも一日のリズムがあり、
                夜間に強まると考えられていますが、ヒトで何時間から、どの臓器でどれだけ起きるのかは分かっていません。
                だからこのアプリでは、時間を数える表示や、開始を知らせる通知は作っていません。目盛りのない輪にしてあるのはそのためです。
            </p>
        </div>

        <div class="bc__panel">
            <div class="bc__panel-h">あなたの時間に合わせる</div>
            <p class="bc__panel-sub">起きる時刻と寝る時刻を入れると、帯の位置がその生活に合わせて動きます。端末のなかだけに保存されます。</p>
            <div class="bc__times">
                <div class="bc__field">
                    <label for="bcWake">起きる時刻</label>
                    <input type="time" id="bcWake" value="${times.wake}">
                </div>
                <div class="bc__field">
                    <label for="bcSleep">寝る時刻</label>
                    <input type="time" id="bcSleep" value="${times.sleep}">
                </div>
            </div>
            <div class="bc__row"><button class="bc__btn bc__btn--main" id="bcSave" type="button">保存する</button></div>
        </div>

        <div class="bc__panel" id="bcNotify"></div>

        <div class="bc__note">
            帯の位置は一般的に言われている目安で、実測ではありません。体内時計には個人差があり、朝型・夜型の傾向や年齢によっても変わります。
            眠れない状態が続くとき、日中の眠気が強いときは、医療機関で医師にご相談ください。
        </div>
        `;

        document.getElementById('bcSave').addEventListener('click', () => {
            const wake = document.getElementById('bcWake').value || '07:00';
            const sleep = document.getElementById('bcSleep').value || '23:00';
            YEStorage.set(BC_KEY, { wake, sleep });
            render();
        });

        renderNotify();
    }

    /* ---- 通知設定 ---- */
    function renderNotify() {
        const box = document.getElementById('bcNotify');
        if (!box) return;

        const s = NotifyCenter.get();
        const perm = NotifyCenter.permission();

        let status = '';
        if (perm === 'unsupported') status = 'この環境では通知が使えません。';
        else if (perm === 'denied') status = 'ブラウザ側で通知がブロックされています。設定から許可すると使えます。';
        else if (perm === 'granted') status = s.enabled ? `毎日 ${s.bedtime} ごろに、1回だけお知らせします。` : '許可済みです。オンにすると届きます。';
        else status = 'まだ許可していません。';

        box.innerHTML = `
            <div class="bc__panel-h">おやすみのお知らせ</div>
            <p class="bc__panel-sub">
                通知は<strong>1日1回、寝る時刻のぶんだけ</strong>です。記録が途切れたこと、スコアが下がったこと、連続日数、食事の間隔については通知しません。急かすための通知は作らない方針です。
            </p>
            <div class="bc__times">
                <div class="bc__field">
                    <label for="bcBed">お知らせの時刻</label>
                    <input type="time" id="bcBed" value="${s.bedtime}">
                </div>
                <div class="bc__field" style="display:flex; align-items:flex-end;">
                    <button class="bc__btn ${s.enabled ? '' : 'bc__btn--main'}" id="bcToggle" type="button"
                        ${perm === 'unsupported' || perm === 'denied' ? 'disabled' : ''}>
                        ${s.enabled ? 'オフにする' : 'オンにする'}
                    </button>
                </div>
            </div>
            <p class="bc__status" style="margin-top:12px;">${status}</p>
            <p class="bc__status" style="margin-top:6px;">
                ※ いまはアプリを開いているあいだに時刻を過ぎた場合に届きます。閉じていても届く通知にするには配信サーバーが必要です。
            </p>
        `;

        document.getElementById('bcBed').addEventListener('change', e => {
            NotifyCenter.save({ bedtime: e.target.value || '23:00' });
            renderNotify();
        });

        document.getElementById('bcToggle').addEventListener('click', async () => {
            const cur = NotifyCenter.get();
            if (cur.enabled) {
                NotifyCenter.save({ enabled: false });
                renderNotify();
                return;
            }
            const result = await NotifyCenter.requestPermission();
            if (result === 'granted') {
                await NotifyCenter.registerSW('../');
                NotifyCenter.save({ enabled: true });
            }
            renderNotify();
        });
    }

    render();
    setInterval(render, 60 * 1000);

    // 通知の見張り（1日1回の上限は NotifyCenter 側で担保）
    if (NotifyCenter.get().enabled && NotifyCenter.permission() === 'granted') {
        NotifyCenter.registerSW('../').then(() => NotifyCenter.startWatch());
    }
})();
