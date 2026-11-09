// 検索用の道（canonical・sitemap.xml・robots.txt）が src/ とずれていないかの契約テスト。
// ★なぜ要るか（2026-11-09）: 本番で /sitemap.xml が 404、24ページ中21ページに canonical が無かった。
//   ページを足したのに build-seo を走らせ忘れると、ここで赤になる。
import { test } from "node:test";
import assert from "node:assert/strict";
import { plan, addCanonical, pathOf, renderSitemap, PERSONAL } from "../scripts/build-seo.mjs";

test("src/ の canonical・sitemap.xml・robots.txt が最新（node scripts/build-seo.mjs 済み）", () => {
  assert.deepEqual(plan().map((w) => w.file), []);
});

test("canonical は無いときだけ足し、あるものは書き換えない", () => {
  assert.match(addCanonical("<title>t</title>", "https://x/a/"), /<link rel="canonical" href="https:\/\/x\/a\/">/);
  const own = '<title>t</title><link rel="canonical" href="https://x/own/">';
  assert.equal(addCanonical(own, "https://x/a/"), own);
});

test("場所から公開パスを作る", () => {
  assert.equal(pathOf("index.html"), "/");
  assert.equal(pathOf("basics/what-is-exosome/index.html"), "/basics/what-is-exosome/");
});

test("自分専用の画面は sitemap に載せない", () => {
  const xml = renderSitemap(["/", "/basics/"]);
  for (const p of PERSONAL) assert.ok(!xml.includes(p));
  assert.ok(xml.includes("<loc>https://exosome.kimito.link/basics/</loc>"));
});
