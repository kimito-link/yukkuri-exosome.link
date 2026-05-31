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

const PATTERNS = [
  {
    code: 'TWO_THREE_TEN',
    label: 'Guideline 2.3.10 — other-platform reference',
    regex: /(android|google\s?play|play\s?store|amazon\s?appstore|galaxy\s?store)/i,
    action: 'retry-after-metadata-fix',
    hint:
      'Metadata mentions a non-Apple platform. Edit description-ja.txt / keywords-ja.txt / release-notes to stay platform-neutral and re-push.',
  },
  {
    code: 'SCREENSHOT',
    label: 'Screenshot rejection',
    regex: /screenshot|misleading|app preview|inaccurate/i,
    action: 'retry-with-fresh-screenshots',
    hint:
      'Screenshots failed visual review. Improve scripts/capture-appstore-screenshots.mjs (add captions / multiple slides) then re-trigger ios-appstore-release.',
  },
  {
    code: 'DEMO_ACCOUNT',
    label: 'Demo account / sign-in required',
    regex: /demo\s?account|sign[- ]?in|credentials|login|unable to access/i,
    action: 'add-demo-account-secret',
    hint:
      'Reviewer could not access the app. Set IOS_REVIEW_DEMO_USERNAME / IOS_REVIEW_DEMO_PASSWORD repo secrets with a working partner.reverse-re-birth-hack.com account, then re-trigger ios-appstore-release.',
  },
  {
    code: 'PRIVACY',
    label: 'Privacy policy / data collection',
    regex: /privacy|data collection|app privacy|tracking/i,
    action: 'review-app-privacy-form',
    hint:
      'App Privacy form needs adjustment in ASC web UI. Compare disclosed data types with what the app actually collects.',
  },
  {
    code: 'CRASH_BUG',
    label: 'Crash or bug in build',
    regex: /crash|bug|freeze|hang|broken/i,
    action: 'fix-and-rebuild',
    hint:
      'Build crashed during review. Fix the bug, push to main, the iOS workflow will rebuild and resubmit automatically.',
  },
  {
    code: 'INVALID_BINARY',
    label: 'Invalid binary',
    regex: /invalid binary|missing.*entitlement|signing/i,
    action: 'rebuild-and-resubmit',
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
        hint: p.hint,
      };
    }
  }
  // State-only fallbacks when no feedback text is available yet.
  if (state === 'INVALID_BINARY') return PATTERNS.find((p) => p.code === 'INVALID_BINARY');
  return {
    code: 'UNKNOWN',
    label: `Unclassified (${state})`,
    action: 'manual-review',
    hint:
      'No matching pattern. Open the App Store Connect rejection email and decide between (a) metadata change + re-push, (b) code fix + re-push, or (c) ASC UI work.',
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
