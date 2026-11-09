#!/usr/bin/env node
/**
 * build-seo.mjs — exosome.kimito.link の「検索エンジンが辿れる道」を src/ から作る。
 *
 * ■ なぜ要るか（2026-11-09 本番実測）
 *   - /sitemap.xml が 404。basics/・treatment/ などの解説ページを検索エンジンへ知らせる一覧が無かった。
 *   - 24ページ中21ページに canonical（代表URL）が無かった。旧ドメイン yukkuri-exosome.link は 308 で
 *     こちらへ来るが、代表URLの宣言が無いと評価が分かれやすい。
 *   - robots.txt は Cloudflare の自動分だけで、sitemap の場所を書いていなかった。
 *
 * ■ 何をするか
 *   1. src/**\/index.html のうち canonical が無いものに、場所から作った代表URLを足す（あるものは触らない）
 *   2. src/sitemap.xml を作る（自分専用の画面 PERSONAL は載せない）
 *   3. src/robots.txt を作る
 *
 * 使い方: node scripts/build-seo.mjs          # 書き込む
 *         node scripts/build-seo.mjs --check  # 書き込まずに、ずれていたら exit 1（test から呼ぶ）
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const SRC = join(ROOT, "src");
export const ORIGIN = "https://exosome.kimito.link";
/** ログインした本人だけの画面。検索結果に出しても役に立たないので sitemap に載せない（ページ自体は触らない）。 */
export const PERSONAL = new Set(["/me/", "/garden/", "/boost/"]);

/** src 相対の index.html → 公開パス（/ や /basics/what-is-exosome/）。 */
export function pathOf(rel) {
  const p = rel.replace(/\\/g, "/").replace(/index\.html$/, "");
  return "/" + p;
}

/** canonical が無ければ </title> の直後に足す。 */
export function addCanonical(html, url) {
  if (/rel="canonical"/.test(html)) return html;
  const m = html.match(/<\/title>/);
  if (!m) return html;
  const i = m.index + m[0].length;
  return html.slice(0, i) + `\n    <link rel="canonical" href="${url}">` + html.slice(i);
}

export function renderSitemap(paths) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<!-- 自動生成: node scripts/build-seo.mjs（手で書き換えない） -->",
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paths.map((p) => `  <url><loc>${ORIGIN}${p}</loc></url>`),
    "</urlset>",
    "",
  ].join("\n");
}

export const ROBOTS = `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name === "index.html") out.push(p);
  }
  return out;
}

/** @returns {{file:string,next:string}[]} 書き込みが要るもの */
export function plan() {
  const files = walk(SRC).sort();
  const writes = [];
  const listed = [];
  for (const f of files) {
    const path = pathOf(relative(SRC, f));
    const cur = readFileSync(f, "utf8");
    if (/name="robots"[^>]*noindex/.test(cur)) continue;
    const next = addCanonical(cur, ORIGIN + path);
    if (next !== cur) writes.push({ file: f, next });
    if (!PERSONAL.has(path)) listed.push(path);
  }
  listed.sort((a, b) => (a === "/" ? -1 : b === "/" ? 1 : a.localeCompare(b)));
  for (const [name, body] of [["sitemap.xml", renderSitemap(listed)], ["robots.txt", ROBOTS]]) {
    const f = join(SRC, name);
    if (!existsSync(f) || readFileSync(f, "utf8") !== body) writes.push({ file: f, next: body });
  }
  return writes;
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  const writes = plan();
  if (process.argv.includes("--check")) {
    if (writes.length) {
      console.error(`[build-seo] ${writes.length} ファイルが古い（node scripts/build-seo.mjs で作り直す）:`);
      for (const w of writes) console.error("  - " + relative(ROOT, w.file));
      process.exit(1);
    }
    console.log("[build-seo] ✓ canonical・sitemap.xml・robots.txt は最新です");
  } else {
    for (const w of writes) writeFileSync(w.file, w.next);
    console.log(`[build-seo] ${writes.length} ファイルを書き込みました`);
  }
}
