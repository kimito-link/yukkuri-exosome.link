/**
 * Service Worker — 通知の配信口
 *
 * 意図的に最小構成。キャッシュはしない（更新が Web への push で即反映される
 * 運用なので、キャッシュを持つと古い画面が残ってしまう）。
 */

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            for (const client of list) {
                if ('focus' in client) return client.focus();
            }
            if (self.clients.openWindow) return self.clients.openWindow('/');
        })
    );
});

/**
 * 将来 Push API を使う場合の受け口。
 * いまは配信サーバーが無いので到達しない。
 */
self.addEventListener('push', event => {
    let data = { title: 'ゆっくりエクソソーム', body: '' };
    try { if (event.data) data = Object.assign(data, event.data.json()); } catch (e) {}
    if (!data.body) return;
    event.waitUntil(self.registration.showNotification(data.title, { body: data.body, tag: 'ye-push' }));
});
