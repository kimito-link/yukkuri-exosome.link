#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, '..');
const plistPath = path.join(repo, 'ios', 'App', 'App', 'Info.plist');

const stringEntries = [
  [
    'NSCameraUsageDescription',
    '写真記録のために、撮影した写真を端末内に保存する場合のみカメラを使用します。写真は外部に送信されません。',
  ],
  [
    'NSPhotoLibraryUsageDescription',
    '写真記録のために、選択した写真を端末内に保存する場合のみ写真ライブラリを使用します。写真は外部に送信されません。',
  ],
  [
    'NSPhotoLibraryAddUsageDescription',
    '写真記録の画像を端末内に保存・管理するために写真ライブラリへの保存権限を使用します。',
  ],
];

const boolEntries = [
  ['ITSAppUsesNonExemptEncryption', false],
];

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function valuePatternFor(key) {
  return new RegExp(
    `(<key>${escapeRegExp(key)}</key>\\s*)(?:<string>[\\s\\S]*?</string>|<true\\/>|<false\\/>)`,
    'm',
  );
}

function insertBeforeDictClose(xml, entry) {
  if (!xml.includes('</dict>')) {
    throw new Error(`Invalid Info.plist: missing </dict> in ${plistPath}`);
  }
  return xml.replace(/\n<\/dict>\s*\n<\/plist>\s*$/m, `\n${entry}</dict>\n</plist>\n`);
}

function upsertString(xml, key, value) {
  const entry = `\t<key>${key}</key>\n\t<string>${escapeXml(value)}</string>\n`;
  const pattern = valuePatternFor(key);
  if (pattern.test(xml)) {
    return xml.replace(pattern, `$1<string>${escapeXml(value)}</string>`);
  }
  return insertBeforeDictClose(xml, entry);
}

function upsertBool(xml, key, value) {
  const tag = value ? '<true/>' : '<false/>';
  const entry = `\t<key>${key}</key>\n\t${tag}\n`;
  const pattern = valuePatternFor(key);
  if (pattern.test(xml)) {
    return xml.replace(pattern, `$1${tag}`);
  }
  return insertBeforeDictClose(xml, entry);
}

if (!fs.existsSync(plistPath)) {
  console.log(`[patch-ios-plist] skipped; ${plistPath} does not exist`);
  process.exit(0);
}

let xml = fs.readFileSync(plistPath, 'utf8').replace(/\r\n/g, '\n');

for (const [key, value] of stringEntries) {
  xml = upsertString(xml, key, value);
}
for (const [key, value] of boolEntries) {
  xml = upsertBool(xml, key, value);
}

fs.writeFileSync(plistPath, xml, 'utf8');
console.log(`[patch-ios-plist] patched ${plistPath}`);
