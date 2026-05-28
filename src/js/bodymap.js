/**
 * Body Map - エクソソーム体内マップ（キャラ顔バージョン）
 *
 * 中央にりんくの顔を大きく配置、周囲に6つの部位ポイントを円周状に配置する。
 * 各部位は対応するセルフケアアクションで「光って」「キラキラが立ち上る」演出。
 */

const BODY_REGIONS = [
    {
        id: 'hair',
        name: '髪 エクソ',
        emoji: '💆',
        careId: 'hair_care'
    },
    {
        id: 'face',
        name: '美肌 エクソ',
        emoji: '✨',
        careId: 'skincare'
    },
    {
        id: 'eyes',
        name: '目元 エクソ',
        emoji: '😴',
        careId: 'sleep'
    },
    {
        id: 'circulation',
        name: '循環 エクソ',
        emoji: '💧',
        careId: 'water'
    },
    {
        id: 'body',
        name: '腸内 エクソ',
        emoji: '🥗',
        careId: 'food'
    },
    {
        id: 'limbs',
        name: '筋肉 エクソ',
        emoji: '🏃',
        careId: 'exercise'
    }
];

/**
 * Body Mapを描画
 * @param {string} containerId - 挿入先のid
 * @param {Set<string>} activeCareIds - 達成済みのセルフケアID（または部位ID）
 * @param {number} depth - パス用
 */
function renderBodyMap(containerId, activeCareIds = new Set(), depth = 0) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 達成項目数 = 部位数で生成エクソ数を概算
    const activeRegions = BODY_REGIONS.filter(r =>
        activeCareIds.has(r.careId) || activeCareIds.has(r.id)
    );
    const activeCount = activeRegions.length;
    const exoCount = activeCount * 42 + (activeCount > 0 ? Math.floor(Math.random() * 12) : 0);

    // メインキャラ画像（りんく）
    const faceImg = getImagePath('rink', 'smileOpen', depth);

    container.innerHTML = `
        <div class="bodymap-card">
            <div class="bodymap-card__header">
                <div class="bodymap-card__chip">Body Signal Map</div>
                <div class="bodymap-card__title">体内エクソソーム活性</div>
                <div class="bodymap-card__count">
                    ${exoCount.toLocaleString()}<span class="bodymap-card__count-unit">粒 / 本日</span>
                </div>
            </div>

            <div class="charmap">
                <!-- 後光 -->
                <div class="charmap__halo"></div>
                <!-- 接続線 -->
                <svg class="charmap__lines" viewBox="0 0 100 100" preserveAspectRatio="none">
                    ${BODY_REGIONS.map(r => {
                        const pos = getRegionPosition(r.id);
                        const isActive = activeCareIds.has(r.careId) || activeCareIds.has(r.id);
                        return `<line class="charmap__line ${isActive ? 'is-active' : ''} charmap__point--${r.id}" x1="50" y1="50" x2="${pos.x}" y2="${pos.y}"/>`;
                    }).join('')}
                </svg>
                <!-- 外周リング -->
                <div class="charmap__ring"></div>
                <!-- キャラ顔 -->
                <div class="charmap__face">
                    <img src="${faceImg}" alt="りんく">
                </div>
                <!-- 部位ポイント -->
                ${BODY_REGIONS.map(r => {
                    const isActive = activeCareIds.has(r.careId) || activeCareIds.has(r.id);
                    return `
                        <div class="charmap__point charmap__point--${r.id} ${isActive ? 'is-active' : ''}" data-id="${r.id}">
                            <div class="charmap__point-bubble">
                                ${r.emoji}
                                <span class="charmap__point-spark">✨</span>
                            </div>
                            <div class="charmap__point-label">${r.name}</div>
                        </div>
                    `;
                }).join('')}
            </div>

            <div class="bodymap-legend">
                ${BODY_REGIONS.map(r => {
                    const isActive = activeCareIds.has(r.careId) || activeCareIds.has(r.id);
                    return `
                        <div class="bodymap-legend__item bodymap-legend__item--${r.id} ${isActive ? 'bodymap-legend__item--active' : ''}">
                            <span class="bodymap-legend__dot"></span>
                            <span class="bodymap-legend__name">${r.name}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

/**
 * 部位の位置（SVG接続線用 0-100座標系）
 */
function getRegionPosition(regionId) {
    const positions = {
        hair:        { x: 50, y: 8  },
        face:        { x: 18, y: 22 },
        eyes:        { x: 82, y: 22 },
        circulation: { x: 12, y: 70 },
        body:        { x: 50, y: 92 },
        limbs:       { x: 88, y: 70 }
    };
    return positions[regionId] || { x: 50, y: 50 };
}
