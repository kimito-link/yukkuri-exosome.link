/**
 * Body Map - エクソソーム体内マップ
 *
 * 6つの部位それぞれに対応するセルフケアアクションがあり、
 * 達成するとその部位が光って粒子が流れる演出が起きる。
 */

const BODY_REGIONS = [
    {
        id: 'hair',
        name: '髪 エクソ',
        nameEn: 'HAIR',
        carecareId: 'hair_care',
        // SVG座標（viewBox 200x320 想定）
        x: 100, y: 24,
        labelX: 100, labelY: 8,
        // 粒子の動き先
        particles: [
            { x: 100, y: 24 },
            { x: 94, y: 22 },
            { x: 106, y: 22 }
        ]
    },
    {
        id: 'face',
        name: '美肌 エクソ',
        nameEn: 'FACE',
        carecareId: 'skincare',
        x: 100, y: 56,
        labelX: 100, labelY: 100,
        particles: [
            { x: 100, y: 56 },
            { x: 88, y: 60 },
            { x: 112, y: 60 }
        ]
    },
    {
        id: 'eyes',
        name: '目元 エクソ',
        nameEn: 'EYES',
        carecareId: 'sleep',
        x: 100, y: 50,
        labelX: 60, labelY: 50,
        particles: [
            { x: 92, y: 50 },
            { x: 108, y: 50 },
            { x: 100, y: 52 }
        ]
    },
    {
        id: 'circulation',
        name: '循環 エクソ',
        nameEn: 'BLOOD',
        carecareId: 'water',
        x: 100, y: 134,
        labelX: 100, labelY: 196,
        particles: [
            { x: 100, y: 134 },
            { x: 92, y: 138 },
            { x: 108, y: 142 }
        ]
    },
    {
        id: 'body',
        name: '腸内 エクソ',
        nameEn: 'GUT',
        carecareId: 'food',
        x: 100, y: 170,
        labelX: 150, labelY: 170,
        particles: [
            { x: 100, y: 170 },
            { x: 92, y: 174 },
            { x: 108, y: 174 }
        ]
    },
    {
        id: 'limbs',
        name: '筋肉 エクソ',
        nameEn: 'MUSCLE',
        carecareId: 'exercise',
        x: 70, y: 200,
        labelX: 100, labelY: 290,
        particles: [
            { x: 70, y: 200 },
            { x: 130, y: 200 },
            { x: 100, y: 240 }
        ]
    }
];

/**
 * Body Mapを描画
 * @param {string} containerId - 挿入先のid
 * @param {Set<string>} activeCareIds - 達成済みのセルフケアID
 * @param {number} depth - パス用
 */
function renderBodyMap(containerId, activeCareIds = new Set(), depth = 0) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 達成項目数 = 部位数で生成エクソ数を概算
    const activeCount = BODY_REGIONS.filter(r => activeCareIds.has(r.carecareId)).length;
    const exoCount = activeCount * 42 + Math.floor(Math.random() * 12);

    // 各部位の活性状態
    const regions = BODY_REGIONS.map(r => ({
        ...r,
        active: activeCareIds.has(r.carecareId)
    }));

    container.innerHTML = `
        <div class="bodymap-card">
            <div class="bodymap-card__header">
                <div class="bodymap-card__chip">Body Signal Map</div>
                <div class="bodymap-card__title">体内エクソソーム活性</div>
                <div class="bodymap-card__count">
                    ${exoCount.toLocaleString()}<span class="bodymap-card__count-unit">粒 / 本日</span>
                </div>
            </div>

            ${renderBodySvg(regions)}

            <div class="bodymap-legend">
                ${regions.map(r => `
                    <div class="bodymap-legend__item bodymap-legend__item--${r.id} ${r.active ? 'bodymap-legend__item--active' : ''}">
                        <span class="bodymap-legend__dot"></span>
                        <span class="bodymap-legend__name">${r.name}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * 人型SVGを生成
 */
function renderBodySvg(regions) {
    return `
        <svg class="bodymap" viewBox="0 0 200 320" xmlns="http://www.w3.org/2000/svg">
            <!-- 髪（頭頂のフェザー風） -->
            <ellipse class="bodymap__silhouette" cx="100" cy="32" rx="32" ry="14"/>

            <!-- 顔 -->
            <ellipse class="bodymap__silhouette" cx="100" cy="60" rx="26" ry="32"/>
            <ellipse class="bodymap__silhouette-outline" cx="100" cy="60" rx="26" ry="32"/>

            <!-- 首 -->
            <rect class="bodymap__silhouette" x="92" y="88" width="16" height="14" rx="4"/>

            <!-- 肩・体幹（上半身） -->
            <path class="bodymap__silhouette" d="M 60 110
                Q 60 100 70 100
                L 130 100
                Q 140 100 140 110
                L 138 170
                Q 130 195 100 195
                Q 70 195 62 170
                Z"/>
            <path class="bodymap__silhouette-outline" d="M 60 110
                Q 60 100 70 100
                L 130 100
                Q 140 100 140 110
                L 138 170
                Q 130 195 100 195
                Q 70 195 62 170
                Z" fill="none"/>

            <!-- 腰 -->
            <path class="bodymap__silhouette" d="M 70 195
                L 130 195
                L 134 230
                L 66 230 Z"/>

            <!-- 腕（左右） -->
            <path class="bodymap__silhouette" d="M 60 110
                Q 50 115 46 140
                Q 44 165 48 195
                Q 49 205 56 206
                Q 62 205 62 195
                Q 60 170 60 145 Z"/>
            <path class="bodymap__silhouette" d="M 140 110
                Q 150 115 154 140
                Q 156 165 152 195
                Q 151 205 144 206
                Q 138 205 138 195
                Q 140 170 140 145 Z"/>

            <!-- 脚（左右） -->
            <path class="bodymap__silhouette" d="M 70 230
                L 88 230
                L 88 300
                Q 88 308 80 308
                Q 72 308 72 300 Z"/>
            <path class="bodymap__silhouette" d="M 112 230
                L 130 230
                L 128 300
                Q 128 308 120 308
                Q 112 308 112 300 Z"/>

            <!-- ハイライト（顔の中央に小さく光を入れる） -->
            <ellipse cx="100" cy="55" rx="20" ry="26"
                fill="white" opacity="0.3"/>

            <!-- ========== 部位マーカー ========== -->
            ${regions.map(r => `
                <g class="bodymap__region bodymap__region--${r.id} ${r.active ? 'bodymap__region--active' : ''}"
                   data-id="${r.id}">
                    <!-- パルス（拡散する波） -->
                    <circle class="bodymap__region-pulse" cx="${r.x}" cy="${r.y}" r="6"/>
                    <!-- メインの点 -->
                    <circle class="bodymap__region-circle" cx="${r.x}" cy="${r.y}" r="5"/>
                    <!-- 粒子（達成時に上に流れる） -->
                    ${r.particles.map((p, i) => `
                        <circle class="bodymap__particle" cx="${p.x}" cy="${p.y}" r="${1.5 + (i % 2)}"
                            style="animation-delay: ${i * 0.6}s;"/>
                    `).join('')}
                </g>
            `).join('')}
        </svg>
    `;
}
