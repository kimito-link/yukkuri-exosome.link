// Classify an App Store rejection so the asc-review-poll workflow
// can pick the right next action automatically.
//
// Where Apple's reject feedback actually lives:
//   - The Resolution Center thread (UI only, no stable API surface).
//   - `appStoreReviewActionItems` and `betaAppReviewActionItems` —
//     structured "you must fix X" items the reviewer attaches.
//   - Email to the team agent (out of band).
//
// IMPORTANT: `appStoreReviewDetails.notes` is the developer-owned field
// where we (the script) write reviewer notes for Apple to read — Apple
// does NOT write to it. Reading it as if it were Apple feedback caused
// Issue #54 (false-positive DEMO_ACCOUNT classification on our own
// "Use the supplied demo credentials at /sign-in" template). Don't.

// Each pattern: regex で Apple のリジェクト本文を判定 → category + action + reply template を返す。
// `replyTemplate` は app-review-replies/ 配下のテンプレファイル名。
// 順序が重要：より具体的な PURPOSE_STRINGS を先に判定し、汎用的な PRIVACY は最後。
const PATTERNS = [
  {
    code: 'PURPOSE_STRINGS',
    label: 'Guideline 5.1.1(ii) — purpose strings insufficient',
    regex: /purpose\s?string|usage\s?description|sufficiently explain|provide an example|nscamera|nsphotolibrary|nsmicrophone|nslocation/i,
    action: 'fix-info-plist-purpose-strings',
    replyTemplate: 'app-review-replies/5.1.1-ii-purpose-strings.md',
    hint:
      'Info.plist の NSCameraUsageDescription / NSPhotoLibraryUsageDescription 等が「具体例なし」で弾かれた。Workflow YAML の Info.plist privacy permissions ステップで、各 purpose string に「使い道 + 具体例 + 端末内保存の明示 + サーバー送信なし」を含める。Reply template: app-review-replies/5.1.1-ii-purpose-strings.md',
  },
  {
    code: 'TWO_THREE_TEN',
    label: 'Guideline 2.3.10 — other-platform reference',
    regex: /(android|google\s?play|play\s?store|amazon\s?appstore|galaxy\s?store)/i,
    action: 'retry-after-metadata-fix',
    replyTemplate: 'app-review-replies/2.3.10-other-platform-reference.md',
    hint:
      'Metadata mentions a non-Apple platform. Edit description-ja.txt / keywords-ja.txt / release-notes to stay platform-neutral and re-push. Reply template: app-review-replies/2.3.10-other-platform-reference.md',
  },
  {
    code: 'SCREENSHOT',
    label: 'Guideline 4.0 — Screenshot rejection',
    regex: /screenshot|misleading|app preview|inaccurate/i,
    action: 'retry-with-fresh-screenshots',
    replyTemplate: 'app-review-replies/4.0-design-screenshot.md',
    hint:
      'Screenshots failed visual review. Regenerate with scripts/icon-gen/make_screenshots.py (filename prefix must be iphone-67-* or iphone-65-*) then re-trigger ios-appstore-release. Reply template: app-review-replies/4.0-design-screenshot.md',
  },
  {
    code: 'DEMO_ACCOUNT',
    label: 'Guideline 2.1 — Demo account / sign-in required',
    regex: /demo\s?account|sign[- ]?in|credentials|login|unable to access/i,
    action: 'add-demo-account-secret',
    replyTemplate: 'app-review-replies/2.1-demo-account.md',
    hint:
      'Reviewer could not access the app. For login-required apps (リバースハック), set IOS_REVIEW_DEMO_USERNAME / IOS_REVIEW_DEMO_PASSWORD repo secrets with a working account and update Reviewer Notes. For no-account apps (ゆっくりエクソソーム), update Reviewer Notes to explicitly state "No login required". Reply template: app-review-replies/2.1-demo-account.md',
  },
  {
    code: 'CRASH_BUG',
    label: 'Guideline 2.5.1 — Crash or bug in build',
    regex: /crash|bug|freeze|hang|broken/i,
    action: 'fix-and-rebuild',
    replyTemplate: 'app-review-replies/2.5.1-software-requirements.md',
    hint:
      'Build crashed during review. Read the reviewer\'s reproduction steps, fix the root cause (often WKWebView-specific issues on the latest iOS), push to main, the iOS workflow rebuilds and resubmits automatically. Reply template: app-review-replies/2.5.1-software-requirements.md',
  },
  {
    code: 'PRIVACY',
    label: 'Guideline 5.1.1(i) — Privacy policy / data collection mismatch',
    regex: /privacy|data collection|app privacy|tracking/i,
    action: 'review-app-privacy-form',
    replyTemplate: 'app-review-replies/5.1.1-i-privacy-data-collection.md',
    hint:
      'App Privacy form does not match implementation. Compare disclosed data types in ASC > App Privacy with what the app actually collects (incl. transitively via 3rd party SDKs). Reply template: app-review-replies/5.1.1-i-privacy-data-collection.md',
  },
  {
    code: 'INVALID_BINARY',
    label: 'Invalid binary',
    regex: /invalid binary|missing.*entitlement|signing/i,
    action: 'rebuild-and-resubmit',
    replyTemplate: null,
    hint:
      'Binary failed Apple processing. This is often transient; re-trigger ios-appstore-release.yml.',
  },
];

export function classifyRejection({ state, feedbackText = '' }) {
  const text = `${state} ${feedbackText}`;
  for (const p of PATTERNS) {
    if (p.regex.test(text)) {
      return {
        code: p.code,
        label: p.label,
        action: p.action,
        replyTemplate: p.replyTemplate || null,
        hint: p.hint,
      };
    }
  }
  // State-only fallbacks when no feedback text is available yet.
  if (state === 'INVALID_BINARY') {
    const p = PATTERNS.find((x) => x.code === 'INVALID_BINARY');
    return p && { code: p.code, label: p.label, action: p.action, replyTemplate: p.replyTemplate || null, hint: p.hint };
  }
  return {
    code: 'UNKNOWN',
    label: `Unclassified (${state})`,
    action: 'manual-review',
    replyTemplate: null,
    hint:
      'No matching pattern. Open the App Store Connect rejection email and decide between (a) metadata change + re-push, (b) code fix + re-push, or (c) ASC UI work. Then write a new template in app-review-replies/ so future you can reuse it.',
  };
}

// Best-effort fetch of Apple-authored reject feedback for a version.
// Only reads endpoints Apple writes to. `appStoreReviewDetails` is
// intentionally NOT read here — that's where we (the developer) put
// notes FOR Apple to read; Apple does not write reject feedback there.
// Reading it caused Issue #54 (false-positive DEMO_ACCOUNT on our own
// template text). If we want to surface our own notes in the auto-issue
// for context, do it in the caller — but never feed them to a regex
// classifier as if they were Apple's response.
export async function fetchRejectionFeedback(api, versionId) {
  const chunks = [];
  // Apple-owned: action items the reviewer attached. May 404 when none.
  try {
    const r = await api(
      'GET',
      `/v1/appStoreVersions/${versionId}/appStoreReviewActionItems?limit=20`,
    );
    for (const it of r?.data || []) {
      const a = it.attributes || {};
      const line = [a.title, a.reason, a.details, a.fixIt].filter(Boolean).join(' | ').slice(0, 600);
      if (line) chunks.push(`[reviewActionItem] ${line}`);
    }
  } catch (_e) {
    /* 404 = none; ignore */
  }
  // Apple-owned: version submission metadata. Some reject reasons land here.
  try {
    const r = await api(
      'GET',
      `/v1/appStoreVersions/${versionId}/appStoreVersionSubmission`,
    );
    const attrs = r?.data?.attributes;
    if (attrs && Object.keys(attrs).length > 0) {
      chunks.push(`[versionSubmission] ${JSON.stringify(attrs).slice(0, 500)}`);
    }
  } catch (_e) {
    /* ignore */
  }
  return chunks.join('\n');
}
