/**
 * 記録の端末間引き継ぎ（ログインした人だけ）
 *
 * ★ログインしていない人には何も起きない。このファイルは一度も通信しない。
 *   端末内の localStorage が唯一の正、という今までの前提は変わらない。
 *
 * ★同期は「サーバーへの複製」であって「端末の記録の置き換え」ではない。
 *   サーバー側が古い内容で上書きされるようなことがあっても、端末の記録は消さない。
 *   健康の記録なので、失われる方向の動きは作らない。
 *
 * ★同期の状態を画面で煽らない（HANDOFF-20260824.md §5 / longevity SKILL.md）。
 *   「まだ同期していません」「◯日ぶんが未保存です」の類は出さない。
 *   失敗しても黙って次の機会に回す。記録そのものは端末に残っているので実害がない。
 *
 * 対象: 日次の記録だけ。設定（bodyclock_times 等）と写真は同期しない。
 *
 * 依存: common.js（YEStorage / getTodayKey）, auth.js（YEAuth）
 */

(function () {
    'use strict';

    var SYNC_ENDPOINT = 'https://kimito.link/api/app/exosome-sync';

    /**
     * 同期する記録の種類。
     * ★ここに設定系（bodyclock_times 等）を足さないこと。端末ごとに違ってよいもの。
     * ★写真（photolog / IndexedDB）も足さないこと。
     */
    var SYNC_PREFIXES = ['selfcare', 'mindcare', 'sleep', 'fatigue', 'skin', 'boost', 'meal'];

    var DATE_RE = /^(\d{4}-\d{2}-\d{2})$/;

    /** localStorage から「日付 → その日の記録」を組み立てる。 */
    function collectLocalDays() {
        var byDate = {};
        for (var i = 0; i < localStorage.length; i++) {
            var raw = localStorage.key(i);
            if (!raw || raw.indexOf('ye_') !== 0) continue;
            var key = raw.slice(3); // ye_ を外す
            var idx = key.lastIndexOf('_');
            if (idx < 0) continue;
            var prefix = key.slice(0, idx);
            var date = key.slice(idx + 1);
            if (SYNC_PREFIXES.indexOf(prefix) < 0) continue;
            if (!DATE_RE.test(date)) continue;

            var val = YEStorage.get(key, null);
            if (val === null) continue;
            if (!byDate[date]) byDate[date] = {};
            byDate[date][prefix] = val;
        }
        return byDate;
    }

    /** サーバーから受け取った1日分を localStorage に書き戻す。 */
    function applyDayToLocal(date, dayObj) {
        if (!dayObj || typeof dayObj !== 'object') return;
        for (var prefix in dayObj) {
            if (!Object.prototype.hasOwnProperty.call(dayObj, prefix)) continue;
            if (SYNC_PREFIXES.indexOf(prefix) < 0) continue; // 知らない種類は書かない
            YEStorage.set(prefix + '_' + date, dayObj[prefix]);
        }
    }

    function authedFetch(method, body) {
        return YEAuth.getSyncToken().then(function (token) {
            if (!token) return null; // 未ログイン。何もしない。
            var opts = {
                method: method,
                headers: { 'Authorization': 'Bearer ' + token }
            };
            if (body) {
                opts.headers['Content-Type'] = 'application/json';
                opts.body = JSON.stringify(body);
            }
            return fetch(SYNC_ENDPOINT, opts).then(function (res) {
                if (!res.ok) throw new Error('sync ' + method + ' failed: ' + res.status);
                return res.json();
            });
        });
    }

    /**
     * サーバーとローカルを突き合わせる。
     * - サーバーにしか無い日付 → ローカルへ書く（機種変更・2台目の初回）
     * - ローカルにしか無い日付 → サーバーへ送る
     * - 両方にある日付 → 触らない（サーバーの内容が正。日付キー単位の後勝ち）
     */
    function sync() {
        if (typeof YEAuth === 'undefined' || !YEAuth.isSignedIn()) {
            return Promise.resolve({ skipped: true });
        }

        var local = collectLocalDays();

        return authedFetch('GET').then(function (res) {
            if (!res || !res.ok) return { skipped: true };
            var remote = res.days || {};

            // サーバー → ローカル
            for (var date in remote) {
                if (!Object.prototype.hasOwnProperty.call(remote, date)) continue;
                if (local[date]) continue; // 両方にある日は触らない
                try {
                    applyDayToLocal(date, JSON.parse(remote[date]));
                } catch (e) { /* 壊れた1日分は飛ばす。他の日を巻き添えにしない。 */ }
            }

            // ローカル → サーバー
            var toPush = {};
            var pushCount = 0;
            for (var d in local) {
                if (!Object.prototype.hasOwnProperty.call(local, d)) continue;
                if (remote[d]) continue;
                toPush[d] = JSON.stringify(local[d]);
                pushCount++;
            }
            if (pushCount === 0) return { pulled: true, pushed: 0 };
            return authedFetch('POST', { days: toPush }).then(function () {
                return { pulled: true, pushed: pushCount };
            });
        });
    }

    /**
     * 1日分だけ送る（記録した直後に呼ぶ）。
     * ★失敗しても投げっぱなしにしない代わりに、画面には出さない。
     *   記録は既に端末に確定しているので、次回の sync() で拾える。
     */
    function pushToday() {
        if (typeof YEAuth === 'undefined' || !YEAuth.isSignedIn()) {
            return Promise.resolve({ skipped: true });
        }
        var date = getTodayKey();
        var local = collectLocalDays();
        if (!local[date]) return Promise.resolve({ skipped: true });

        var days = {};
        days[date] = JSON.stringify(local[date]);
        return authedFetch('POST', { days: days }).catch(function () {
            return { failed: true }; // 黙って諦める。次の機会に送る。
        });
    }

    /* ───────────────────────────────────────────────────────────────────
     * kimito.link ハブへの利用サマリ送信
     *
     * 「1ログインで全サービス」の共通アカウント基盤で、各サービスの利用状況を
     * kimito.link のダッシュボードに横断表示する（＝パスポートカード）。
     *
     * 受け口: kimitolink-linktree/app/api/hub/summary/route.ts
     * 契約:   kimitolink-linktree/docs/KIMITO-LINK-HUB-STRATEGY-DESIGN.md
     *
     * ★このファイルの原則をそのまま守る:
     *   未ログインなら何もしない / 失敗しても画面に出さない / 記録本体を巻き添えにしない。
     * ─────────────────────────────────────────────────────────────────── */

    var HUB_SUMMARY_URL = 'https://kimito.link/api/hub/summary';
    var HUB_APP_KEY = 'exosome';
    var HUB_LAST_SENT_KEY = 'hub_last_sent';
    var HUB_TIMEOUT_MS = 5000;

    /**
     * ★受け口が黙って捨てる値を、送る前に弾く。
     *
     *   kimito.link 側 lib/hub-metadata.ts は、送った項目が**全部**濾されると
     *   既存サマリを空 {} で上書きし、しかも {ok:true} を返す。
     *   ＝ 200 を見ても「保存された」とは限らない。
     *
     *   count : 数値のみ・負値と非有限は捨てる・小数は切り捨て
     *   label : 1〜40文字・★半角スペースと制御文字を1つでも含むと捨てる
     */
    function hubSendableCount(v) {
        return typeof v === 'number' && isFinite(v) && v >= 0;
    }

    function hubSendableLabel(v) {
        if (typeof v !== 'string' || v.length < 1 || v.length > 40) return false;
        for (var i = 0; i < v.length; i++) {
            var c = v.charCodeAt(i);
            if (c <= 0x20 || c === 0x7f) return false;
        }
        return true;
    }

    /**
     * 利用サマリをハブへ送る（best-effort）。
     *
     * ★呼ぶ側は待たないこと（記録の保存を遅らせない）。
     * ★★app_total_days は使わない。書き込みが src/index.html:91 の1箇所だけで、
     *   トップページを開いた日しか加算されない既存バグがあるため
     *   （garden.js のバッジと me.js の表示が実態より少なく出る）。
     *   記録から数えた collectLocalDays() の日数が正しい。
     */
    function pushHubSummary() {
        try {
            if (typeof YEAuth === 'undefined' || !YEAuth.isSignedIn()) return Promise.resolve({ skipped: true });

            var days = Object.keys(collectLocalDays()).length;
            var streak = YEStorage.get('app_streak', 0);
            if (!hubSendableCount(days) || !hubSendableCount(streak)) return Promise.resolve({ skipped: true });
            if (!hubSendableLabel('記録日数') || !hubSendableLabel('連続')) return Promise.resolve({ skipped: true });

            var summary = {
                count: Math.floor(days),
                label: '記録日数',
                count2: Math.floor(streak),
                label2: '連続'
            };

            // ★同じ内容を続けて送らない（受け口は毎回 Clerk API を2回叩く）。
            var fingerprint = summary.count + '/' + summary.count2;
            if (YEStorage.get(HUB_LAST_SENT_KEY, null) === fingerprint) {
                return Promise.resolve({ skipped: true });
            }

            return YEAuth.getSyncToken().then(function (token) {
                if (!token) return { skipped: true }; // 未ログイン。何もしない。
                var opts = {
                    method: 'POST',
                    // ★Cookie は送らない。受け口は credentials を許可していない。
                    //   独自ヘッダも足さない（許可は Authorization と Content-Type のみ）。
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ appKey: HUB_APP_KEY, summary: summary })
                };
                if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
                    opts.signal = AbortSignal.timeout(HUB_TIMEOUT_MS);
                }
                return fetch(HUB_SUMMARY_URL, opts).then(function (res) {
                    // ★リトライしない。次の記録で上書きされる。
                    if (res.ok) YEStorage.set(HUB_LAST_SENT_KEY, fingerprint);
                    return { sent: res.ok };
                });
            }).catch(function () {
                return { failed: true }; // 黙って諦める。記録は端末にある。
            });
        } catch (e) {
            return Promise.resolve({ failed: true });
        }
    }

    window.YESync = {
        sync: sync,
        pushToday: pushToday,
        pushHubSummary: pushHubSummary,
        _collectLocalDays: collectLocalDays // 検証用
    };
})();
