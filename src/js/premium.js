/**
 * Longevity Premium - ロンジェビティ・プレミアム解放チケットの検証
 *
 * 「売るのは kimito、開くのは Exosome」。
 * Exosome にはログイン・決済・API 照会を一切持ち込まない。
 * kimito.link が発行した署名付きチケット（ECDSA P-256）を
 * WebCrypto で検証し、有効なら localStorage に保存するだけ。
 *
 * チケット payload: {"v":1,"f":"longevity_premium","iat":<unix秒>,"exp":<unix秒>}
 * 個人情報・userId は入れない（Exosome は誰かを知らないままでよい）。
 *
 * 形式: base64url(JSON payload) + "." + base64url(DER署名)
 * 署名アルゴリズム: ECDSA P-256 / SHA-256（WebCrypto既定の DER 出力を採用）。
 *
 * 検証に使う公開鍵は「公開してよい鍵」なので静的サイトに同梱してよい。
 * 秘密鍵は kimito.link 側の env にのみ存在する。
 */

(function () {
    'use strict';

    var TICKET_KEY = 'lp_ticket';
    var FEATURE_ID = 'longevity_premium';

    // kimito.link が持つ秘密鍵と対の公開鍵（JWK形式）。本番鍵ペア（2026-07-04生成）。
    var PUBLIC_KEY_JWK = {
        kty: 'EC',
        crv: 'P-256',
        x: 'M-MglnNDsdbgnOAHqznrzCNPFop-eeikEo9DAbxJdz4',
        y: 'hGyBHsRTLEupFEDmrvatGhhysjraRcjNZUdPlfc2Jco'
    };

    var cachedPublicKey = null;

    function getPublicKey() {
        if (cachedPublicKey) return cachedPublicKey;
        if (!window.crypto || !window.crypto.subtle) return Promise.resolve(null);
        cachedPublicKey = window.crypto.subtle.importKey(
            'jwk',
            PUBLIC_KEY_JWK,
            { name: 'ECDSA', namedCurve: 'P-256' },
            false,
            ['verify']
        ).catch(function () { return null; });
        return cachedPublicKey;
    }

    /** base64url → Uint8Array */
    function base64UrlToBytes(b64url) {
        var b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        var bin = window.atob(b64);
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
    }

    /** チケット文字列 "payload.signature" をパース（形式不正は null）。 */
    function parseTicket(raw) {
        if (typeof raw !== 'string') return null;
        var parts = raw.split('.');
        if (parts.length !== 2) return null;
        try {
            var payloadBytes = base64UrlToBytes(parts[0]);
            var payloadJson = new TextDecoder().decode(payloadBytes);
            var payload = JSON.parse(payloadJson);
            var sig = base64UrlToBytes(parts[1]);
            return { payload: payload, payloadBytes: payloadBytes, sig: sig, raw: raw };
        } catch (e) {
            return null;
        }
    }

    /** payload の形・有効期限を検証（署名検証の前段チェック）。 */
    function isPayloadShapeValid(payload) {
        return !!payload
            && payload.v === 1
            && payload.f === FEATURE_ID
            && typeof payload.iat === 'number'
            && typeof payload.exp === 'number';
    }

    function isPayloadFresh(payload) {
        var nowSec = Math.floor(Date.now() / 1000);
        return payload.exp > nowSec;
    }

    /**
     * チケット文字列を検証する（署名検証つき・非同期）。
     * 成功したら true を返し、有効であれば localStorage に保存する。
     */
    function verifyAndStoreTicket(raw) {
        var parsed = parseTicket(raw);
        if (!parsed || !isPayloadShapeValid(parsed.payload)) return Promise.resolve(false);

        return getPublicKey().then(function (key) {
            if (!key) return false;
            return window.crypto.subtle.verify(
                { name: 'ECDSA', hash: 'SHA-256' },
                key,
                parsed.sig,
                parsed.payloadBytes
            ).then(function (isValid) {
                if (!isValid) return false;
                try {
                    if (typeof YEStorage !== 'undefined' && YEStorage.set) YEStorage.set(TICKET_KEY, raw);
                    else window.localStorage.setItem('ye_' + TICKET_KEY, raw);
                } catch (e) { /* 保存失敗は黙殺（この場では解放されるが次回起動で再検証が必要） */ }
                return true;
            });
        }).catch(function () { return false; });
    }

    function readStoredTicket() {
        try {
            if (typeof YEStorage !== 'undefined' && YEStorage.get) return YEStorage.get(TICKET_KEY, '') || '';
            return window.localStorage.getItem('ye_' + TICKET_KEY) || '';
        } catch (e) { return ''; }
    }

    /**
     * 保存済みチケットが「今この瞬間」有効か（同期・形状とexpのみ判定）。
     * 署名の再検証はしない（保存時に検証済みという前提。改ざんされた値が
     * 直接 localStorage に書かれた場合は次回の verifyAndStoreTicket 経由でしか弾けないが、
     * 端末側が破られても金銭被害はゼロという設計方針＝§3のリスク欄を参照）。
     */
    function isUnlockedSync() {
        var raw = readStoredTicket();
        if (!raw) return false;
        var parsed = parseTicket(raw);
        if (!parsed || !isPayloadShapeValid(parsed.payload)) return false;
        return isPayloadFresh(parsed.payload);
    }

    /** 起動時に URL の ?lp= を捕捉して検証・保存する。 */
    function captureFromUrl() {
        try {
            var ticket = new URLSearchParams(window.location.search).get('lp');
            if (ticket) verifyAndStoreTicket(ticket);
        } catch (e) { /* 解析失敗は黙殺 */ }
    }

    captureFromUrl();

    window.LongevityPremium = {
        isUnlocked: isUnlockedSync,
        verifyAndStoreTicket: verifyAndStoreTicket,
        FEATURE_ID: FEATURE_ID
    };
})();
