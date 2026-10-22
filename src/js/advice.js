/**
 * ランダムアドバイス機能
 */

const ADVICE_LIST = [
    // === りんく（食事・生活）。工房の主・一人称「りんく」・語尾「〜でしょ/じゃん/しよっ」・勢いのツッコミ役。
    //     ★一番できてない当事者として語る（自分も夜食・徹夜しがち）。効能は断定しない。 ===
    { char: 'rink', expression: 'smileOpen', category: '食事', text: '夜食のカップ麺、たまにはアリでしょ！りんくも好きだもん。でも毎日はナシ、バランス大事でしょ。' },
    { char: 'rink', expression: 'smile', category: '食事', text: '野菜は彩りで選ぶといいでしょ！赤・黄・緑がそろうと、見た目も気分も上がるじゃん。' },
    { char: 'rink', expression: 'normal', category: '生活', text: 'ちょい待ち、寝る前のスマホ見すぎでしょ？りんくも人のこと言えないけど…一緒に控えよっ。' },
    { char: 'rink', expression: 'half', category: '食事', text: 'お菓子の食べすぎ、バレてるでしょ…まあ、たまのご褒美はアリ。ほどほどにしよっ。' },
    { char: 'rink', expression: 'smile', category: '生活', text: 'お風呂はシャワーより湯船派でしょ！あったまると、なんかリセットされるじゃん。' },
    { char: 'rink', expression: 'smileOpen', category: '食事', text: 'タンパク質、毎食ちゃんと摂ろっ！からだの材料でしょ、ケチっちゃダメじゃん。' },
    { char: 'rink', expression: 'normal', category: '食事', text: '甘いもの欲しいときは、フルーツやヨーグルトもアリでしょ。お菓子一択じゃなくてさ。' },
    { char: 'rink', expression: 'smile', category: '生活', text: '朝いちはコップ一杯の水でしょ！寝てる間にカラカラだもん、まず水、だよ。' },
    { char: 'rink', expression: 'half', category: '生活', text: '徹夜はナシ！…って、りんくが言うのもアレだけど。6〜7時間は寝よっ、お願いでしょ。' },
    { char: 'rink', expression: 'smileOpen', category: '食事', text: '魚も食べよっ！青魚、いい脂が入ってるって聞いたでしょ。たまには焼き魚もアリじゃん。' },

    // === こん太（運動・健康） ===
    { char: 'konta', expression: 'smileOpen', category: '運動', text: 'エクソソームは運動でも増えるって報告があるんだよ！20分歩くだけでも違うよ。' },
    { char: 'konta', expression: 'smile', category: '運動', text: 'エレベーターより階段を選ぼう！毎日のちょっとした選択が、3ヶ月後の自分を作るんだ。' },
    { char: 'konta', expression: 'normal', category: '運動', text: '運動した後は水分補給を忘れずに！細胞が水を欲しがってるよ。' },
    { char: 'konta', expression: 'smileOpen', category: '健康', text: 'ストレッチって地味だけど、本当に大事だよ！朝5分だけでも続けてみて。' },
    { char: 'konta', expression: 'half', category: '運動', text: '「忙しくて運動できない」のはみんな同じ。5分でいいから、何かしてみよう！' },
    { char: 'konta', expression: 'smile', category: '運動', text: 'ウォーキングがおすすめだよ！激しい運動じゃなくても、続けることが大切なんだ。' },
    { char: 'konta', expression: 'smileOpen', category: '健康', text: '深呼吸は、気持ちを落ち着けるのに役立つと言われています。緊張したら、ゆっくり3回深呼吸してみて。' },
    { char: 'konta', expression: 'normal', category: '運動', text: '筋肉は使わないと減っちゃう。週2〜3回、軽い筋トレも入れるといいよ！' },
    { char: 'konta', expression: 'smile', category: '健康', text: '日光浴は15分でOK！朝の光を浴びると、体内時計が整うんだよ。' },
    { char: 'konta', expression: 'smileOpen', category: '運動', text: 'ストレスは運動で発散だ！走ると気持ちもスッキリするよ。' },

    // === たぬ姉（知識・解説） ===
    { char: 'tanunee', expression: 'smileOpen', category: '豆知識', text: 'エクソソームは1985年に発見されたのよ。最初は「細胞のゴミ」と思われていたの。' },
    { char: 'tanunee', expression: 'smile', category: '豆知識', text: 'エクソソームの「エクソ」は「外」、「ソーム」は「体」という意味。直訳すると「外の小体」よ。' },
    { char: 'tanunee', expression: 'normal', category: '知識', text: '同じ「エクソソーム施術」でも、クリニックによって由来や濃度が全く違うの。確認するのが大切ね。' },
    { char: 'tanunee', expression: 'half', category: '注意', text: '「絶対に効く」「副作用ゼロ」って言うクリニックには、注意が必要よ。' },
    { char: 'tanunee', expression: 'smileOpen', category: '豆知識', text: 'エクソソームは血液・唾液・母乳・尿など、体のあらゆる液体に含まれているのよ。' },
    { char: 'tanunee', expression: 'smile', category: '知識', text: '幹細胞とエクソソーム、関係は「お母さんとお弁当」って覚えておくと混乱しないわよ。' },
    { char: 'tanunee', expression: 'normal', category: '注意', text: '美容医療は焦って決めないこと。一度持ち帰って、考える時間を持つのも大事よ。' },
    { char: 'tanunee', expression: 'smileOpen', category: '豆知識', text: 'エクソソームの大きさは約100ナノメートル。人間の髪の毛の太さの1000分の1ね。' },
    { char: 'tanunee', expression: 'smile', category: '知識', text: '培養上清液とエクソソームは別物。上清液の中にエクソソームが含まれている、っていう関係よ。' },
    { char: 'tanunee', expression: 'half', category: '注意', text: 'カウンセリングは複数のクリニックで受けるのがおすすめ。比較すると見えてくるものがあるわ。' },
    { char: 'tanunee', expression: 'smile', category: '豆知識', text: 'エクソソームの研究分野「細胞外小胞学」は、国際学会まであるのよ。それくらい注目されてるの。' },
    { char: 'tanunee', expression: 'smileOpen', category: '知識', text: '「ヒト由来」と「動物由来」、効果や安全性の評価基準が違うから、何由来か確認しましょう。' },
    { char: 'tanunee', expression: 'normal', category: '注意', text: '体に入れるものだから、製造元の情報をきちんと開示しているところを選ぶのが安全よ。' },
    { char: 'tanunee', expression: 'smile', category: '豆知識', text: 'がんの早期発見にエクソソームを使う研究も進んでいるの。診断分野でも未来があるわ。' },
    { char: 'tanunee', expression: 'smileOpen', category: '知識', text: '一度の施術で劇的に変わるものではないわ。継続と生活習慣の組み合わせが大切なのよ。' }
];

let lastAdviceIndex = -1;

function getRandomAdvice() {
    let idx;
    // 直前と同じものは避ける
    do {
        idx = Math.floor(Math.random() * ADVICE_LIST.length);
    } while (idx === lastAdviceIndex && ADVICE_LIST.length > 1);
    lastAdviceIndex = idx;
    return ADVICE_LIST[idx];
}

function renderAdvice(advice) {
    const card = document.getElementById('advice-card');
    const char = CHARACTERS[advice.char];
    const charImg = getImagePath(advice.char, advice.expression, 1);

    card.innerHTML = `
        <div class="advice__category">${advice.category}</div>
        <div class="advice__char">
            ${characterPicture(charImg, { alt: char.name, width: 160 })}
        </div>
        <div class="advice__name" style="color: ${char.color}">${char.name}</div>
        <div class="advice__bubble">${advice.text}</div>
    `;
}

function shareAdvice(advice) {
    const char = CHARACTERS[advice.char];
    const text = `【ゆっくりエクソソームの${char.name}より】\n${advice.text}\n\n#ゆっくりエクソソーム\nhttps://exosome.kimito.link/advice/`;

    if (navigator.share) {
        navigator.share({
            title: 'ゆっくりエクソソーム — ひとことアドバイス',
            text: text
        }).catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            alert('テキストをコピーしました！');
        }).catch(() => {
            // Twitter intent fallback
            const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
            window.open(tweetUrl, '_blank');
        });
    }
}

/**
 * アドバイスを受け取った回数を記録する。
 *
 * ★ゲストのときは【記録しない】（2026-10-16 の実損で追加）。
 *   advice_count は個人の記録なので関所(YEStorage.set)の対象で、ゲストが書くと
 *   ログインモーダルが開く。この関数は初回表示でも呼ばれるため、以前は
 *   【ページを開いた瞬間にログインを促される】状態だった（タップしていないのに）。
 *   コンテンツを見る前にログインを求めるのは体験として良くないので、
 *   ゲストには黙って見せ、記録はログイン後から始める。
 *   ★許可リストに足して回避しない。common.js の方針は
 *     「ゲストが書いてよいのは記録・個人データでないものだけ」。
 */
function incrementCounter() {
    // ★ゲストは記録しない（関所に当たってログインモーダルが開くのを防ぐ）。
    if (document.documentElement.getAttribute('data-auth') !== 'member') return;

    const count = YEStorage.get('advice_count', 0) + 1;
    YEStorage.set('advice_count', count);
    const el = document.getElementById('advice-counter');
    if (el) {
        el.textContent = `これまでに${count}回、3人組からアドバイスを受け取りました`;
    }

    // 今日初めてのアドバイスならEP獲得
    if (typeof App !== 'undefined') {
        const today = getTodayKey();
        const todayKey = `advice_${today}`;
        if (!YEStorage.get(todayKey, false)) {
            YEStorage.set(todayKey, true);
            const r = App.addEP(10, 'daily_advice');
            App.notifyEP(10, '今日のひとこと');
            if (r && r.leveledUp) setTimeout(() => App.notifyLevelUp(r), 800);
        }
    }
}

let currentAdvice = null;

function showNewAdvice() {
    currentAdvice = getRandomAdvice();
    renderAdvice(currentAdvice);
    incrementCounter();
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('advice-card')) {
        showNewAdvice();

        document.getElementById('advice-next')?.addEventListener('click', showNewAdvice);

        document.getElementById('advice-share')?.addEventListener('click', () => {
            if (currentAdvice) shareAdvice(currentAdvice);
        });

        // 初期カウンター表示
        const count = YEStorage.get('advice_count', 0);
        const el = document.getElementById('advice-counter');
        if (el && count > 0) {
            el.textContent = `これまでに${count}回、3人組からアドバイスを受け取りました`;
        }
    }
});
