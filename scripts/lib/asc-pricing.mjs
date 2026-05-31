// Set free-tier pricing on an App Store app. Apple requires every app
// to have a price schedule (even Tier 0 / $0) before review submission
// — returns STATE_ERROR.APP_PRICING_REQUIRED otherwise.
//
// Uses the v2 pricing API (introduced 2023). The v1 /v1/appPrices is
// read-only; mutations go through /v1/appPriceSchedules with included
// `appPrices` records per territory.
//
// Idempotent: skips when a manual-price schedule already exists.

// Find the appPricePoint id for free tier (USD $0.00) on this app.
async function findFreePricePoint(api, appId) {
  // The appPricePoints endpoint lets us filter by territory directly,
  // which is much cheaper than paginating through every tier.
  let pageUrl = `/v1/apps/${appId}/appPricePoints?filter[territory]=USA&limit=200`;
  let sample = null;
  for (let i = 0; i < 8; i += 1) {
    const r = await api('GET', pageUrl);
    if (!sample && r.data?.[0]) sample = r.data[0];
    for (const p of r.data || []) {
      const customerPrice = p.attributes?.customerPrice;
      const num = Number(customerPrice);
      if (Number.isFinite(num) && num === 0) {
        return p.id;
      }
    }
    const next = r.links?.next;
    if (!next) break;
    pageUrl = next.replace('https://api.appstoreconnect.apple.com', '');
  }
  if (sample) {
    console.log(
      `  (no $0 USA price point found; sample row: ${JSON.stringify({
        id: sample.id,
        attrs: sample.attributes,
        rel: sample.relationships,
      }).slice(0, 600)})`,
    );
  }
  throw new Error(`No free-tier appPricePoint (USA, $0.00) found for app ${appId}`);
}

// Whether a manual price schedule is already in place for this app.
async function hasPriceSchedule(api, appId) {
  try {
    const r = await api(
      'GET',
      `/v2/apps/${appId}/appPriceSchedule?include=manualPrices&fields[appPriceSchedules]=manualPrices`,
    );
    const manual = r?.included?.filter((x) => x.type === 'appPrices') || [];
    return manual.length > 0;
  } catch (e) {
    if (String(e.message).includes('404')) return false;
    throw e;
  }
}

export async function ensureFreePricing(api, appId) {
  if (await hasPriceSchedule(api, appId)) {
    console.log(`  pricing schedule already set; nothing to do`);
    return { set: false };
  }
  const pricePointId = await findFreePricePoint(api, appId);
  console.log(`  applying free-tier pricing (appPricePoint id=${pricePointId})`);
  const tempId = '${free-price}';
  await api('POST', '/v1/appPriceSchedules', {
    data: {
      type: 'appPriceSchedules',
      relationships: {
        app: { data: { type: 'apps', id: appId } },
        manualPrices: { data: [{ type: 'appPrices', id: tempId }] },
        baseTerritory: { data: { type: 'territories', id: 'USA' } },
      },
    },
    included: [
      {
        type: 'appPrices',
        id: tempId,
        attributes: { startDate: null },
        relationships: {
          appPricePoint: { data: { type: 'appPricePoints', id: pricePointId } },
          territory: { data: { type: 'territories', id: 'USA' } },
        },
      },
    ],
  });
  return { set: true };
}
