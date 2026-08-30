/**
 * 細胞周期（cellcycle.js）
 *
 * G1 → S → G2 → M の輪と、そこから外れた G0。
 *
 * この節がここにある理由：
 *   「分裂が増える＝若返る」という誤解をいちばん強く崩せるのが、
 *   分裂しない細胞の存在と、チェックポイントの存在だから。
 *   分裂は増やすものではなく、必要なところで必要なだけ起きるもの。
 *
 * 依存: なし（turnover ページに同梱）
 */

const CC_PHASES = [
    { key: 'G1', from: 0,    to: 0.46, color: '#c9a96e', label: 'G1期', sub: '育つ・準備する' },
    { key: 'S',  from: 0.46, to: 0.79, color: '#8eb4c7', label: 'S期',  sub: 'DNAを複製する' },
    { key: 'G2', from: 0.79, to: 0.96, color: '#a8c4a2', label: 'G2期', sub: '複製を確かめる' },
    { key: 'M',  from: 0.96, to: 1.0,  color: '#c9899a', label: 'M期',  sub: '分かれる' }
];

(function () {
    const root = document.getElementById('cellcycle');
    if (!root) return;

    const CX = 110, CY = 120, R = 76;

    function polar(r, frac) {
        const a = (frac * 360 - 90) * Math.PI / 180;
        return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
    }

    function arc(r, from, to) {
        const sweep = (to - from) * 360;
        const [x1, y1] = polar(r, from);
        const [x2, y2] = polar(r, to);
        return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    }

    const bands = CC_PHASES.map(p =>
        `<path d="${arc(R, p.from, p.to)}" fill="none" stroke="${p.color}" stroke-width="20" stroke-linecap="butt"/>`
    ).join('');

    const labels = CC_PHASES.map(p => {
        const mid = (p.from + p.to) / 2;
        const [x, y] = polar(R + 30, mid);
        // M期は幅が狭いので少し外へ
        const [lx, ly] = p.key === 'M' ? polar(R + 40, mid) : [x, y];
        return `
        <text class="cc__label" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" fill="${p.color}">${p.label}</text>
        <text class="cc__sub" x="${lx.toFixed(1)}" y="${(ly + 13).toFixed(1)}" text-anchor="middle">${p.sub}</text>`;
    }).join('');

    root.innerHTML = `
    <div class="cc__stage">
        <svg viewBox="0 0 340 250" xmlns="http://www.w3.org/2000/svg" role="img"
             aria-label="細胞周期の輪。G1期、S期、G2期、M期と、輪から外れたG0期">
            ${bands}
            ${labels}

            <!-- 周回する点 -->
            <g class="cc__dot">
                <circle cx="${CX}" cy="${CY - R}" r="7" fill="#2e2622"/>
            </g>

            <text class="cc__mid" x="${CX}" y="${CY - 6}" text-anchor="middle">ひとまわりで</text>
            <text class="cc__mid" x="${CX}" y="${CY + 10}" text-anchor="middle">細胞がふたつに</text>

            <!-- G0 への分岐 -->
            <path d="M${CX + R + 6} ${CY}L${CX + R + 44} ${CY}" stroke="#b8a08d" stroke-width="2"
                  stroke-dasharray="5 4"/>
            <path d="M${CX + R + 44} ${CY}l-7 -4v8z" fill="#b8a08d"/>
            <circle cx="272" cy="120" r="36" fill="#f4ede4" stroke="#b8a08d" stroke-width="2"/>
            <text class="cc__label" x="272" y="118" text-anchor="middle" fill="#a78a6b">G0期</text>
            <text class="cc__sub" x="272" y="133" text-anchor="middle">輪から外れて休む</text>

            <text class="cc__sub" x="170" y="228" text-anchor="middle">分かれる時間（M期）は、ひとまわりのうちのごく一部です</text>
        </svg>
    </div>

    <p class="tv__panel-sub" style="margin-bottom:14px;">
        細胞は準備をして、DNAを複製して、確かめて、最後に分かれます。この輪をひとまわりする長さは細胞の種類でまったく違い、
        速いものは一日足らず、そもそも回らないものもあります。輪から外れて休んでいる状態が <strong>G0期</strong> で、
        体のほとんどの細胞はふだんここにいます。
    </p>

    <div class="cc__kinds">
        <div class="cc__kind">
            <div class="cc__kind-h" style="color:#c9a96e">よく回る細胞</div>
            <p class="cc__kind-b">腸の粘膜、骨髄の血をつくる細胞、毛のもとになる細胞、表皮のいちばん下の層。
            <b>毎日たくさん分裂して、すり減った分を補っています。</b></p>
        </div>
        <div class="cc__kind">
            <div class="cc__kind-h" style="color:#a8c4a2">必要なときだけ回る細胞</div>
            <p class="cc__kind-b">肝臓の細胞、線維芽細胞など。ふだんはG0期で休んでいて、
            <b>傷ができたときなど、呼ばれたときだけ輪に戻ります。</b></p>
        </div>
        <div class="cc__kind">
            <div class="cc__kind-h" style="color:#8a7d76">ほとんど回らない細胞</div>
            <p class="cc__kind-b">神経細胞、心臓の筋肉の細胞、目のレンズの中心の細胞。
            <b>生まれたころのものが、そのまま一生はたらき続けます。</b></p>
        </div>
    </div>
    `;
})();
