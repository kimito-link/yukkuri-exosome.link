/**
 * エクソソームクイズ
 */

const QUIZ_QUESTIONS = [
    {
        q: '「培養上清液」とはどんなもの？',
        options: [
            { text: '幹細胞そのものを濃縮した液', correct: false },
            { text: '幹細胞を育てた液から、細胞を取り除いた上澄み液', correct: true },
            { text: '血液から作る点滴液', correct: false },
            { text: '植物から抽出したエキス', correct: false }
        ],
        explain: '培養上清液は、幹細胞を培養した液から細胞そのものを取り除いた「上澄み液」。かつては廃棄物として扱われていましたが、幹細胞が分泌したサイトカインやエクソソームなどが含まれることから、再生医療の分野で研究が進められています。研究段階の話であり、効果を保証するものではありません。（参考: <a href="https://pubmed.ncbi.nlm.nih.gov/28841158/" target="_blank" rel="noopener">PubMed PMID: 28841158</a>）'
    },
    {
        q: 'エクソソームのおおよその大きさは？',
        options: [
            { text: '約1ミリメートル', correct: false },
            { text: '約0.1ミリメートル（髪の毛の太さくらい）', correct: false },
            { text: '約30〜150ナノメートル', correct: true },
            { text: '肉眼で見えるくらい', correct: false }
        ],
        explain: 'エクソソームは直径およそ30〜150ナノメートル（1ナノメートルは10億分の1メートル）。髪の毛の太さのおよそ1000分の1という、とても小さなカプセルです。（参考: <a href="https://pubmed.ncbi.nlm.nih.gov/32029601/" target="_blank" rel="noopener">PubMed PMID: 32029601</a>）'
    },
    {
        q: 'エクソソームはどんなもの？',
        options: [
            { text: '細胞から放出される小さなカプセル', correct: true },
            { text: '体内で増える特別な細胞', correct: false },
            { text: 'ホルモンの一種', correct: false },
            { text: '神経伝達物質', correct: false }
        ],
        explain: 'エクソソームは細胞から放出される、約30〜150ナノメートルの小さな膜小胞（カプセル）。中にmRNAやmiRNAなどの情報物質を入れて、他の細胞に届ける役割があります。'
    },
    {
        q: '「セルフリー再生医療（Stem-Cell-Free Therapy）」とは？',
        options: [
            { text: '幹細胞を冷凍保存する治療', correct: false },
            { text: '生きた幹細胞を移植せず、培養上清液だけを使う治療', correct: true },
            { text: '無料で受けられる再生医療', correct: false },
            { text: '幹細胞を増やす治療', correct: false }
        ],
        explain: '「セルフリー再生医療」は、生きた幹細胞そのものではなく、幹細胞が分泌した培養上清液（サイトカインやエクソソームを含む）だけを使う方法。腫瘍化のリスクを避けやすいと考えられ、世界中で研究が進められています。（参考: <a href="https://pubmed.ncbi.nlm.nih.gov/28841158/" target="_blank" rel="noopener">PubMed PMID: 28841158</a>）'
    },
    {
        q: '乳歯と脳の発生起源が近いことから、神経系の分野で研究されることが多い幹細胞の由来は？',
        options: [
            { text: '脂肪幹細胞', correct: false },
            { text: '骨髄幹細胞', correct: false },
            { text: '乳歯歯髄幹細胞', correct: true },
            { text: '皮膚幹細胞', correct: false }
        ],
        explain: '乳歯の歯髄にある幹細胞（SHED）は、乳歯と脳の発生起源が近いことから、神経系の分野で研究されることが多い由来です。いずれも研究段階の話であり、効果を保証するものではありません。（参考: <a href="https://pubmed.ncbi.nlm.nih.gov/12716973/" target="_blank" rel="noopener">PubMed PMID: 12716973</a>）'
    },
    {
        q: '培養上清液と幹細胞そのものを使う治療、一般に「腫瘍化のリスク」を避けやすいと考えられているのは？',
        options: [
            { text: '幹細胞そのものを移植する方', correct: false },
            { text: '培養上清液を使う方', correct: true },
            { text: '両方同じ', correct: false },
            { text: '比較できない', correct: false }
        ],
        explain: '培養上清液は生きている幹細胞を取り除いてあるため、腫瘍化（がん化）のリスクを避けやすいとされています。一方、生きた細胞の移植には血栓・がん化・コストの課題が指摘されています。'
    },
    {
        q: '幹細胞の培養上清液を使った動物実験で、保護効果が報告された臓器の例は？',
        options: [
            { text: '心臓', correct: true },
            { text: '歯の表面のエナメル質', correct: false },
            { text: '視神経', correct: false },
            { text: '腎臓', correct: false }
        ],
        explain: 'ラットの心筋梗塞モデルで、幹細胞の培養上清液を投与すると心臓の傷つく範囲が小さくなった、という研究報告があります（Gnecchi M, et al. Nat Med. 2005／<a href="https://pubmed.ncbi.nlm.nih.gov/15812508/" target="_blank" rel="noopener">PubMed PMID: 15812508</a>）。「幹細胞が出す物質が働く」というパラクライン作用の考え方を支える研究のひとつですが、ヒトでの効果を保証するものではありません。'
    },
    {
        q: '培養上清液とエクソソームの関係は？',
        options: [
            { text: 'まったくの別物', correct: false },
            { text: '培養上清液の中にエクソソームが含まれる', correct: true },
            { text: 'エクソソームの中に培養上清液が含まれる', correct: false },
            { text: 'どちらかしか存在しない', correct: false }
        ],
        explain: '培養上清液は「お味噌汁全体」、エクソソームは「その中の具」のような包含関係です。培養上清液にはエクソソームのほか、サイトカイン・成長因子・細胞外マトリックスなど多くの成分が含まれます。'
    },
    {
        q: 'エクソソーム施術を選ぶときに「危ないサイン」は？',
        options: [
            { text: 'リスクや限界も丁寧に説明してくれる', correct: false },
            { text: '料金が明確に書いてある', correct: false },
            { text: '「絶対効く」と断定する', correct: true },
            { text: '質問にきちんと答えてくれる', correct: false }
        ],
        explain: '「絶対」「100%」など効果を断定する表現は医療広告ガイドライン的にも問題があります。誠実なクリニックは由来・製造方法・限界も含めて説明してくれます。'
    },
    {
        q: '培養上清液に含まれる代表的な成長因子の組み合わせは？',
        options: [
            { text: 'ビタミンC・ビタミンE・ビタミンA', correct: false },
            { text: 'カルシウム・マグネシウム・鉄分', correct: false },
            { text: 'IGF-1・VEGF・TGF-β1・HGF', correct: true },
            { text: 'アミノ酸20種類', correct: false }
        ],
        explain: '培養上清液には、IGF-1（インスリン様成長因子）・VEGF（血管内皮増殖因子）・TGF-β1（形質転換成長因子）・HGF（肝細胞増殖因子）など、多数の成長因子やサイトカインが含まれることが研究で報告されています。（参考: <a href="https://pubmed.ncbi.nlm.nih.gov/28841158/" target="_blank" rel="noopener">PubMed PMID: 28841158</a>）'
    },
    {
        q: '近年欧米で注目される「ロンジェビティ（長寿）」の考え方として正しいのは？',
        options: [
            { text: 'とにかく寿命の長さだけを延ばすこと', correct: false },
            { text: '食事・睡眠・運動・つながり・医療・美容・生きがいなど複数のスキルの掛け算で健康寿命を延ばすこと', correct: true },
            { text: 'サプリだけ飲んでいれば達成できること', correct: false },
            { text: '若いうちは関係ない、高齢者だけのテーマ', correct: false }
        ],
        explain: 'ロンジェビティは「ただ長生き」ではなく「健康なまま長く活動できる期間（健康寿命）」を延ばす考え方。食事・睡眠・運動といった体のケアに加え、人との「つながり」や「生きがい」までを含めた複数スキルの掛け算で実現する、というのが近年の潮流です。'
    },
    {
        q: '「生物学的年齢（Biological Age）」とは何のこと？',
        options: [
            { text: '生まれてから経過した戸籍上の年齢', correct: false },
            { text: '細胞や臓器が実際にどれくらい老化しているかを示す年齢', correct: true },
            { text: '一番元気だった頃の年齢', correct: false },
            { text: '血液型から分かる年齢', correct: false }
        ],
        explain: '生物学的年齢は、実年齢（戸籍上の年齢）とは別に、細胞や臓器の老化度を示すもの。生活習慣しだいで実年齢より若くも老けてもなります。欧米ではAIやバイオマーカーでこの差を可視化する「エイジテック」が注目されています。'
    },
    {
        q: '「リスキリング（学び直し）」と長寿の関係について、近年の考え方は？',
        options: [
            { text: '学びと健康はまったく無関係', correct: false },
            { text: '学び続けて脳を若く保つことは、長く健康に働く力（健康寿命）と表裏一体', correct: true },
            { text: 'リスキリングは体の健康を悪くする', correct: false },
            { text: '学ぶのは仕事のためだけで寿命には影響しない', correct: false }
        ],
        explain: '人生120年時代には、学び直し（リスキリング）で脳を若々しく保つことが、体の健康寿命と同じくらい重要だと考えられています。「学び」「つながり」「生きがい」は、体のケアと一体の長寿スキルです。'
    }
];

// 結果のリアクション
// ratio = 正解率のしきい値。問題数が増減しても順位の意味が保たれるよう、
// 絶対値ではなく割合で判定する（renderResult 側で QUIZ_QUESTIONS.length に掛ける）。
const QUIZ_RESULTS = [
    {
        ratio: 0.85,
        rank: 'エクソソーム博士👑',
        message: 'すごい！エクソソームのことをよく理解していますね。<br>もう周りの人にも説明できるレベルです。',
        char: 'tanunee',
        expression: 'smileOpen'
    },
    {
        ratio: 0.65,
        rank: 'エクソソーム上級者✨',
        message: 'かなり詳しいですね！細かいところまで押さえています。<br>もう一歩で博士レベルです。',
        char: 'tanunee',
        expression: 'smile'
    },
    {
        ratio: 0.45,
        rank: 'エクソソーム中級者💪',
        message: '基本はしっかり押さえています！<br>もう少し記事を読むと、もっと詳しくなれますよ。',
        char: 'konta',
        expression: 'smileOpen'
    },
    {
        ratio: 0.25,
        rank: 'エクソソーム入門者🌱',
        message: 'まだ始まったばかり！<br>記事を順番に読んでいけば、すぐ詳しくなれますよ。',
        char: 'konta',
        expression: 'normal'
    },
    {
        ratio: 0,
        rank: 'エクソソームこれから🍡',
        message: 'これから一緒に学んでいこう！<br>「エクソソームって何？」の記事から始めるのがおすすめです。',
        char: 'rink',
        expression: 'half'
    }
];

let currentQuestionIndex = 0;
let score = 0;
let questions = [];
let answered = false;

function startQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    answered = false;
    questions = shuffle(QUIZ_QUESTIONS);
    renderQuestion();
}

function renderQuestion() {
    const container = document.getElementById('quiz-container');
    if (currentQuestionIndex >= questions.length) {
        renderResult();
        return;
    }
    const q = questions[currentQuestionIndex];
    const shuffledOptions = shuffle(q.options);
    const progress = ((currentQuestionIndex) / questions.length) * 100;
    answered = false;

    // ランダムなキャラを質問担当に
    const charKeys = ['rink', 'konta', 'tanunee'];
    const charKey = charKeys[currentQuestionIndex % 3];
    const charImg = getImagePath(charKey, 'normal', 1);

    container.innerHTML = `
        <div class="quiz">
            <div class="quiz__progress">
                <span>問題 ${currentQuestionIndex + 1} / ${questions.length}</span>
                <div class="quiz__progress-bar">
                    <div class="quiz__progress-fill" style="width: ${progress}%"></div>
                </div>
                <span>正解: ${score}</span>
            </div>
            <div class="quiz__character">
                ${characterPicture(charImg, { alt: CHARACTERS[charKey].name, className: 'quiz__character-img', width: 140 })}
            </div>
            <div class="quiz__question">${q.q}</div>
            <div class="quiz__options" id="quiz-options">
                ${shuffledOptions.map((opt, i) => `
                    <button class="quiz__option" data-correct="${opt.correct}" data-index="${i}">
                        ${opt.text}
                    </button>
                `).join('')}
            </div>
            <div id="quiz-feedback"></div>
        </div>
    `;

    document.querySelectorAll('.quiz__option').forEach(btn => {
        btn.addEventListener('click', handleAnswer);
    });
}

function handleAnswer(e) {
    if (answered) return;
    answered = true;
    const btn = e.currentTarget;
    const correct = btn.dataset.correct === 'true';
    const q = questions[currentQuestionIndex];

    // 全ボタンを無効化、正答をマーク
    document.querySelectorAll('.quiz__option').forEach(b => {
        if (b.dataset.correct === 'true') {
            b.classList.add('quiz__option--correct');
        } else {
            b.classList.add('quiz__option--disabled');
        }
    });

    if (correct) {
        score++;
        // EP獲得
        if (typeof App !== 'undefined') {
            const r = App.addEP(EP_REWARDS.quiz_correct, 'quiz_correct');
            App.notifyEP(EP_REWARDS.quiz_correct, 'クイズ正解');
            if (r && r.leveledUp) {
                setTimeout(() => App.notifyLevelUp(r), 800);
            }
        }
        // デイリークイズカウンタ更新
        if (typeof App !== 'undefined') {
            const today = getTodayKey();
            const daily = YEStorage.get(`daily_quiz_${today}`, { answered: 0, correct: 0 });
            daily.answered++;
            daily.correct++;
            YEStorage.set(`daily_quiz_${today}`, daily);
        }
    } else {
        btn.classList.add('quiz__option--wrong');
        if (typeof App !== 'undefined') {
            const today = getTodayKey();
            const daily = YEStorage.get(`daily_quiz_${today}`, { answered: 0, correct: 0 });
            daily.answered++;
            YEStorage.set(`daily_quiz_${today}`, daily);
        }
    }

    // フィードバック表示
    const feedback = document.getElementById('quiz-feedback');
    feedback.innerHTML = `
        <div class="quiz__feedback ${correct ? 'quiz__feedback--correct' : 'quiz__feedback--wrong'}">
            ${correct ? '🎉 正解！' : '😢 残念…'}
            <div class="quiz__explanation">${q.explain}</div>
        </div>
        <div class="quiz__actions">
            <button class="btn btn--primary" id="quiz-next">
                ${currentQuestionIndex + 1 >= questions.length ? '結果を見る' : '次の問題 →'}
            </button>
        </div>
    `;

    document.getElementById('quiz-next').addEventListener('click', () => {
        currentQuestionIndex++;
        renderQuestion();
    });

    // プログレスバーを更新
    const progressFill = document.querySelector('.quiz__progress-fill');
    if (progressFill) {
        const newProgress = ((currentQuestionIndex + 1) / questions.length) * 100;
        progressFill.style.width = newProgress + '%';
    }
}

function renderResult() {
    const container = document.getElementById('quiz-container');
    const totalQ = questions.length || QUIZ_QUESTIONS.length;
    const result = QUIZ_RESULTS.find(r => score >= Math.ceil(r.ratio * totalQ)) || QUIZ_RESULTS[QUIZ_RESULTS.length - 1];
    const char = CHARACTERS[result.char];
    const charImg = getImagePath(result.char, result.expression, 1);

    // ベストスコア保存
    const best = YEStorage.get('quiz_best', 0);
    if (score > best) {
        YEStorage.set('quiz_best', score);
    }
    const newBest = score > best;

    // 全問正解ボーナス
    if (typeof App !== 'undefined' && score === questions.length) {
        setTimeout(() => {
            const r = App.addEP(EP_REWARDS.quiz_perfect, 'quiz_perfect');
            App.showToast(`全問正解！ +${EP_REWARDS.quiz_perfect}EP ボーナス！`, '🏆', 3500);
            if (r && r.leveledUp) setTimeout(() => App.notifyLevelUp(r), 2000);
        }, 600);
    }

    container.innerHTML = `
        <div class="quiz-result">
            <div class="quiz-result__chars">
                ${characterPicture(charImg, { alt: char.name, className: 'quiz-result__char', width: 100 })}
            </div>
            <div class="quiz-result__score">スコア：${score} / ${questions.length}問正解</div>
            <div class="quiz-result__rank">${result.rank}</div>
            <div class="quiz-result__message">${result.message}</div>
            ${newBest ? '<div style="color:#ff8fa3; font-weight:700; margin: 16px 0;">🏆 ベストスコア更新！</div>' : ''}
            ${best > 0 && !newBest ? `<div style="color:var(--color-text-muted); font-size:0.9rem;">ベストスコア：${best}問</div>` : ''}
            <div class="quiz-result__actions">
                <button class="btn btn--primary" id="quiz-retry">もう一度挑戦</button>
                <a href="../" class="btn btn--secondary">ホームに戻る</a>
            </div>
        </div>
    `;

    document.getElementById('quiz-retry').addEventListener('click', startQuiz);
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('quiz-container')) {
        // スタート画面
        const container = document.getElementById('quiz-container');
        const bestScore = YEStorage.get('quiz_best', 0);
        container.innerHTML = `
            <div class="quiz-result">
                <div class="quiz-result__chars">
                    ${characterPicture(getImagePath('rink', 'smileOpen', 1), { alt: 'りんく', className: 'quiz-result__char', width: 100 })}
                    ${characterPicture(getImagePath('konta', 'smileOpen', 1), { alt: 'こん太', className: 'quiz-result__char', width: 100 })}
                    ${characterPicture(getImagePath('tanunee', 'smileOpen', 1), { alt: 'たぬ姉', className: 'quiz-result__char', width: 100 })}
                </div>
                <h2 style="margin: 24px 0 8px;">エクソソームクイズ</h2>
                <p style="color: var(--color-text-muted); margin-bottom: 24px;">全${QUIZ_QUESTIONS.length}問、何問正解できるかな？</p>
                ${bestScore > 0 ? `<div style="margin: 16px 0;">🏆 あなたのベストスコア：<strong>${bestScore}問</strong></div>` : ''}
                <button class="btn btn--primary btn--large" id="quiz-start">スタート！</button>
            </div>
        `;
        document.getElementById('quiz-start').addEventListener('click', startQuiz);
    }
});
