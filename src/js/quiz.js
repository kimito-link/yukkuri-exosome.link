/**
 * エクソソームクイズ
 */

const QUIZ_QUESTIONS = [
    {
        q: 'エクソソームはどんなもの？',
        options: [
            { text: '細胞から放出される小さなカプセル', correct: true },
            { text: '体内で増える特別な細胞', correct: false },
            { text: 'ホルモンの一種', correct: false },
            { text: '神経伝達物質', correct: false }
        ],
        explain: 'エクソソームは細胞から放出される、約100ナノメートル前後の小さなカプセルです。中に情報物質を入れて、他の細胞に届ける役割があります。'
    },
    {
        q: 'エクソソームの大きさはどのくらい？',
        options: [
            { text: '約1ミリメートル', correct: false },
            { text: '約30〜150ナノメートル', correct: true },
            { text: '約1センチメートル', correct: false },
            { text: '約10マイクロメートル', correct: false }
        ],
        explain: 'エクソソームは約30〜150ナノメートル。髪の毛の太さの1000分の1ほどの大きさです。'
    },
    {
        q: 'エクソソームの中に入っているものは？',
        options: [
            { text: '酸素', correct: false },
            { text: '水だけ', correct: false },
            { text: 'mRNA、miRNA、タンパク質など', correct: true },
            { text: '糖分', correct: false }
        ],
        explain: 'エクソソームの中には、mRNA・miRNA・タンパク質・脂質など、細胞間のコミュニケーションに使われる情報物質が入っています。'
    },
    {
        q: 'エクソソームと幹細胞の関係は？',
        options: [
            { text: 'まったく同じもの', correct: false },
            { text: '幹細胞が放出するもののひとつ', correct: true },
            { text: '幹細胞を破壊したもの', correct: false },
            { text: '幹細胞よりも大きなもの', correct: false }
        ],
        explain: '幹細胞も他の細胞と同様にエクソソームを放出します。幹細胞=お母さん、エクソソーム=お母さんが出すお弁当、というイメージです。'
    },
    {
        q: '培養上清液とエクソソームの関係は？',
        options: [
            { text: 'まったくの別物', correct: false },
            { text: '培養上清液の中にエクソソームが含まれる', correct: true },
            { text: 'エクソソームの中に培養上清液が含まれる', correct: false },
            { text: 'どちらかしか存在しない', correct: false }
        ],
        explain: '培養上清液は「お味噌汁全体」、エクソソームは「その中の具」のような包含関係です。'
    },
    {
        q: 'エクソソーム施術ではないものは？',
        options: [
            { text: '点滴', correct: false },
            { text: '注射', correct: false },
            { text: '美容液', correct: false },
            { text: '内服薬としての一般販売', correct: true }
        ],
        explain: 'エクソソームは現状、内服での医薬品として一般販売はされていません。一般的な施術は点滴・注射・メソガン・美容液の4タイプです。'
    },
    {
        q: 'エクソソームの「由来」として、よく使われないのは？',
        options: [
            { text: '歯髄', correct: false },
            { text: '脂肪', correct: false },
            { text: '臍帯（へその緒）', correct: false },
            { text: '空気', correct: true }
        ],
        explain: 'エクソソームの由来として一般的なのは、歯髄・脂肪・臍帯・骨髄など、細胞を含む生体組織です。空気からは作れません。'
    },
    {
        q: 'エクソソーム施術を選ぶときに「危ないサイン」は？',
        options: [
            { text: 'リスクや限界も丁寧に説明してくれる', correct: false },
            { text: '料金が明確に書いてある', correct: false },
            { text: '「絶対効く」と断定する', correct: true },
            { text: '質問にきちんと答えてくれる', correct: false }
        ],
        explain: '「絶対」「100%」など効果を断定する表現は医療広告ガイドライン的にも問題があります。誠実なクリニックは限界も含めて説明してくれます。'
    },
    {
        q: 'エクソソームの主な役割は？',
        options: [
            { text: '細胞を破壊する', correct: false },
            { text: '細胞間で情報を伝える', correct: true },
            { text: 'エネルギーを生み出す', correct: false },
            { text: '酸素を運ぶ', correct: false }
        ],
        explain: 'エクソソームは「細胞間の通信手段」とも呼ばれ、ある細胞から別の細胞へ情報を運ぶ役割を持ちます。'
    },
    {
        q: 'エクソソーム研究の応用分野として注目されているのは？',
        options: [
            { text: '再生医療・美容・診断', correct: true },
            { text: '建築材料', correct: false },
            { text: '農薬', correct: false },
            { text: '燃料電池', correct: false }
        ],
        explain: 'エクソソームは、再生医療、美容分野、病気の早期診断マーカーなど、医療・健康分野での応用が世界中で研究されています。'
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
