/**
 * Next Boost Reminder - 次回点滴・サプリ予定リマインダー
 *
 * 次回の点滴・施術日を登録して、カウントダウン表示。
 * ブラウザ通知も対応。
 *
 * ローカル保存。
 */

const REMINDER_PRESETS = [
    { label: '1週間後',   days: 7 },
    { label: '2週間後',   days: 14 },
    { label: '3週間後',   days: 21 },
    { label: '1か月後',   days: 30 },
    { label: '6週間後',   days: 42 },
    { label: '2か月後',   days: 60 },
    { label: '3か月後',   days: 90 }
];

/** 次回予定を取得 */
function getNextReminder() {
    return YEStorage.get('next_boost_reminder', null);
}

/** 次回予定を設定 */
function setNextReminder(itemName, date) {
    YEStorage.set('next_boost_reminder', {
        item: itemName,
        date: date,  // ISO date string YYYY-MM-DD
        createdAt: new Date().toISOString()
    });
}

/** クリア */
function clearReminder() {
    YEStorage.remove('next_boost_reminder');
}

/** 日付差（日数、整数） */
function daysDiff(targetDateStr) {
    const target = new Date(targetDateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

/** 日付を YYYY-MM-DD で取得 */
function dateToInputStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** 日付フォーマット（M月D日(曜)） */
function formatReminderDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const w = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
    return `${m}月${day}日（${w}）`;
}

/**
 * Today画面に Next Boost Reminder カードを挿入
 */
function renderNextReminder(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let isEditMode = false;

    function rebuild() {
        const reminder = getNextReminder();
        const hasReminder = reminder && reminder.date;
        const diff = hasReminder ? daysDiff(reminder.date) : null;
        const isPast = diff !== null && diff < 0;
        const isToday = diff === 0;

        let bgGrad, accent, status;
        if (!hasReminder) {
            bgGrad = '#fff';
            accent = '#8a7d76';
            status = '';
        } else if (isPast) {
            bgGrad = 'linear-gradient(135deg, #f5e6ea, #fff)';
            accent = '#c9899a';
            status = `<span style="font-weight:700;">${Math.abs(diff)}日経過</span> — 終わったらクリアしてください`;
        } else if (isToday) {
            bgGrad = 'linear-gradient(135deg, #fff5e6, #fff)';
            accent = '#c9a96e';
            status = '<span style="font-weight:700;">今日です！</span>';
        } else if (diff <= 3) {
            bgGrad = 'linear-gradient(135deg, #fff5e6, #fff)';
            accent = '#c9a96e';
            status = `<span style="font-weight:700;">あと ${diff} 日</span> — もうすぐです`;
        } else {
            bgGrad = 'linear-gradient(135deg, #f4ede4, #fff)';
            accent = '#a78a6b';
            status = `あと <span style="font-weight:700;">${diff} 日</span>`;
        }

        container.innerHTML = `
            <div class="next-reminder" style="background:${bgGrad}; border-radius:22px; padding:20px; box-shadow:0 4px 20px rgba(46,38,34,.06); margin-bottom:20px; border-left:3px solid ${accent};">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <div style="font-family:'Noto Serif JP',serif; font-size:1rem; font-weight:600; letter-spacing:.08em;">
                        📅 次回の予定
                    </div>
                    ${hasReminder && !isEditMode ? `
                        <button id="reminder-edit" style="background:transparent; border:1px solid #ebe0d0; color:#8a7d76; padding:3px 10px; border-radius:999px; font-size:.7rem; cursor:pointer; letter-spacing:.05em;">変更</button>
                    ` : ''}
                </div>

                ${!hasReminder || isEditMode ? `
                    <p style="font-size:.72rem; color:#8a7d76; margin-bottom:12px; letter-spacing:.04em; line-height:1.5;">
                        次回の点滴・サプリ補充・通院予定を登録すると、ホームに表示されます。
                    </p>

                    <input type="text" id="reminder-name" placeholder="例：エクソソーム点滴、NMNサプリ補充" value="${(reminder && reminder.item) || ''}" style="width:100%; padding:10px 12px; border:1.5px solid #ebe0d0; border-radius:10px; font-size:.85rem; font-family:inherit; background:#faf6f1; color:#2e2622; margin-bottom:10px; box-sizing:border-box;">

                    <div style="margin-bottom:10px;">
                        <div style="font-size:.65rem; color:#8a7d76; letter-spacing:.1em; margin-bottom:6px;">⏱ どのくらい先？</div>
                        <div style="display:flex; gap:5px; flex-wrap:wrap;">
                            ${REMINDER_PRESETS.map(p => `
                                <button class="reminder-preset" data-days="${p.days}" style="padding:5px 10px; background:#fff; border:1px solid #ebe0d0; border-radius:999px; font-size:.72rem; color:#2e2622; cursor:pointer; letter-spacing:.02em;">${p.label}</button>
                            `).join('')}
                        </div>
                    </div>

                    <input type="date" id="reminder-date" value="${(reminder && reminder.date) || ''}" style="width:100%; padding:10px 12px; border:1.5px solid #ebe0d0; border-radius:10px; font-size:.85rem; font-family:inherit; background:#faf6f1; color:#2e2622; margin-bottom:12px; box-sizing:border-box;">

                    <div style="display:flex; gap:6px;">
                        <button id="reminder-save" style="flex:1; padding:10px; background:linear-gradient(135deg,#c9899a,#c9a96e); color:#fff; border:none; border-radius:10px; font-size:.85rem; font-weight:700; letter-spacing:.05em; cursor:pointer;">保存</button>
                        ${hasReminder ? `<button id="reminder-cancel" style="padding:10px 16px; background:transparent; color:#8a7d76; border:1px solid #ebe0d0; border-radius:10px; font-size:.8rem; cursor:pointer;">キャンセル</button>` : ''}
                    </div>
                ` : `
                    <div style="display:flex; align-items:center; gap:14px;">
                        <div style="flex-shrink:0; text-align:center; padding:10px 14px; background:#fff; border-radius:14px; border:1.5px solid ${accent}; min-width:80px;">
                            <div style="font-size:.6rem; color:#8a7d76; letter-spacing:.1em; margin-bottom:2px;">NEXT</div>
                            <div style="font-family:'Noto Serif JP',serif; font-size:1.4rem; font-weight:700; color:${accent}; line-height:1;">
                                ${isPast ? '⏰' : (isToday ? '★' : diff)}
                            </div>
                            ${!isPast && !isToday ? `<div style="font-size:.6rem; color:#8a7d76; margin-top:2px;">日後</div>` : ''}
                        </div>
                        <div style="flex:1; min-width:0;">
                            <div style="font-size:.95rem; font-weight:700; color:#2e2622; margin-bottom:4px; letter-spacing:.03em;">
                                ${escapeHtml(reminder.item || '次回予定')}
                            </div>
                            <div style="font-size:.78rem; color:#8a7d76; margin-bottom:4px;">
                                ${formatReminderDate(reminder.date)}
                            </div>
                            <div style="font-size:.75rem; color:${accent}; letter-spacing:.03em;">
                                ${status}
                            </div>
                        </div>
                    </div>

                    <div style="margin-top:12px; display:flex; gap:6px;">
                        <button id="reminder-done" style="flex:1; padding:8px; background:transparent; color:#8a7d76; border:1px solid #ebe0d0; border-radius:10px; font-size:.78rem; cursor:pointer; letter-spacing:.05em;">✓ 通院済みにする</button>
                    </div>
                `}
            </div>
        `;

        // 編集モードの操作
        const nameInput = container.querySelector('#reminder-name');
        const dateInput = container.querySelector('#reminder-date');

        container.querySelectorAll('.reminder-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                const days = parseInt(btn.dataset.days, 10);
                const target = new Date();
                target.setDate(target.getDate() + days);
                if (dateInput) dateInput.value = dateToInputStr(target);
            });
        });

        const saveBtn = container.querySelector('#reminder-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const name = (nameInput?.value || '').trim() || '次回予定';
                const date = dateInput?.value;
                if (!date) {
                    alert('日付を選択してください');
                    return;
                }
                const wasNew = !getNextReminder();
                setNextReminder(name, date);
                if (wasNew && typeof App !== 'undefined') App.addEP(5, 'reminder_set');
                isEditMode = false;
                rebuild();
            });
        }

        container.querySelector('#reminder-cancel')?.addEventListener('click', () => {
            isEditMode = false;
            rebuild();
        });

        container.querySelector('#reminder-edit')?.addEventListener('click', () => {
            isEditMode = true;
            rebuild();
        });

        container.querySelector('#reminder-done')?.addEventListener('click', () => {
            if (confirm('「' + reminder.item + '」を通院済みにしますか？\n次の予定は新しく登録できます。')) {
                clearReminder();
                if (typeof App !== 'undefined') App.addEP(10, 'reminder_done');
                isEditMode = false;
                rebuild();
            }
        });
    }

    rebuild();
}
