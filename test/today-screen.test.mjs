// ホーム（Today）画面の再設計（2026-11）で決めたことを固定する。
//   - ホームは短い。記録フォームは閉じた行で、開いたときにだけ描く
//   - いちばん上の数字は連続日数ではなく「直近14日で何日」
//   - 「いまのおすすめ」は1つだけ。済んだものは勧めない
//   - 催促の文言を置かない（HANDOFF-20260824.md §5）
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const T = require(path.join(root, 'src/js/today.js'));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('時間帯の境目', () => {
  assert.equal(T.todaySlot(4), 'night');
  assert.equal(T.todaySlot(5), 'morning');
  assert.equal(T.todaySlot(10), 'morning');
  assert.equal(T.todaySlot(11), 'day');
  assert.equal(T.todaySlot(17), 'evening');
  assert.equal(T.todaySlot(22), 'night');
});

test('いまのおすすめ: 夜は「おやすみ」、押したあとの朝は「おはよう」', () => {
  assert.equal(T.pickNowCard(23, {}).key, 'bed');
  assert.equal(T.pickNowCard(7, { sleepPending: true }).key, 'wake');
  // 「おやすみ」を押していない朝に「おはよう」は勧めない（押しても何も記録されない）
  assert.equal(T.pickNowCard(7, {}).key, 'fatigue');
});

test('いまのおすすめ: 済んだものは勧めず、全部済んだら記録を勧めない', () => {
  assert.equal(T.pickNowCard(19, {}).key, 'skin');
  assert.equal(T.pickNowCard(19, { skinDone: true }).key, 'mind');
  const all = { skinDone: true, mindDone: true, boostDone: true, fatigueDone: true, sleepDone: true };
  for (const h of [7, 13, 19]) {
    const card = T.pickNowCard(h, all);
    assert.equal(card.key, 'look', `${h}時`);
    assert.equal(card.action.type, 'link');
  }
});

test('あいさつ: 同じ日・同じ時間帯は同じ人が同じことを言い、時間帯で人が変わる', () => {
  const a = T.pickTodayLine(new Date(2026, 10, 10, 7, 0), false);
  const b = T.pickTodayLine(new Date(2026, 10, 10, 9, 30), false);
  const c = T.pickTodayLine(new Date(2026, 10, 10, 13, 0), false);
  assert.deepEqual(a, b);
  assert.notEqual(a.charKey, c.charKey);
  const done = T.pickTodayLine(new Date(2026, 10, 10, 7, 0), true);
  assert.equal(done.message, T.TODAY_DONE_LINES[done.charKey]);
});

test('3人組の口調: りんく=なのだ／こん太・たぬ姉は「なのだ」を使わない／たぬ姉は「だよ」「じゃん」を使わない', () => {
  const all = (k) => [...Object.values(T.TODAY_LINES[k]).flat(), T.TODAY_DONE_LINES[k]];
  for (const line of all('rink')) assert.match(line, /のだ/, line);
  for (const line of [...all('konta'), ...all('tanunee')]) assert.doesNotMatch(line, /のだ/, line);
  for (const line of all('tanunee')) assert.doesNotMatch(line, /だよ|じゃん/, line);
});

test('直近14日のマス目: 14個、最後が今日、月をまたいでも合う', () => {
  const dots = T.buildDayDots(new Date(2026, 10, 3, 12), ['2026-11-03', '2026-10-31', '2026-10-01'], 14);
  assert.equal(dots.length, 14);
  assert.equal(dots[13].key, '2026-11-03');
  assert.equal(dots[13].today, true);
  assert.equal(dots[0].key, '2026-10-21');
  assert.deepEqual(dots.filter((d) => d.active).map((d) => d.key), ['2026-10-31', '2026-11-03']);
});

test('ホームの文言に、催促・効果をうたう言葉を置かない', () => {
  const js = read('src/js/today.js').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  for (const ng of ['まだ記録がありません', '途切れ', '連続', '若返', '活性化', '痩せ', 'アンチエイジング']) {
    assert.equal(js.includes(ng), false, ng);
  }
});

test('ホームは today.js が描き、記録フォームは開いたときにだけ描く', () => {
  const html = read('src/index.html');
  assert.match(html, /<script defer src="js\/today\.js"><\/script>/);
  assert.match(html, /<link rel="stylesheet" href="css\/today\.css">/);
  // selfcare.js は today.js より前（保存処理を借りるため）
  assert.ok(html.indexOf('src="js/selfcare.js"') < html.indexOf('src="js/today.js"'));
  const js = read('src/js/today.js');
  assert.match(js, /el\.addEventListener\('toggle'/);
  // render() の本体から直接フォームを描かない（TODAY_SECTIONS の render 経由だけ）
  const body = js.slice(js.indexOf('    render() {'), js.indexOf('    bind(root) {'));
  assert.doesNotMatch(body, /renderSkinCheck|renderFatigueCheck|renderSleepLog|renderMindCare|renderDoctorMemo|renderPhotoLog/);
});

test('ステータスバーは連続日数ではなく直近14日を出し、開いた日を記録する', () => {
  const js = read('src/js/app.js');
  assert.match(js, /getRecentDays\(n = 14\)/);
  assert.match(js, /YEStorage\.set\('app_active_days', days\)/);
  const shell = js.slice(js.indexOf('function injectAppShell'));
  assert.doesNotMatch(shell, /日連続/);
  assert.match(shell, /App\.getRecentDays\(14\)/);
});
