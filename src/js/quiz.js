/**
 * エクソソームクイズ
 */

const QUIZ_QUESTIONS = [
    {
        q: '上田実先生が「世界で初めて発見」したと言われていることは？',
        options: [
            { text: 'iPS細胞の作り方', correct: false },
            { text: '幹細胞の分泌するサイトカインが組織再生の主役であること', correct: true },
            { text: '人工心臓の埋め込み技術', correct: false },
            { text: 'がんワクチンの開発', correct: false }
        ],
        explain: '上田実先生（名古屋大学名誉教授）は、世界で初めて「幹細胞の分泌するサイトカイン（培養上清液中の成分）が組織再生の主役である」ことを発見しました。それまで廃棄物とみなされていた培養上清液に、再生医療の鍵が含まれていたのです。'
    },
    {
        q: '上田先生によれば、培養上清液には何種類のサイトカインなどのタンパク因子が含まれている？',
        options: [
            { text: '約10種類', correct: false },
            { text: '約100種類', correct: false },
            { text: '2,000種類以上', correct: true },
            { text: '無限', correct: false }
        ],
        explain: '上田先生のインタビューによれば、培養上清液を分析すると「2,000種類以上のサイトカインなどのタンパク因子」が見つかったとのことです。これらが組み合わさって治療効果を生むと考えられています。'
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
        explain: '上田先生が提唱する「セルフリー再生医療」は、生きた幹細胞そのものではなく、幹細胞が分泌した培養上清液（サイトカインやエクソソームを含む）だけを使う方法。腫瘍化のリスクを避けやすいとされ、世界の研究の主流になりつつあります。'
    },
    {
        q: '上田先生によれば、特に「神経系の再生やアレルギー疾患」に向くとされる由来は？',
        options: [
            { text: '脂肪幹細胞', correct: false },
            { text: '骨髄幹細胞', correct: false },
            { text: '乳歯歯髄幹細胞', correct: true },
            { text: '皮膚幹細胞', correct: false }
        ],
        explain: '上田先生は「乳歯歯髄幹細胞は神経系の再生やアレルギー疾患への応用に向いている」と述べています。理由は乳歯と脳の発生起源が近いためで、神経系への親和性が高いためとされています。'
    },
    {
        q: '培養上清液と幹細胞そのものを使う治療、上田先生の見解で「リスク」が低いのは？',
        options: [
            { text: '幹細胞そのものを移植する方', correct: false },
            { text: '培養上清液を使う方', correct: true },
            { text: '両方同じ', correct: false },
            { text: '比較できない', correct: false }
        ],
        explain: '上田先生によれば、培養上清液は「生きている幹細胞を完全に取り除く」ため、腫瘍化（がん化）のリスクを避けやすいとされています。一方、生きた細胞の移植には血栓・がん化・コストの課題が指摘されています。'
    },
    {
        q: '2012年、名古屋大学が培養上清液で再生に成功したのは？',
        options: [
            { text: '心臓の血管', correct: false },
            { text: '歯周組織（歯槽骨・セメント質）', correct: true },
            { text: '視神経', correct: false },
            { text: '腎臓', correct: false }
        ],
        explain: '2012年、上田実先生らの名古屋大学のチームは「幹細胞を含まない培養液のみで、イヌの歯周組織（歯槽骨・セメント質）の再生に成功」と発表しました。これはセルフリー再生医療の重要な裏付けの一つです。'
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
        explain: '2012年の名古屋大学の発表では、培養液中に「IGF-1（インスリン様成長因子）・VEGF（血管内皮増殖因子）・TGF-β1（形質転換成長因子）・HGF（肝細胞増殖因子）」など多数のサイトカインが含まれることが報告されました。'
    }
];

// 結果のリアクション
const QUIZ_RESULTS = [
    {
        min: 9,
        rank: 'エクソソーム博士👑',
        message: 'すごい！エクソソームのことをよく理解していますね。<br>もう周りの人にも説明できるレベルです。',
        char: 'tanunee',
        expression: 'smileOpen'
    },
    {
        min: 7,
        rank: 'エクソソーム上級者✨',
        message: 'かなり詳しいですね！細かいところまで押さえています。<br>もう一歩で博士レベルです。',
        char: 'tanunee',
        expression: 'smile'
    },
    {
        min: 5,
        rank: 'エクソソーム中級者💪',
        message: '基本はしっかり押さえています！<br>もう少し記事を読むと、もっと詳しくなれますよ。',
        char: 'konta',
        expression: 'smileOpen'
    },
    {
        min: 3,
        rank: 'エクソソーム入門者🌱',
        message: 'まだ始まったばかり！<br>記事を順番に読んでいけば、すぐ詳しくなれますよ。',
        char: 'konta',
        expression: 'normal'
    },
    {
        min: 0,
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
                <img class="quiz__character-img" src="${charImg}" alt="${CHARACTERS[charKey].name}">
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
    const result = QUIZ_RESULTS.find(r => score >= r.min);
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
                <img class="quiz-result__char" src="${charImg}" alt="${char.name}">
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
                    <img class="quiz-result__char" src="${getImagePath('rink', 'smileOpen', 1)}" alt="りんく">
                    <img class="quiz-result__char" src="${getImagePath('konta', 'smileOpen', 1)}" alt="こん太">
                    <img class="quiz-result__char" src="${getImagePath('tanunee', 'smileOpen', 1)}" alt="たぬ姉">
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
