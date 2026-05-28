/**
 * Photo Log - ビフォーアフター写真記録
 *
 * 顔写真を撮影/選択 → 端末内 IndexedDB に保存 → スライダーで比較
 *
 * プライバシー方針:
 * - すべて端末内（IndexedDB）で完結
 * - サーバーには一切送信しない
 * - localStorage には軽量メタ情報のみ保存
 * - リサイズして容量削減（最大長辺800px、JPEG 0.85）
 */

const PHOTO_DB_NAME = 'ye_photolog_v1';
const PHOTO_STORE = 'photos';

/** IndexedDB 接続 */
function openPhotoDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(PHOTO_DB_NAME, 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(PHOTO_STORE)) {
                const store = db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
                store.createIndex('takenAt', 'takenAt');
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

/** 写真追加 */
async function savePhoto(blob, note = '') {
    const db = await openPhotoDB();
    const id = Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const photo = {
        id,
        blob,
        note,
        takenAt: new Date().toISOString()
    };
    return new Promise((resolve, reject) => {
        const tx = db.transaction(PHOTO_STORE, 'readwrite');
        tx.objectStore(PHOTO_STORE).add(photo);
        tx.oncomplete = () => resolve(photo);
        tx.onerror = () => reject(tx.error);
    });
}

/** 写真全件取得（新しい→古い） */
async function getAllPhotos() {
    const db = await openPhotoDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(PHOTO_STORE, 'readonly');
        const req = tx.objectStore(PHOTO_STORE).getAll();
        req.onsuccess = () => {
            const list = (req.result || []).sort((a, b) =>
                b.takenAt.localeCompare(a.takenAt)
            );
            resolve(list);
        };
        req.onerror = () => reject(req.error);
    });
}

/** 写真削除 */
async function deletePhoto(id) {
    const db = await openPhotoDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(PHOTO_STORE, 'readwrite');
        tx.objectStore(PHOTO_STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/** Blob → URL（Object URL） */
function blobToUrl(blob) {
    return URL.createObjectURL(blob);
}

/** 画像をリサイズしてJPEG Blobに変換 */
async function resizeImage(file, maxSide = 800, quality = 0.85) {
    const img = new Image();
    const url = URL.createObjectURL(file);
    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
    });

    let { width, height } = img;
    if (width > maxSide || height > maxSide) {
        if (width > height) {
            height = Math.round(height * (maxSide / width));
            width = maxSide;
        } else {
            width = Math.round(width * (maxSide / height));
            height = maxSide;
        }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);

    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
    });
}

/** 日付フォーマット */
function formatPhotoDate(isoStr) {
    const d = new Date(isoStr);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const w = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
    return `${m}月${day}日（${w}）`;
}

/** どのくらい前か */
function daysAgo(isoStr) {
    const d = new Date(isoStr);
    const today = new Date();
    const diff = Math.floor((today - d) / (1000 * 60 * 60 * 24));
    if (diff === 0) return '今日';
    if (diff === 1) return '昨日';
    if (diff < 7) return `${diff}日前`;
    if (diff < 30) return `${Math.floor(diff / 7)}週前`;
    return `${Math.floor(diff / 30)}か月前`;
}

/**
 * Today画面に Photo Log カードを挿入
 */
async function renderPhotoLog(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let compareMode = false;
    let beforeId = null;
    let afterId = null;

    async function rebuild() {
        let photos = [];
        try {
            photos = await getAllPhotos();
        } catch (e) {
            console.warn('Photo DB error:', e);
        }

        const photosCount = photos.length;
        const oldest = photos[photos.length - 1];
        const newest = photos[0];

        // Object URL 生成
        const photoUrls = {};
        photos.forEach(p => {
            photoUrls[p.id] = blobToUrl(p.blob);
        });

        // 初期選択
        if (compareMode && !beforeId && !afterId && photos.length >= 2) {
            beforeId = photos[photos.length - 1].id;
            afterId = photos[0].id;
        }

        container.innerHTML = `
            <div class="photo-log" style="background:#fff; border-radius:22px; padding:20px; box-shadow:0 4px 20px rgba(46,38,34,.06); margin-bottom:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <div style="font-family:'Noto Serif JP',serif; font-size:1rem; font-weight:600; letter-spacing:.08em;">
                        📸 自分の変化を記録
                    </div>
                    <div style="font-size:.78rem; color:#8a7d76; font-weight:600;">
                        ${photosCount > 0 ? `<span style="color:#c9899a; font-family:'Noto Serif JP',serif;">${photosCount}</span>枚` : '0枚'}
                    </div>
                </div>

                <p style="font-size:.7rem; color:#8a7d76; margin-bottom:14px; letter-spacing:.04em; line-height:1.5;">
                    週1回ペースで撮影 → ビフォーアフター比較。<br>
                    📌 写真は<strong>すべて端末内</strong>にだけ保存、外部送信しません。
                </p>

                <!-- 撮影ボタン -->
                <label for="photo-input" style="display:flex; align-items:center; justify-content:center; gap:10px; padding:14px; background:linear-gradient(135deg,#c9899a,#c9a96e); color:#fff; border-radius:12px; cursor:pointer; font-weight:700; letter-spacing:.05em; font-size:.9rem; margin-bottom:14px;">
                    📷 写真を追加（撮影 or 選択）
                </label>
                <input type="file" id="photo-input" accept="image/*" capture="user" style="display:none;">

                ${photosCount === 0 ? `
                    <div style="text-align:center; padding:24px 14px; color:#8a7d76; font-size:.85rem; background:#faf6f1; border-radius:12px; line-height:1.6;">
                        まだ写真がありません。<br>
                        最初の1枚を撮ってベースラインに🌸
                    </div>
                ` : ''}

                ${photosCount >= 2 ? `
                    <div style="display:flex; gap:6px; margin-bottom:12px;">
                        <button id="photo-compare-toggle" style="flex:1; padding:10px; background:${compareMode ? '#c9899a' : 'transparent'}; color:${compareMode ? '#fff' : '#c9899a'}; border:1.5px solid #c9899a; border-radius:10px; font-size:.85rem; font-weight:700; cursor:pointer; letter-spacing:.05em;">
                            ${compareMode ? '✕ 比較モード終了' : '⇄ ビフォーアフター比較'}
                        </button>
                    </div>
                ` : ''}

                ${compareMode && photos.length >= 2 ? `
                    <div style="margin-bottom:14px; padding:12px; background:#faf6f1; border-radius:12px;">
                        <div style="display:flex; gap:8px;">
                            <!-- Before -->
                            <div style="flex:1; text-align:center;">
                                <div style="font-size:.65rem; color:#8a7d76; letter-spacing:.15em; margin-bottom:4px;">BEFORE</div>
                                <select id="photo-before" style="width:100%; padding:6px; border:1px solid #ebe0d0; border-radius:6px; font-size:.75rem; background:#fff; color:#2e2622; margin-bottom:6px;">
                                    ${photos.map(p => `<option value="${p.id}" ${p.id === beforeId ? 'selected' : ''}>${formatPhotoDate(p.takenAt)} (${daysAgo(p.takenAt)})</option>`).join('')}
                                </select>
                                ${beforeId ? `<img src="${photoUrls[beforeId]}" style="width:100%; aspect-ratio:1; object-fit:cover; border-radius:8px; border:2px solid #c9899a;">` : ''}
                            </div>
                            <!-- After -->
                            <div style="flex:1; text-align:center;">
                                <div style="font-size:.65rem; color:#8a7d76; letter-spacing:.15em; margin-bottom:4px;">AFTER</div>
                                <select id="photo-after" style="width:100%; padding:6px; border:1px solid #ebe0d0; border-radius:6px; font-size:.75rem; background:#fff; color:#2e2622; margin-bottom:6px;">
                                    ${photos.map(p => `<option value="${p.id}" ${p.id === afterId ? 'selected' : ''}>${formatPhotoDate(p.takenAt)} (${daysAgo(p.takenAt)})</option>`).join('')}
                                </select>
                                ${afterId ? `<img src="${photoUrls[afterId]}" style="width:100%; aspect-ratio:1; object-fit:cover; border-radius:8px; border:2px solid #c9a96e;">` : ''}
                            </div>
                        </div>
                    </div>
                ` : ''}

                ${!compareMode && photosCount > 0 ? `
                    <!-- グリッド表示 -->
                    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px;">
                        ${photos.slice(0, 9).map(p => `
                            <div style="position:relative; aspect-ratio:1;">
                                <img src="${photoUrls[p.id]}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">
                                <div style="position:absolute; bottom:4px; left:4px; right:4px; padding:2px 4px; background:rgba(0,0,0,.6); color:#fff; font-size:.6rem; border-radius:4px; text-align:center;">${daysAgo(p.takenAt)}</div>
                                <button class="photo-delete" data-id="${p.id}" style="position:absolute; top:4px; right:4px; background:rgba(0,0,0,.7); color:#fff; border:none; width:22px; height:22px; border-radius:50%; cursor:pointer; font-size:.85rem; padding:0; line-height:1;">×</button>
                            </div>
                        `).join('')}
                    </div>
                    ${photos.length > 9 ? `<div style="text-align:center; font-size:.7rem; color:#8a7d76; margin-top:8px;">他 ${photos.length - 9} 枚</div>` : ''}
                ` : ''}

                ${photosCount > 0 ? `
                    <div style="margin-top:12px; padding:8px; background:#faf6f1; border-radius:8px; font-size:.65rem; color:#8a7d76; line-height:1.5; letter-spacing:.03em;">
                        🔒 写真は<strong>あなたの端末にのみ</strong>保存されます。アプリのリセットや他端末からは見えません。
                    </div>
                ` : ''}
            </div>
        `;

        // 写真選択
        const fileInput = container.querySelector('#photo-input');
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const blob = await resizeImage(file);
                await savePhoto(blob);
                if (typeof App !== 'undefined') App.addEP(10, 'photo_log');
                if (typeof App !== 'undefined' && App.showToast) {
                    App.showToast('写真を保存しました', '📸');
                }
                rebuild();
            } catch (err) {
                console.error(err);
                alert('写真の保存に失敗しました：' + err.message);
            }
            fileInput.value = '';
        });

        // 比較モードトグル
        container.querySelector('#photo-compare-toggle')?.addEventListener('click', () => {
            compareMode = !compareMode;
            if (compareMode) {
                beforeId = photos[photos.length - 1].id;
                afterId = photos[0].id;
            }
            rebuild();
        });

        // Before/After 選択変更
        container.querySelector('#photo-before')?.addEventListener('change', (e) => {
            beforeId = e.target.value;
            rebuild();
        });
        container.querySelector('#photo-after')?.addEventListener('change', (e) => {
            afterId = e.target.value;
            rebuild();
        });

        // 削除
        container.querySelectorAll('.photo-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm('この写真を削除しますか？\n（端末からも完全に削除されます）')) return;
                await deletePhoto(btn.dataset.id);
                rebuild();
            });
        });
    }

    rebuild();
}
