/**
 * Doctor Memo - 先生への質問・体調メモ
 *
 * 「次回お会いするとき聞きたいこと」を記録して、
 * クリニックで画面ごと見せられるようにする。
 *
 * 全てローカル保存（プライバシー◎）。
 */

const MEMO_TEMPLATES = [
    '最近の体調変化について',
    '前回の施術後の経過',
    '次回の点滴・施術タイミング',
    '気になる肌の変化',
    '組み合わせ可能なサプリ',
    '生活で気をつけること',
    '次のステップアップ施術'
];

// ロンジェビティ（予防・健康投資）視点の相談テンプレ。
// 「悪くなってから行く」のではなく「先に整える」予防医療の相談を後押しする。
const MEMO_LONGEVITY_TEMPLATES = [
    '点滴・サプリの効果的なタイミング',
    'アプリで記録した睡眠データの相談',
    '受けておくとよい検査・バイオマーカー',
    '今の生活で足りていない長寿スキル',
    '疲労回復・睡眠の質を上げる方法',
    '年齢に合わせた予防ケアの優先順位'
];

/** メモ全件を取得（古い→新しい） */
function getAllMemos() {
    return YEStorage.get('doctor_memos', []);
}

/** メモ追加 */
function addMemo(text, type = 'question') {
    if (!text || !text.trim()) return;
    const memos = getAllMemos();
    memos.push({
        id: Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        text: text.trim(),
        type: type,  // 'question' or 'body'
        createdAt: new Date().toISOString(),
        done: false
    });
    YEStorage.set('doctor_memos', memos);
}

/** メモ削除 */
function removeMemo(id) {
    const memos = getAllMemos().filter(m => m.id !== id);
    YEStorage.set('doctor_memos', memos);
}

/** メモのdone切り替え */
function toggleMemoDone(id) {
    const memos = getAllMemos();
    const m = memos.find(x => x.id === id);
    if (m) m.done = !m.done;
    YEStorage.set('doctor_memos', memos);
}

/** 全部クリア（来院後） */
function clearAllMemos() {
    YEStorage.set('doctor_memos', []);
}

/** 未完了の質問数 */
function getOpenMemoCount() {
    return getAllMemos().filter(m => !m.done).length;
}

/**
 * Today画面に Doctor Memo カードを挿入
 */
function renderDoctorMemo(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    function rebuild() {
        const memos = getAllMemos();
        const open = memos.filter(m => !m.done);
        const done = memos.filter(m => m.done);

        container.innerHTML = `
            <div class="doctor-memo" style="background:#fff; border-radius:22px; padding:20px; box-shadow:0 4px 20px rgba(46,38,34,.06); margin-bottom:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <div style="font-family:'Noto Serif JP',serif; font-size:1rem; font-weight:600; letter-spacing:.08em;">
                        💬 次回、先生に聞きたいこと
                    </div>
                    <div style="font-size:.78rem; color:#8a7d76; font-weight:600;">
                        ${open.length > 0 ? `<span style="color:#c9899a; font-family:'Noto Serif JP',serif;">${open.length}</span>件` : '空'}
                    </div>
                </div>

                <p style="font-size:.7rem; color:#8a7d76; margin-bottom:14px; letter-spacing:.04em; line-height:1.5;">
                    通院前にメモして、画面を見せながらお話できます。
                </p>

                <!-- 入力欄 -->
                <div style="display:flex; gap:6px; margin-bottom:14px;">
                    <input type="text" id="memo-input" placeholder="聞きたいこと・気になることを入力…" style="flex:1; padding:10px 12px; border:1.5px solid #ebe0d0; border-radius:10px; font-size:.85rem; font-family:inherit; background:#faf6f1; color:#2e2622;">
                    <button id="memo-add" style="padding:0 16px; background:linear-gradient(135deg, #c9899a, #c9a96e); color:#fff; border:none; border-radius:10px; font-size:.8rem; font-weight:700; letter-spacing:.05em; cursor:pointer; flex-shrink:0;">追加</button>
                </div>

                <!-- テンプレートチップ -->
                <div style="margin-bottom:10px;">
                    <div style="font-size:.65rem; color:#8a7d76; letter-spacing:.1em; margin-bottom:6px;">💡 よくある質問テンプレ</div>
                    <div style="display:flex; gap:5px; flex-wrap:wrap;">
                        ${MEMO_TEMPLATES.map(t => `
                            <button class="memo-template" data-text="${t}" style="padding:4px 10px; background:#faf6f1; border:1px solid #ebe0d0; border-radius:999px; font-size:.7rem; color:#8a7d76; cursor:pointer; letter-spacing:.02em;">${t}</button>
                        `).join('')}
                    </div>
                </div>

                <!-- ロンジェビティ（予防・健康投資）相談テンプレ -->
                <div style="margin-bottom:14px;">
                    <div style="font-size:.65rem; color:#a78a6b; letter-spacing:.1em; margin-bottom:6px;">🧬 ロンジェビティ相談（予防・健康投資）</div>
                    <div style="display:flex; gap:5px; flex-wrap:wrap;">
                        ${MEMO_LONGEVITY_TEMPLATES.map(t => `
                            <button class="memo-template" data-text="${t}" style="padding:4px 10px; background:rgba(167,138,107,.08); border:1px solid #ddccb5; border-radius:999px; font-size:.7rem; color:#a78a6b; cursor:pointer; letter-spacing:.02em;">${t}</button>
                        `).join('')}
                    </div>
                </div>

                <!-- 未完了メモ -->
                ${open.length > 0 ? `
                    <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:${done.length > 0 ? '14px' : '0'};">
                        ${open.map(m => `
                            <div style="display:flex; align-items:center; gap:8px; padding:10px 12px; background:#faf6f1; border-radius:10px; border-left:3px solid #c9899a;">
                                <button class="memo-toggle" data-id="${m.id}" style="width:22px; height:22px; border-radius:50%; border:1.5px solid #c9899a; background:#fff; cursor:pointer; flex-shrink:0; padding:0;"></button>
                                <span style="flex:1; font-size:.85rem; color:#2e2622; letter-spacing:.02em; line-height:1.5;">${escapeHtml(m.text)}</span>
                                <button class="memo-delete" data-id="${m.id}" style="background:transparent; border:none; color:#b39a8b; cursor:pointer; font-size:1rem; padding:2px 6px;">×</button>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div style="text-align:center; padding:14px; color:#8a7d76; font-size:.8rem; background:#faf6f1; border-radius:10px;">
                        まだ質問がありません。気になることをメモしておきましょう。
                    </div>
                `}

                <!-- 完了済み -->
                ${done.length > 0 ? `
                    <details style="margin-top:8px;">
                        <summary style="cursor:pointer; font-size:.72rem; color:#8a7d76; letter-spacing:.05em; padding:4px 0;">✓ 解決済み (${done.length})</summary>
                        <div style="display:flex; flex-direction:column; gap:4px; margin-top:6px;">
                            ${done.map(m => `
                                <div style="display:flex; align-items:center; gap:8px; padding:6px 12px; font-size:.78rem; color:#8a7d76;">
                                    <button class="memo-toggle" data-id="${m.id}" style="width:18px; height:18px; border-radius:50%; border:none; background:linear-gradient(135deg,#a8c4a2,#8eb4c7); color:#fff; font-size:.6rem; cursor:pointer; flex-shrink:0; padding:0; line-height:1;">✓</button>
                                    <span style="flex:1; text-decoration:line-through;">${escapeHtml(m.text)}</span>
                                    <button class="memo-delete" data-id="${m.id}" style="background:transparent; border:none; color:#b39a8b; cursor:pointer; font-size:.9rem; padding:2px 6px;">×</button>
                                </div>
                            `).join('')}
                        </div>
                    </details>
                ` : ''}
            </div>
        `;

        // 入力欄
        const input = container.querySelector('#memo-input');
        const addBtn = container.querySelector('#memo-add');
        const submit = () => {
            const txt = input.value.trim();
            if (!txt) return;
            addMemo(txt);
            input.value = '';
            if (typeof App !== 'undefined') App.addEP(3, 'doctor_memo');
            rebuild();
        };
        addBtn.addEventListener('click', submit);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });

        // テンプレ
        container.querySelectorAll('.memo-template').forEach(btn => {
            btn.addEventListener('click', () => {
                input.value = btn.dataset.text;
                input.focus();
            });
        });

        // トグル
        container.querySelectorAll('.memo-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                toggleMemoDone(btn.dataset.id);
                rebuild();
            });
        });

        // 削除
        container.querySelectorAll('.memo-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                removeMemo(btn.dataset.id);
                rebuild();
            });
        });
    }

    rebuild();
}

/** XSS対策 */
function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}
