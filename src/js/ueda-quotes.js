/**
 * Ueda Daily Quote
 *
 * 上田実『驚異の再生医療 培養上清が世界を救う』改訂版（扶桑社新書）から、
 * 1日1つ届くひとことコレクション。30本ローテーション。
 *
 * 出典明示：必ず本のタイトルを併記。
 */

const UEDA_QUOTES = [
    {
        text: '幹細胞は数千種類のセクレトーム（分泌物）を産生し、それらが相加的に作用することで組織の再生が実現すると考えられます。',
        topic: '培養上清の主役',
        char: 'tanunee'
    },
    {
        text: 'エクソソームは封筒に相当し、情報伝達物質は便せんに書かれた手紙といえるでしょう。',
        topic: 'エクソソームのしくみ',
        char: 'tanunee'
    },
    {
        text: '幹細胞が分泌するサイトカインやエクソソームこそが、組織再生の主役である。',
        topic: '上田先生の発見',
        char: 'tanunee'
    },
    {
        text: '老化するとは、幹細胞が減少していくことなのです。',
        topic: '老化のメカニズム',
        char: 'rink'
    },
    {
        text: '骨髄や脂肪の中の幹細胞は、新生児の時の量を1とすると、50歳では約40分の1、80歳では約200分の1に減ってしまうといわれています。',
        topic: '加齢と幹細胞',
        char: 'tanunee'
    },
    {
        text: '老化現象の最たるものは皮膚の衰え。男女を問わず美容に関心のある方は多いでしょう。',
        topic: '美容と再生',
        char: 'rink'
    },
    {
        text: '深刻な病気以上に期待が大きいのが、培養上清の美容への応用なのです。',
        topic: '美容応用',
        char: 'rink'
    },
    {
        text: '乳歯由来の培養上清は、骨髄・脂肪・臍帯由来の培養上清に比べて格段に優れた再生能力を持つ。',
        topic: '乳歯歯髄の特性',
        char: 'tanunee'
    },
    {
        text: '乳歯幹細胞は神経堤由来の細胞集団であり、神経細胞への分化誘導に高い反応性を示します。',
        topic: '乳歯と神経',
        char: 'tanunee'
    },
    {
        text: '培養上清は強い抗炎症作用があり、またステロイド薬のような副作用がありません。',
        topic: '培養上清の特徴',
        char: 'tanunee'
    },
    {
        text: '培養上清には現在のところ、深刻な副作用は起きていません。',
        topic: '安全性',
        char: 'tanunee'
    },
    {
        text: '培養上清には、培養された幹細胞のようながん化のリスクがありません。',
        topic: 'セルフリーのメリット',
        char: 'tanunee'
    },
    {
        text: '幹細胞治療は治療効果はともかく、コストという致命的な問題が存在する。培養上清は、その解決策となりえます。',
        topic: 'コストの課題',
        char: 'tanunee'
    },
    {
        text: '培養上清は、再生医療の最も重要なキー。長らく「廃棄物」とみなされていたものに、実は宝が眠っていた。',
        topic: '発見の物語',
        char: 'rink'
    },
    {
        text: '生きた幹細胞を使わず培養上清を使用することと、その生産に乳歯幹細胞を選択したこと。この二つが私たちの研究のもっとも重要な発見です。',
        topic: '研究の核心',
        char: 'tanunee'
    },
    {
        text: '培養上清は、それぞれの種類によって得意とする作用があり、疾患によって使い分ける必要があります。',
        topic: '使い分けの大切さ',
        char: 'tanunee'
    },
    {
        text: 'MCP-1とSiglec-9というサイトカインは、乳歯幹細胞から最も多く産生されます。',
        topic: '主要なサイトカイン',
        char: 'tanunee'
    },
    {
        text: 'これら二つのサイトカインは、共同作業で局所のマクロファージの性格を変え、抗炎症作用・免疫抑制作用・細胞保護作用など、組織再生に有利な環境を作ります。',
        topic: 'サイトカインの働き',
        char: 'tanunee'
    },
    {
        text: 'HGFは、生体の自然治癒力を支える内因性の組織再生・修復因子です。',
        topic: 'HGFという因子',
        char: 'tanunee'
    },
    {
        text: '培養上清の効果は、その「濃度」にほぼ正比例します。',
        topic: '濃度の重要性',
        char: 'tanunee'
    },
    {
        text: '「培養上清」や「幹細胞」といった囮ワードに惑わされてはなりません。',
        topic: '消費者として',
        char: 'tanunee'
    },
    {
        text: '確実な効果をもつ化粧品はかなりの高額にならざるを得ません。安すぎる商品には注意が必要です。',
        topic: '化粧品選び',
        char: 'rink'
    },
    {
        text: '培養上清には100種類以上の生理活性物質が含まれていることが、これまでに分析されたものだけでも分かっています。',
        topic: '成分の多様性',
        char: 'tanunee'
    },
    {
        text: '幹細胞治療の重要なメカニズムは、「局所の微小環境を破壊型から再生型に変換する」ことです。',
        topic: '再生の本質',
        char: 'tanunee'
    },
    {
        text: '超音波刺激を加えることで、培養上清中のサイトカインやエクソソームの量が増加し、培養上清が高機能化することが分かりました。',
        topic: '超音波培養法',
        char: 'tanunee'
    },
    {
        text: '読者の皆さんが住む地域で培養上清による再生医療を受けることができるようにすることが、今後の私の使命だと考えています。',
        topic: '上田先生の使命',
        char: 'tanunee'
    },
    {
        text: '幹細胞は減少していくものだから、減った分の「幹細胞が出している物質」を培養上清で補填する、という発想です。',
        topic: '上清液療法の哲学',
        char: 'tanunee'
    },
    {
        text: '人工皮膚作製会社で「妖精の粉」を見たヒントから、培養上清を“発見”するまでの研究が始まりました。',
        topic: '発見のきっかけ',
        char: 'rink'
    },
    {
        text: 'はじめは培養上清に見向きもしなかった研究者の目の色が変わってきた。それは効果が動物実験で目を見張るものだったからです。',
        topic: '常識を覆した瞬間',
        char: 'rink'
    },
    {
        text: '医学の目的は、患者を治すこと。これだけがブレない、唯一のテーゼだと考えています。',
        topic: '上田先生の哲学',
        char: 'tanunee'
    }
];

const UEDA_SOURCE = '上田 実『改訂版 驚異の再生医療 〜培養上清が世界を救う〜』扶桑社新書 (2022) より';

/** 今日の日付に対応した「今日の1本」 */
function getUedaQuoteOfDay() {
    const today = new Date();
    // 通算日数で決定（毎日確実に1本ローテーション）
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
    const index = dayOfYear % UEDA_QUOTES.length;
    return { ...UEDA_QUOTES[index], index, total: UEDA_QUOTES.length };
}

/** 任意のインデックス取得（昨日・明日プレビュー用） */
function getUedaQuote(offset = 0) {
    const today = new Date();
    today.setDate(today.getDate() + offset);
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
    const index = ((dayOfYear % UEDA_QUOTES.length) + UEDA_QUOTES.length) % UEDA_QUOTES.length;
    return { ...UEDA_QUOTES[index], index, total: UEDA_QUOTES.length };
}
