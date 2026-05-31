// Upload App Store screenshots to App Store Connect via the
// presigned-URL flow. Apple's docs:
//   https://developer.apple.com/documentation/appstoreconnectapi/uploading-assets-to-app-store-connect
//
// Flow per screenshot:
//   1. POST /v1/appScreenshotSets (or reuse existing for that
//      localization + screenshotDisplayType)
//   2. POST /v1/appScreenshots with filename + fileSize -> get
//      uploadOperations (presigned PUT requests)
//   3. Execute each uploadOperation (PUT bytes to the URL with the
//      headers Apple returned)
//   4. PATCH /v1/appScreenshots/{id} with uploaded:true + sourceFileChecksum
//      (md5 of the bytes)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Apple expects per-device screenshot sets. Even after restricting to
// iPhone via TARGETED_DEVICE_FAMILY=1, the App Store still validates
// both 6.7" (16 Pro Max / 15 Pro Max) and 6.5" (XS Max / 11 Pro Max)
// — supplying only one returns
// STATE_ERROR.SCREENSHOT_REQUIRED.APP_IPHONE_65 (or _67).
//
// Each entry maps a glob-friendly file prefix from
// SCREENSHOT_OUT_DIR to its display-type code.
export const IPHONE_DISPLAY_TYPES = [
  { prefix: 'iphone-67', code: 'APP_IPHONE_67', width: 1290, height: 2796 },
  { prefix: 'iphone-65', code: 'APP_IPHONE_65', width: 1242, height: 2688 },
];

async function findOrCreateScreenshotSet(api, localizationId, displayType) {
  const list = await api(
    'GET',
    `/v1/appStoreVersionLocalizations/${localizationId}/appScreenshotSets?limit=20`,
  );
  const existing = (list.data || []).find(
    (s) => s.attributes.screenshotDisplayType === displayType,
  );
  if (existing) {
    return existing.id;
  }
  const created = await api('POST', '/v1/appScreenshotSets', {
    data: {
      type: 'appScreenshotSets',
      attributes: { screenshotDisplayType: displayType },
      relationships: {
        appStoreVersionLocalization: {
          data: { type: 'appStoreVersionLocalizations', id: localizationId },
        },
      },
    },
  });
  return created.data.id;
}

async function listScreenshots(api, setId) {
  // NB: 'uploaded' is not queryable as a fields[] selector; rely on
  // assetDeliveryState.state === 'COMPLETE' to detect completion.
  const r = await api(
    'GET',
    `/v1/appScreenshotSets/${setId}/appScreenshots?limit=20&fields[appScreenshots]=fileName,assetDeliveryState`,
  );
  return r.data || [];
}

async function reserveScreenshot(api, setId, fileName, fileSize) {
  const r = await api('POST', '/v1/appScreenshots', {
    data: {
      type: 'appScreenshots',
      attributes: { fileName, fileSize },
      relationships: {
        appScreenshotSet: { data: { type: 'appScreenshotSets', id: setId } },
      },
    },
  });
  return r.data;
}

async function runUploadOperations(operations, bytes) {
  for (const op of operations) {
    const headers = {};
    for (const h of op.requestHeaders || []) {
      headers[h.name] = h.value;
    }
    const chunk = bytes.subarray(op.offset, op.offset + op.length);
    const res = await fetch(op.url, { method: op.method, headers, body: chunk });
    if (!res.ok) {
      throw new Error(
        `screenshot upload PUT ${op.url.slice(0, 80)}... -> ${res.status}: ${await res.text().then((t) => t.slice(0, 300))}`,
      );
    }
  }
}

async function commitScreenshot(api, screenshotId, bytes) {
  const md5 = crypto.createHash('md5').update(bytes).digest('hex');
  await api('PATCH', `/v1/appScreenshots/${screenshotId}`, {
    data: {
      type: 'appScreenshots',
      id: screenshotId,
      attributes: { uploaded: true, sourceFileChecksum: md5 },
    },
  });
}

async function deleteAllScreenshots(api, setId) {
  const existing = await listScreenshots(api, setId);
  let deleted = 0;
  for (const s of existing) {
    try {
      await api('DELETE', `/v1/appScreenshots/${s.id}`);
      deleted += 1;
    } catch (e) {
      // Re-throw — partial state where some old screenshots survive
      // is what got v1.0.8 rejected in the first place (login-screen
      // iphone-67-1.png skipped, new dashboard captures uploaded as
      // slots 2 & 3, Apple reviewer saw the same login screen as
      // v1.0.7). Better to fail the upload and halt the build than
      // ship another partial-stale set.
      throw new Error(
        `Failed to delete stale screenshot ${s.id} (${s.attributes.fileName}): ${e.message}`,
      );
    }
  }
  return deleted;
}

async function uploadOneSet(api, localizationId, dir, displayType, prefix) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.(png|jpe?g)$/i.test(f))
    .filter((f) => f.startsWith(prefix))
    .sort();
  if (files.length === 0) {
    console.log(`  ${displayType}: (no files starting with "${prefix}" in ${dir}; skipping — nothing to upload, nothing to delete)`);
    return { uploaded: 0, skipped: 0, deleted: 0 };
  }

  const setId = await findOrCreateScreenshotSet(api, localizationId, displayType);
  console.log(`  ${displayType} screenshotSet id=${setId}`);

  // v1.0.8 was REJECTED under Guideline 2.3.3 a second time because
  // the previous dedup-by-filename behaviour here kept v1.0.7's
  // login-screen iphone-{67,65}-1.png in place while only uploading
  // the new tab captures (slots 2 & 3). The same version slot (and
  // therefore the same appScreenshotSet) carries across versionString
  // bumps in ASC, so stale screenshots survive forever unless we
  // explicitly delete them. Always clear before re-upload so Apple
  // sees exactly what the current capture step produced — never a
  // stale mix. Only delete if we have new files to replace them; an
  // empty local dir should NOT silently nuke ASC's screenshot set.
  const deleted = await deleteAllScreenshots(api, setId);
  if (deleted > 0) {
    console.log(`  ${displayType}: deleted ${deleted} stale screenshot(s) before re-upload`);
  }

  let uploaded = 0;
  for (const file of files) {
    const full = path.join(dir, file);
    const bytes = fs.readFileSync(full);
    console.log(`  ${file}: reserving (${bytes.length} bytes)...`);
    const reserved = await reserveScreenshot(api, setId, file, bytes.length);
    console.log(`  ${file}: uploading bytes via ${reserved.attributes.uploadOperations.length} operation(s)...`);
    await runUploadOperations(reserved.attributes.uploadOperations, bytes);
    console.log(`  ${file}: committing checksum...`);
    await commitScreenshot(api, reserved.id, bytes);
    uploaded += 1;
  }
  return { uploaded, skipped: 0, deleted };
}

// Upload every required iPhone screenshot set (currently 6.7" + 6.5")
// from `dir`. Files are matched by filename prefix. Always
// delete-then-reupload so Apple sees exactly the current capture
// (see uploadOneSet for the v1.0.8 reject post-mortem). The legacy
// `skipped` field stays in the return shape for caller compatibility
// but is always 0 after the v1.0.9 delete-then-reupload change.
export async function uploadIPhoneScreenshots(api, localizationId, dir) {
  if (!fs.existsSync(dir)) {
    console.log(`  (no screenshots dir at ${dir}; skipping)`);
    return { uploaded: 0, skipped: 0, deleted: 0 };
  }
  let uploaded = 0;
  let skipped = 0;
  let deleted = 0;
  for (const { prefix, code } of IPHONE_DISPLAY_TYPES) {
    const r = await uploadOneSet(api, localizationId, dir, code, prefix);
    uploaded += r.uploaded;
    skipped += r.skipped;
    deleted += r.deleted || 0;
  }
  return { uploaded, skipped, deleted };
}
