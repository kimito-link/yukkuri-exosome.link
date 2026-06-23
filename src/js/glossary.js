/**
 * 用語集（検索・フィルタ・展開）
 */

const GLOSSARY_TERMS = [
    {
        term: 'エクソソーム',
        reading: 'えくそそーむ',
        category: '基礎',
        explanation: '細胞から放出される、約30〜150ナノメートルの小さな膜小胞のこと。内部にmRNAやmiRNA、タンパク質などの情報物質を含み、細胞間のコミュニケーションを担います。上田実先生の研究では「幹細胞はエクソソームやサイトカインを何千種類も分泌している」とされ、培養上清液の中にも多く含まれます。',
        related: ['細胞外小胞', 'miRNA', '培養上清液', 'サイトカイン'],
        char: 'tanunee'
    },
    {
        term: 'サイトカイン',
        reading: 'さいときかいん',
        category: '分子',
        explanation: '細胞同士がコミュニケーションを取るときに使われるタンパク質。免疫反応や炎症、細胞増殖などに関わります。上田実先生によれば、培養上清の中には「2,000種類以上のサイトカイン等のタンパク因子」が見つかっており、これらが組み合わさって治療効果を生むと考えられています。',
        related: ['成長因子', '培養上清液', 'エクソソーム'],
        char: 'tanunee'
    },
    {
        term: '幹細胞培養上清液',
        reading: 'かんさいぼうばいようじょうせいえき',
        category: '施術',
        explanation: '幹細胞を培養した液から細胞そのものを除いた「上澄み液」。上田実先生（名古屋大学名誉教授）が世界で初めて「幹細胞の分泌するサイトカインが組織再生の主役」であることを発見し、2012年に名古屋大学が培養液のみで歯周組織の再生に成功したことを発表しました。中にはエクソソーム、サイトカイン、成長因子、細胞外マトリックスなどが含まれます。',
        related: ['エクソソーム', '成長因子', 'サイトカイン', 'セルフリー再生医療', '歯髄'],
        char: 'tanunee'
    },
    {
        term: 'セルフリー再生医療',
        reading: 'せるふりーさいせいいりょう',
        category: '施術',
        explanation: 'Stem-Cell-Free Therapy。細胞そのものを移植せず、幹細胞が分泌する培養上清液（サイトカイン・エクソソーム等）だけを使う再生医療。上田実先生が「世界の研究の主流になりつつある」と提唱されている方向性です。生きた細胞を含まないため、腫瘍化のリスクや感染性、アレルギーの懸念を避けやすいとされます。',
        related: ['幹細胞培養上清液', '幹細胞', 'エクソソーム'],
        char: 'tanunee'
    },
    {
        term: '細胞外小胞',
        reading: 'さいぼうがいしょうほう',
        category: '基礎',
        explanation: '細胞から放出される膜に包まれた小さな袋の総称。エクソソーム、マイクロベシクル、アポトーシス小体などが含まれます。英語ではExtracellular Vesicle（EV）。',
        related: ['エクソソーム', 'マイクロベシクル'],
        char: 'tanunee'
    },
    {
        term: 'マイクロベシクル',
        reading: 'まいくろべしくる',
        category: '基礎',
        explanation: '細胞外小胞のひとつ。エクソソームより少し大きく(約100〜1000ナノメートル)、細胞膜から直接出芽して放出されます。',
        related: ['エクソソーム', '細胞外小胞'],
        char: 'tanunee'
    },
    {
        term: 'miRNA（マイクロRNA）',
        reading: 'まいくろあーるえぬえー',
        category: '分子',
        explanation: '約22塩基の小さなRNA分子で、遺伝子の働きを調整する役割を持ちます。エクソソームの中に多く含まれ、他の細胞に運ばれて遺伝子発現を調節します。',
        related: ['エクソソーム', 'mRNA'],
        char: 'tanunee'
    },
    {
        term: 'mRNA（メッセンジャーRNA）',
        reading: 'めっせんじゃーあーるえぬえー',
        category: '分子',
        explanation: 'DNAの遺伝情報を、タンパク質を作る場所まで伝える「設計図」のような分子。エクソソームに含まれて他の細胞に運ばれることもあります。',
        related: ['miRNA', '遺伝子発現'],
        char: 'tanunee'
    },
    {
        term: '培養上清液',
        reading: 'ばいようじょうせいえき',
        category: '施術',
        explanation: '細胞を培養した液から細胞そのものを除いた「上澄み液」のこと。かつては廃棄物として扱われていましたが、上田実先生がその中に「再生医療の最も重要なキー」となる活性成分が大量に含まれることを発見しました。中にはエクソソーム、サイトカイン、成長因子、細胞外マトリックスなどが含まれます。',
        related: ['幹細胞培養上清液', 'エクソソーム', '成長因子', 'サイトカイン'],
        char: 'tanunee'
    },
    {
        term: '幹細胞',
        reading: 'かんさいぼう',
        category: '基礎',
        explanation: 'まだ何の細胞になるか決まっていない、他の細胞に変化（分化）できる能力を持つ細胞。骨髄・脂肪・歯髄など由来別に分類されます。',
        related: ['iPS細胞', '間葉系幹細胞'],
        char: 'tanunee'
    },
    {
        term: 'iPS細胞',
        reading: 'あいぴーえすさいぼう',
        category: '基礎',
        explanation: 'induced Pluripotent Stem cellの略。体細胞から人工的に作られる多能性幹細胞。さまざまな細胞に分化できます。',
        related: ['幹細胞', 'ES細胞'],
        char: 'tanunee'
    },
    {
        term: '間葉系幹細胞',
        reading: 'かんようけいかんさいぼう',
        category: '基礎',
        explanation: 'MSCとも呼ばれる、骨髄・脂肪・歯髄・臍帯などに存在する幹細胞。骨・軟骨・脂肪などに分化する能力を持ちます。',
        related: ['幹細胞', '歯髄', '臍帯'],
        char: 'tanunee'
    },
    {
        term: '歯髄',
        reading: 'しずい',
        category: '由来',
        explanation: '歯の中央部にある軟らかい組織。神経や血管を含み、ここから採取される幹細胞は「歯髄幹細胞」と呼ばれます。上田実先生によれば、特に「乳歯歯髄幹細胞」は神経系の再生やアレルギー疾患への応用に向いているとされています。理由は、乳歯と脳の発生起源が近いためと説明されています。',
        related: ['幹細胞', '間葉系幹細胞', '乳歯歯髄幹細胞', '培養上清液'],
        char: 'tanunee'
    },
    {
        term: '乳歯歯髄幹細胞',
        reading: 'にゅうしじずいかんさいぼう',
        category: '由来',
        explanation: '抜けた乳歯の中の幹細胞。英語ではSHED（Stem cells from Human Exfoliated Deciduous teeth）と呼ばれます。上田実先生の研究では、神経系の再生・アレルギー疾患への応用に向いているとされ、培養上清液（SHEDCM）は世界中で研究されています。',
        related: ['歯髄', '幹細胞培養上清液', '間葉系幹細胞'],
        char: 'tanunee'
    },
    {
        term: '臍帯',
        reading: 'さいたい',
        category: '由来',
        explanation: 'へその緒のこと。出産時に得られ、若い幹細胞を採取できる組織として、再生医療研究で利用されます。',
        related: ['幹細胞', '間葉系幹細胞'],
        char: 'tanunee'
    },
    {
        term: '成長因子',
        reading: 'せいちょういんし',
        category: '分子',
        explanation: 'グロースファクター。細胞の増殖や分化を促すタンパク質の総称。培養上清液に含まれる代表的な成分のひとつです。名古屋大学の2012年発表では、培養液にIGF-1、VEGF、TGF-β1、HGFなど数十種類が含まれることが報告されました。',
        related: ['培養上清液', 'サイトカイン', 'VEGF'],
        char: 'tanunee'
    },
    {
        term: 'VEGF',
        reading: 'ぶいいーじーえふ',
        category: '分子',
        explanation: '血管内皮増殖因子（Vascular Endothelial Growth Factor）。血管新生を促進する成長因子。培養上清液中の主要なサイトカインのひとつで、組織再生時に血流確保の役割を持ちます。',
        related: ['成長因子', 'サイトカイン'],
        char: 'tanunee'
    },
    {
        term: 'HGF',
        reading: 'えいちじーえふ',
        category: '分子',
        explanation: '肝細胞増殖因子（Hepatocyte Growth Factor）。細胞の遊走能・増殖能を高める働きを持ちます。培養上清液中で組織再生に関わる重要な因子。',
        related: ['成長因子', 'サイトカイン'],
        char: 'tanunee'
    },
    {
        term: 'メソガン',
        reading: 'めそがん',
        category: '施術',
        explanation: '皮膚の浅い層に細い針で多点的に有効成分を注入する専用機器。一定の深さ・量で均一に注入できるのが特徴。',
        related: ['注射', 'メソセラピー'],
        char: 'konta'
    },
    {
        term: 'メソセラピー',
        reading: 'めそせらぴー',
        category: '施術',
        explanation: '皮膚の中間層（メソダーム）に有効成分を直接注入する施術法の総称。フランス発祥の美容医療技術です。',
        related: ['メソガン', '注射'],
        char: 'konta'
    },
    {
        term: 'ダウンタイム',
        reading: 'だうんたいむ',
        category: '施術',
        explanation: '美容施術後、赤みや腫れなどが落ち着くまでの期間。施術の種類や個人差で長さは異なります。',
        related: ['注射', 'メソガン'],
        char: 'konta'
    },
    {
        term: 'カウンセリング',
        reading: 'かうんせりんぐ',
        category: '施術',
        explanation: '施術前に医師と相談する時間。希望・体質・リスクなどを確認し、自分に合った施術かを判断する大切なプロセス。',
        related: ['インフォームドコンセント'],
        char: 'tanunee'
    },
    {
        term: 'インフォームドコンセント',
        reading: 'いんふぉーむどこんせんと',
        category: '施術',
        explanation: '医師から治療内容・効果・リスクを十分説明され、患者が理解・納得した上で治療に同意すること。「説明と同意」とも訳されます。',
        related: ['カウンセリング'],
        char: 'tanunee'
    },
    {
        term: '自由診療',
        reading: 'じゆうしんりょう',
        category: '制度',
        explanation: '健康保険が適用されない、自費で受ける医療。価格・内容が医療機関ごとに異なります。エクソソーム施術の多くがこれに該当します。',
        related: ['医療広告ガイドライン'],
        char: 'tanunee'
    },
    {
        term: '医療広告ガイドライン',
        reading: 'いりょうこうこくがいどらいん',
        category: '制度',
        explanation: '厚生労働省が定める、医療機関の広告に関するルール。効果を断定する表現や、誤解を招く比較表示などを禁止しています。',
        related: ['自由診療'],
        char: 'tanunee'
    },
    {
        term: '細胞加工施設',
        reading: 'さいぼうかこうしせつ',
        category: '制度',
        explanation: '細胞を培養・加工するための専用施設。再生医療等安全性確保法で許可が必要とされる施設です。',
        related: ['再生医療等安全性確保法'],
        char: 'tanunee'
    },
    {
        term: '再生医療等安全性確保法',
        reading: 'さいせいいりょうとうあんぜんせいかくほほう',
        category: '制度',
        explanation: '再生医療の安全性を確保するための日本の法律（2014年施行）。リスクに応じて第1〜3種に分類し、提供にあたっての届出が必要です。',
        related: ['細胞加工施設', '自由診療'],
        char: 'tanunee'
    },
    {
        term: '点滴',
        reading: 'てんてき',
        category: '施術',
        explanation: '静脈から液体を体内に投与する方法。エクソソームや上清液を全身に届ける用途で行われます。',
        related: ['注射'],
        char: 'konta'
    },
    {
        term: 'PRP',
        reading: 'ぴーあーるぴー',
        category: '施術',
        explanation: 'Platelet Rich Plasmaの略。多血小板血漿。自分の血液から血小板を濃縮したもので、再生医療で使われます。エクソソームとは別物。',
        related: ['再生医療'],
        char: 'tanunee'
    },
    {
        term: 'ナノメートル',
        reading: 'なのめーとる',
        category: '単位',
        explanation: '1ミリメートルの100万分の1の長さ。エクソソームの大きさを表すのによく使われます(約30〜150nm)。',
        related: ['エクソソーム'],
        char: 'rink'
    },
    {
        term: 'ロンジェビティ',
        reading: 'ろんじぇびてぃ',
        category: '長寿',
        explanation: '「長寿」「健康に長く生きること」を意味する言葉。近年、欧米を中心に、ただ寿命を延ばすだけでなく「健康なまま活動できる期間（健康寿命）」をどう延ばすかが大きなテーマになっています。食事・睡眠・運動・つながり・医療・美容・生きがいといった複数のスキルの掛け算で実現するという考え方が広がっています。',
        related: ['健康寿命', '生物学的年齢', 'エイジテック', 'キャリア・ロンジェビティ'],
        char: 'tanunee'
    },
    {
        term: '健康寿命',
        reading: 'けんこうじゅみょう',
        category: '長寿',
        explanation: '介護などに頼らず、自分で健康に日常生活を送れる期間のこと。単なる寿命（平均寿命）との差をいかに縮めるかが、人生120年時代のカギとされています。日々のセルフケア・睡眠・つながり・生きがいの積み重ねが、この健康寿命を支えます。',
        related: ['ロンジェビティ', '生きがい', '生物学的年齢'],
        char: 'konta'
    },
    {
        term: '生物学的年齢',
        reading: 'せいぶつがくてきねんれい',
        category: '長寿',
        explanation: 'Biological Age。戸籍上の「実年齢」とは別に、細胞や臓器が実際にどれくらい老化しているかを示す年齢のこと。生活習慣によって実年齢より若くも老けてもなります。欧米ではAIやバイオマーカー解析でこの差を可視化する流れがあり、このアプリの「ロンジェビティ・スコア（擬似・体内細胞年齢）」も、その考え方をゲーム的に体験できるようにしたものです。',
        related: ['エイジテック', 'ロンジェビティ', 'バイオマーカー'],
        char: 'tanunee'
    },
    {
        term: 'エイジテック',
        reading: 'えいじてっく',
        category: '長寿',
        explanation: 'Age-Tech。加齢や老化に関わる課題を、テクノロジーで解決・可視化しようとする分野。ウェアラブル端末での睡眠・活動量の計測や、バイオマーカーによる生物学的年齢の推定などが含まれます。「健康を見える化する」ことで、行動変容と習慣化を後押しします。',
        related: ['生物学的年齢', 'バイオマーカー', 'ロンジェビティ'],
        char: 'rink'
    },
    {
        term: 'キャリア・ロンジェビティ',
        reading: 'きゃりあろんじぇびてぃ',
        category: '長寿',
        explanation: '長く健康に「働き続ける力」のこと。人生120年時代には、学び直し（リスキリング）で脳を若く保ち続けることが、健康寿命と同じくらい重要だと考えられています。「学び」「つながり」「生きがい」は、体の健康と表裏一体の長寿スキルです。',
        related: ['ロンジェビティ', '生きがい', '健康寿命'],
        char: 'konta'
    }
];

const CATEGORIES = ['すべて', '基礎', '分子', '施術', '由来', '制度', '単位', '長寿'];

let currentFilter = 'すべて';
let currentSearch = '';

function renderFilters() {
    const filters = document.getElementById('glossary-filters');
    filters.innerHTML = CATEGORIES.map(cat => `
        <button class="glossary__filter ${cat === currentFilter ? 'glossary__filter--active' : ''}" data-cat="${cat}">
            ${cat}
        </button>
    `).join('');

    document.querySelectorAll('.glossary__filter').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.cat;
            renderFilters();
            renderList();
        });
    });
}

function renderList() {
    const search = currentSearch.toLowerCase().trim();
    const filtered = GLOSSARY_TERMS.filter(item => {
        const matchCat = currentFilter === 'すべて' || item.category === currentFilter;
        const matchSearch = !search ||
            item.term.toLowerCase().includes(search) ||
            item.reading.toLowerCase().includes(search) ||
            item.explanation.toLowerCase().includes(search);
        return matchCat && matchSearch;
    });

    // 件数表示
    document.getElementById('glossary-count').textContent = `${filtered.length}件の用語`;

    const list = document.getElementById('glossary-list');
    if (filtered.length === 0) {
        list.innerHTML = '<div class="glossary__empty">該当する用語が見つかりません</div>';
        return;
    }

    list.innerHTML = filtered.map((item, idx) => {
        const char = CHARACTERS[item.char];
        const charImg = getImagePath(item.char, 'normal', 1);
        return `
            <article class="glossary__item" data-term="${item.term}">
                <header class="glossary__item-header">
                    <div class="glossary__item-term">
                        ${item.term}
                        <span class="glossary__item-reading">${item.reading}</span>
                    </div>
                    <span class="glossary__item-category">${item.category}</span>
                    <span class="glossary__item-toggle">▼</span>
                </header>
                <div class="glossary__item-body">
                    <div class="glossary__item-content">
                        <div class="glossary__item-dialog">
                            <img class="glossary__item-avatar" src="${charImg}" alt="${char.name}">
                            <div class="glossary__item-text">
                                <strong style="color:${char.color}">${char.name}：</strong> ${item.explanation}
                            </div>
                        </div>
                        ${item.related.length > 0 ? `
                            <div class="glossary__item-related">
                                <span class="glossary__item-related-label">関連用語：</span>
                                ${item.related.map(r => `<span class="glossary__item-related-tag" data-term="${r}">${r}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </article>
        `;
    }).join('');

    // 開閉
    document.querySelectorAll('.glossary__item-header').forEach(h => {
        h.addEventListener('click', () => {
            h.parentElement.classList.toggle('glossary__item--open');
        });
    });

    // 関連用語クリック
    document.querySelectorAll('.glossary__item-related-tag').forEach(tag => {
        tag.addEventListener('click', (e) => {
            e.stopPropagation();
            const target = tag.dataset.term;
            jumpToTerm(target);
        });
    });
}

function jumpToTerm(term) {
    // 検索とフィルタをリセット
    currentSearch = '';
    currentFilter = 'すべて';
    document.getElementById('glossary-search').value = '';
    renderFilters();
    renderList();

    setTimeout(() => {
        const el = document.querySelector(`[data-term="${term}"]`);
        if (el) {
            el.classList.add('glossary__item--open');
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.style.boxShadow = '0 0 0 4px var(--color-primary)';
            setTimeout(() => {
                el.style.boxShadow = '';
            }, 1500);
        }
    }, 100);
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('glossary-list')) {
        renderFilters();
        renderList();

        const searchInput = document.getElementById('glossary-search');
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value;
            renderList();
        });
    }
});
