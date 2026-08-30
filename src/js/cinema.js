/**
 * 細胞シアター（cinema.js）
 * 5幕のシーンプレイヤー。幕を切り替えるたびにSVGを組み立て直すことで、
 * CSSアニメーションを毎回頭から再生させている。
 *
 * 依存: common.js（CHARACTERS / getImagePath / YEStorage）
 * 表現ルール: 効果を断定しない。「〜と考えられています」「研究が進められています」で止める。
 */

const CINEMA_DEPTH = 1; // src/cinema/ から見た階層

/* ============================================
   幕データ
   ============================================ */

const CINEMA_ACTS = [
    {
        no: 'ACT 1',
        chip: 'たまる',
        title: '細胞は、毎日つくって毎日いたむ',
        ms: 8000,
        fact: '細胞は絶えず新しいタンパク質をつくり、使い終わった部品や傷ついたミトコンドリアが少しずつ残っていきます。この「片づけ残し」がたまることが、老化を考えるうえでの出発点だとされています。',
        note: null,
        speaker: 'tanunee',
        expression: 'normal',
        line: '部屋とおなじよ。使えば散らかる。まずはそこからね。',
        svg: () => `
<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="細胞のなかに傷んだ部品がたまっていく様子">
  <path class="ce-cell ce-pulse" d="M320 34c132 0 238 66 238 146S452 326 320 326 82 260 82 180 188 34 320 34z"/>
  <circle class="ce-nuc" cx="452" cy="146" r="44"/>
  <text class="ce-label ce-label--s" x="452" y="151" text-anchor="middle">核</text>

  <!-- 新しくつくられたタンパク質 -->
  <circle class="ce-pop" style="animation-delay:.2s" cx="352" cy="112" r="7" fill="#8eb4c7"/>
  <circle class="ce-pop" style="animation-delay:.5s" cx="384" cy="240" r="6" fill="#8eb4c7"/>
  <circle class="ce-pop" style="animation-delay:.8s" cx="316" cy="176" r="7.5" fill="#8eb4c7"/>
  <circle class="ce-pop" style="animation-delay:1.1s" cx="268" cy="252" r="5.5" fill="#8eb4c7"/>

  <!-- いたんだ部品 -->
  <g class="ce-pop" style="animation-delay:1.8s">
    <rect x="150" y="150" width="54" height="26" rx="13" fill="#b8a08d" stroke="#8f7a67" stroke-width="2"/>
  </g>
  <g class="ce-pop" style="animation-delay:2.4s">
    <rect x="196" y="196" width="44" height="22" rx="11" fill="#b8a08d" stroke="#8f7a67" stroke-width="2"/>
  </g>
  <g class="ce-pop" style="animation-delay:3s">
    <circle cx="158" cy="212" r="11" fill="#a78a6b"/>
  </g>
  <g class="ce-pop" style="animation-delay:3.6s">
    <circle cx="226" cy="146" r="8" fill="#a78a6b"/>
  </g>

  <text class="ce-label ce-fade" style="animation-delay:4.2s" x="188" y="122" text-anchor="middle">いたんだ部品</text>
  <text class="ce-label ce-label--s ce-fade" style="animation-delay:.6s" x="336" y="88" text-anchor="middle">新しいタンパク質</text>
</svg>`
    },

    {
        no: 'ACT 2',
        chip: '掃除する',
        title: '掃除のスイッチ ― オートファジー',
        ms: 9500,
        fact: '細胞は膜を伸ばしていたんだ部品を包みこみ、分解酵素をもつリソソームと融合させて、アミノ酸のレベルまで分解します。取り出した材料は、新しいタンパク質をつくる材料として使い直されます。',
        note: '誤解されやすいところ：これは細胞を増やす（分裂させる）仕組みではありません。数が増えるのではなく、いまある細胞の中身が入れ替わります。',
        speaker: 'konta',
        expression: 'smileOpen',
        line: '分裂じゃなくて、模様替えなんだよ！',
        svg: () => `
<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="膜が傷んだ部品を包み、リソソームと融合して分解し、材料として再利用される様子">
  <path class="ce-cell" d="M320 34c132 0 238 66 238 146S452 326 320 326 82 260 82 180 188 34 320 34z"/>
  <circle class="ce-nuc" cx="470" cy="140" r="40"/>
  <text class="ce-label ce-label--s" x="470" y="145" text-anchor="middle">核</text>

  <!-- 包まれるゴミ -->
  <g class="ce-vanish" style="animation-delay:4s">
    <rect x="196" y="164" width="52" height="25" rx="12" fill="#b8a08d" stroke="#8f7a67" stroke-width="2"/>
    <rect x="212" y="198" width="40" height="20" rx="10" fill="#b8a08d" stroke="#8f7a67" stroke-width="2"/>
    <circle cx="196" cy="212" r="9" fill="#a78a6b"/>
  </g>

  <!-- 隔離膜が伸びて閉じる -->
  <circle class="ce-wrap" style="animation-delay:.5s" cx="222" cy="190" r="60"/>

  <!-- リソソームが寄ってきて融合 -->
  <g class="ce-move" style="--dx:-152px; --dy:-56px; animation-delay:2.6s">
    <circle cx="404" cy="248" r="26" fill="#c9a96e" opacity=".9"/>
    <text class="ce-label ce-label--s" x="404" y="252" text-anchor="middle" fill="#4a3a1c">分解酵素</text>
  </g>

  <!-- 分解中 -->
  <circle class="ce-digest ce-fade" style="animation-delay:4.2s" cx="222" cy="190" r="54" fill="#c9a96e" opacity=".4"/>

  <!-- 材料として散っていく -->
  <circle class="ce-drift" style="--dx:96px; --dy:-56px; animation-delay:5.4s" cx="222" cy="190" r="6" fill="#8eb4c7"/>
  <circle class="ce-drift" style="--dx:132px; --dy:34px; animation-delay:5.6s" cx="222" cy="190" r="5" fill="#8eb4c7"/>
  <circle class="ce-drift" style="--dx:56px; --dy:76px; animation-delay:5.8s" cx="222" cy="190" r="6.5" fill="#8eb4c7"/>
  <circle class="ce-drift" style="--dx:174px; --dy:-14px; animation-delay:6s" cx="222" cy="190" r="4.5" fill="#8eb4c7"/>
  <circle class="ce-drift" style="--dx:34px; --dy:-102px; animation-delay:6.2s" cx="222" cy="190" r="5.5" fill="#8eb4c7"/>

  <text class="ce-label ce-fade" style="animation-delay:1.4s" x="222" y="100" text-anchor="middle">膜が包む</text>
  <text class="ce-label ce-fade" style="animation-delay:6.4s" x="446" y="212" text-anchor="middle">材料として使い直す</text>
</svg>`
    },

    {
        no: 'ACT 3',
        chip: '伝える',
        title: '細胞から細胞への、小さな伝言',
        ms: 9500,
        fact: '細胞の内側でできた小さな袋が細胞膜と融合し、外へ放出されたものがエクソソームです。中にはタンパク質やmiRNAなどが入っていて、受け取った側の細胞のふるまいに影響すると考えられています。',
        note: null,
        speaker: 'rink',
        expression: 'smileOpen',
        line: '手紙みたいなのだ。開けた相手が動きだすのだ。',
        svg: () => `
<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="細胞の中の小胞が外に放出され、隣の細胞に受け取られる様子">
  <!-- 送り手の細胞 -->
  <path class="ce-cell" d="M170 60c92 0 152 50 152 118S262 300 170 300 24 246 24 178 78 60 170 60z"/>
  <circle class="ce-nuc" cx="96" cy="150" r="34"/>
  <text class="ce-label ce-label--s" x="96" y="155" text-anchor="middle">核</text>

  <!-- 多胞体（中に小胞がつまった袋）が細胞膜へ移動 -->
  <g class="ce-move" style="--dx:96px; --dy:6px; animation-delay:.8s">
    <circle cx="188" cy="196" r="40" fill="#fbeef2" stroke="#c9899a" stroke-width="2.5"/>
    <circle cx="176" cy="186" r="8" fill="#8eb4c7"/>
    <circle cx="200" cy="200" r="7" fill="#8eb4c7"/>
    <circle cx="184" cy="212" r="6" fill="#8eb4c7"/>
    <circle cx="202" cy="178" r="5.5" fill="#8eb4c7"/>
  </g>

  <!-- 放出されて漂う -->
  <circle class="ce-drift" style="--dx:186px; --dy:-38px; animation-delay:2.8s" cx="318" cy="196" r="8" fill="#8eb4c7"/>
  <circle class="ce-drift" style="--dx:170px; --dy:16px; animation-delay:3.1s" cx="318" cy="196" r="7" fill="#8eb4c7"/>
  <circle class="ce-drift" style="--dx:196px; --dy:52px; animation-delay:3.4s" cx="318" cy="196" r="6" fill="#8eb4c7"/>
  <circle class="ce-drift" style="--dx:158px; --dy:-76px; animation-delay:3.7s" cx="318" cy="196" r="5.5" fill="#8eb4c7"/>

  <!-- 受け手の細胞 -->
  <path class="ce-cell" d="M508 78c78 0 124 44 124 100s-46 100-124 100-116-44-116-100 38-100 116-100z"/>
  <circle class="ce-nuc" cx="548" cy="160" r="28"/>
  <circle class="ce-fade ce-pulse" style="animation-delay:5.4s" cx="512" cy="178" r="72" fill="#c9899a" opacity=".16"/>

  <text class="ce-label ce-label--s" x="188" y="264" text-anchor="middle">中で小胞ができる</text>
  <text class="ce-label ce-fade" style="animation-delay:3.4s" x="352" y="112" text-anchor="middle">エクソソーム</text>
  <text class="ce-label ce-fade" style="animation-delay:5.6s" x="512" y="306" text-anchor="middle">受け取った細胞が反応する</text>
</svg>`
    },

    {
        no: 'ACT 4',
        chip: '上ずみ',
        title: '上ずみに残るもの ― 培養上清',
        ms: 9500,
        fact: '細胞を育てた液から細胞そのものを取り除き、分泌された成分だけを残したものが培養上清（培養上清液）です。細胞は含まれません。何がどれだけ働くのかについては、いまも研究が進められている段階です。',
        note: '扱い方や品質の基準は提供する施設ごとに異なります。実際の施術を検討するときは、必ず医療機関で医師にご確認ください。',
        speaker: 'tanunee',
        expression: 'smile',
        line: '中身の話をきちんと聞かせてくれる相手かどうか。そこがいちばん大事よ。',
        svg: () => `
<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="培養液から細胞を取り除き、分泌成分を含む上ずみが残る様子">
  <!-- 容器 -->
  <path d="M132 70v198a34 34 0 0 0 34 34h308a34 34 0 0 0 34-34V70" fill="#f7f2ea" stroke="#d9cbb8" stroke-width="3"/>
  <rect x="120" y="58" width="400" height="14" rx="7" fill="#e8dcc8"/>

  <!-- 培養液 -->
  <path d="M140 132v134a26 26 0 0 0 26 26h308a26 26 0 0 0 26-26V132z" fill="#eef4f7" opacity=".9"/>

  <!-- 細胞（あとで取り除かれる） -->
  <g class="ce-vanish" style="animation-delay:4.2s">
    <ellipse cx="212" cy="278" rx="34" ry="18" fill="#fdf2f4" stroke="#e6c9d1" stroke-width="2"/>
    <ellipse cx="306" cy="284" rx="30" ry="16" fill="#fdf2f4" stroke="#e6c9d1" stroke-width="2"/>
    <ellipse cx="396" cy="276" rx="32" ry="17" fill="#fdf2f4" stroke="#e6c9d1" stroke-width="2"/>
  </g>

  <!-- 分泌された成分が液のなかへ -->
  <circle class="ce-drift" style="--dx:-14px; --dy:-96px; animation-delay:.6s" cx="212" cy="266" r="7" fill="#8eb4c7"/>
  <circle class="ce-drift" style="--dx:22px; --dy:-64px; animation-delay:1s" cx="306" cy="272" r="6" fill="#8eb4c7"/>
  <circle class="ce-drift" style="--dx:-30px; --dy:-116px; animation-delay:1.4s" cx="396" cy="264" r="6.5" fill="#8eb4c7"/>
  <circle class="ce-drift" style="--dx:48px; --dy:-88px; animation-delay:1.8s" cx="212" cy="266" r="5" fill="#8eb4c7"/>
  <circle class="ce-drift" style="--dx:-52px; --dy:-52px; animation-delay:2.2s" cx="396" cy="264" r="5.5" fill="#8eb4c7"/>
  <circle class="ce-drift" style="--dx:12px; --dy:-124px; animation-delay:2.6s" cx="306" cy="272" r="7" fill="#8eb4c7"/>

  <text class="ce-label ce-label--s" x="320" y="112" text-anchor="middle">培養液</text>
  <text class="ce-label ce-fade" style="animation-delay:3.2s" x="320" y="196" text-anchor="middle">分泌された成分</text>
  <text class="ce-label ce-fade" style="animation-delay:5s" x="320" y="336" text-anchor="middle">細胞を取り除いた上ずみ ＝ 培養上清</text>
</svg>`
    },

    {
        no: 'ACT 5',
        chip: '眠る',
        title: '眠っているあいだの、切り替え',
        ms: 10000,
        fact: '眠りに入って最初の深いノンレム睡眠のとき、成長ホルモンの分泌に大きな山ができます。体は日中の「動かす」モードから、修復と片づけのモードに移ります。皮膚などの一部の組織では、細胞が入れ替わるタイミングにも日内リズムがあることが知られています。',
        note: '誤解されやすいところ：眠ると細胞分裂が活発になって若返る、ではありません。入れ替わりは維持の作業です。体重については、睡眠が足りないと満腹のサインであるレプチンが下がり、空腹のサインであるグレリンが上がることがヒトの研究で報告されています。関わっているのは分裂ではなく食欲のほうです。',
        speaker: 'konta',
        expression: 'smile',
        line: 'がんばる時間じゃなくて、直す時間なんだよ。',
        svg: () => `
<svg viewBox="0 0 640 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="睡眠の深さのグラフと、最初の深い眠りに重なる成長ホルモン分泌の山">
  <rect x="24" y="28" width="592" height="318" rx="18" fill="#f1eef6" opacity=".6"/>
  <path d="M576 52a20 20 0 1 0 18 26 24 24 0 0 1-18-26z" fill="#c9a96e" opacity=".7"/>

  <!-- 深さの目盛り -->
  <text class="ce-label ce-label--s" x="64" y="134" text-anchor="end">覚醒</text>
  <text class="ce-label ce-label--s" x="64" y="174" text-anchor="end">浅い</text>
  <text class="ce-label ce-label--s" x="64" y="229" text-anchor="end">深い</text>

  <!-- 最初の深い眠り -->
  <rect class="ce-fade" style="animation-delay:1.6s" x="120" y="210" width="72" height="28" rx="7" fill="#8eb4c7" opacity=".22"/>

  <!-- 睡眠の深さ -->
  <polyline class="ce-draw" style="animation-delay:.3s" stroke="#8eb4c7" stroke-width="3"
    points="84,130 104,170 126,225 186,225 206,170 226,150 250,170 272,222 320,222 340,170 364,152 388,170 408,200 448,200 468,160 492,145 512,165 532,185 566,185 586,145 600,130"/>

  <!-- 修復と片づけ -->
  <circle class="ce-pop" style="animation-delay:3.4s" cx="132" cy="84" r="6" fill="#8eb4c7"/>
  <circle class="ce-pop" style="animation-delay:3.7s" cx="158" cy="84" r="7" fill="#8eb4c7"/>
  <circle class="ce-pop" style="animation-delay:4s" cx="184" cy="84" r="5.5" fill="#8eb4c7"/>
  <text class="ce-label ce-fade" style="animation-delay:4.2s" x="158" y="64" text-anchor="middle">修復と片づけ</text>

  <!-- 成長ホルモンの分泌 -->
  <line x1="84" y1="326" x2="600" y2="326" stroke="#d9cbb8" stroke-width="1.5"/>
  <path class="ce-fade" style="animation-delay:4.6s" fill="#c9a96e" opacity=".38"
    d="M84 326C118 326 128 258 156 258C184 258 194 326 232 326L300 326C328 326 334 296 356 296C378 296 384 326 412 326L470 326C492 326 498 304 512 304C526 304 532 326 556 326L600 326Z"/>
  <text class="ce-label ce-fade" style="animation-delay:5s" x="156" y="250" text-anchor="middle">成長ホルモンの分泌</text>

  <text class="ce-label ce-label--s" x="84" y="350" text-anchor="start">就寝</text>
  <text class="ce-label ce-label--s" x="600" y="350" text-anchor="end">起床</text>
</svg>`
    },

    {
        no: 'ACT 6',
        chip: '記録する',
        title: '見えないものは、記録すると見えてくる',
        ms: 9000,
        fact: '体の中で起きていることは目には見えません。だからこそ、睡眠・食事・運動・ケア・通院を毎日つけておくと、あとから変化のかたちが見えてきます。このアプリの体内シグナルマップは、その記録を並べたものです。',
        note: 'マップの点灯や「＋◯粒」は分かりやすさのためのイメージで、体内の実測値ではありません。',
        speaker: 'rink',
        expression: 'smile',
        line: '今日のぶんを、ひとつだけつけて帰るのだ。',
        svg: () => {
            const hexes = [
                [320, 84, '髪'], [452, 152, '目元'], [452, 258, '循環'],
                [320, 326, '腸内'], [188, 258, '筋肉'], [188, 152, '肌']
            ];
            const hex = (cx, cy, label, i) => {
                const r = 44;
                const pts = Array.from({ length: 6 }, (_, k) => {
                    const a = (Math.PI / 180) * (60 * k - 90);
                    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
                }).join(' ');
                return `
  <g class="ce-pop" style="animation-delay:${(0.3 + i * 0.45).toFixed(2)}s">
    <polygon points="${pts}" fill="#fdf2f4" stroke="#c9899a" stroke-width="2.5"/>
    <text class="ce-label ce-label--s" x="${cx}" y="${cy + 4}" text-anchor="middle">${label}</text>
  </g>`;
            };
            const days = Array.from({ length: 7 }, (_, i) => `
  <rect class="ce-pop" style="animation-delay:${(3.4 + i * 0.18).toFixed(2)}s"
        x="${44 + i * 26}" y="322" width="20" height="20" rx="5" fill="#c9a96e" opacity=".7"/>`).join('');
            return `
<svg viewBox="0 0 640 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="6つの部位のマップが順に点灯し、日々の記録が積み上がる様子">
  <circle class="ce-pulse" cx="320" cy="205" r="118" fill="#c9899a" opacity=".07"/>
  ${hexes.map(([x, y, l], i) => hex(x, y, l, i)).join('')}
  ${days}
  <text class="ce-label ce-fade" style="animation-delay:4.8s" x="44" y="312" text-anchor="start">つけた日が積み上がっていく</text>
</svg>`;
        }
    }
];

/* ============================================
   プレイヤー
   ============================================ */

(function () {
    const root = document.getElementById('cinema');
    if (!root) return;

    let index = 0;
    let playing = true;
    let timer = null;

    root.innerHTML = `
        <div class="cinema__stage">
            <div class="cinema__progress" id="cinemaProgress">
                ${CINEMA_ACTS.map(() => '<span></span>').join('')}
            </div>
            <div class="cinema__screen" id="cinemaScreen"></div>
            <div class="cinema__panel">
                <div class="cinema__act" id="cinemaAct"></div>
                <h2 class="cinema__title" id="cinemaTitle"></h2>
                <p class="cinema__fact" id="cinemaFact"></p>
                <div id="cinemaNote"></div>
                <div class="cinema__say" id="cinemaSay"></div>
            </div>
            <div class="cinema__controls">
                <button class="cinema__btn" id="cinemaPrev" type="button">まえの幕</button>
                <button class="cinema__btn cinema__btn--main" id="cinemaToggle" type="button">一時停止</button>
                <button class="cinema__btn" id="cinemaNext" type="button">つぎの幕</button>
            </div>
            <p class="cinema__hint">画面をタップしても次に進みます</p>
        </div>
        <div class="cinema__index" id="cinemaIndex">
            ${CINEMA_ACTS.map((a, i) => `
                <button class="cinema__chip" type="button" data-go="${i}">
                    <b>${a.no}</b>${a.chip}
                </button>`).join('')}
        </div>
    `;

    const $screen = document.getElementById('cinemaScreen');
    const $act = document.getElementById('cinemaAct');
    const $title = document.getElementById('cinemaTitle');
    const $fact = document.getElementById('cinemaFact');
    const $note = document.getElementById('cinemaNote');
    const $say = document.getElementById('cinemaSay');
    const $toggle = document.getElementById('cinemaToggle');
    const $bars = document.getElementById('cinemaProgress').children;
    const $chips = document.getElementById('cinemaIndex').children;

    function render() {
        const a = CINEMA_ACTS[index];

        $screen.innerHTML = a.svg();
        $act.textContent = a.no;
        $title.textContent = a.title;
        $fact.textContent = a.fact;
        $note.innerHTML = a.note ? `<div class="cinema__note">${a.note}</div>` : '';

        const char = CHARACTERS[a.speaker];
        $say.className = `cinema__say cinema__say--${a.speaker}`;
        $say.innerHTML = `
            <img src="${getImagePath(a.speaker, a.expression, CINEMA_DEPTH)}" alt="${char.name}">
            <div class="cinema__bubble"><strong>${char.name}</strong>「${a.line}」</div>
        `;

        for (let i = 0; i < $bars.length; i++) {
            $bars[i].classList.toggle('is-done', i <= index);
            $chips[i].classList.toggle('is-active', i === index);
        }

        if (index === CINEMA_ACTS.length - 1) {
            YEStorage.set('cinema_last_watched', getTodayKey());
        }
    }

    function schedule() {
        clearTimeout(timer);
        if (!playing) return;
        timer = setTimeout(() => go(index + 1), CINEMA_ACTS[index].ms);
    }

    function go(next) {
        index = (next + CINEMA_ACTS.length) % CINEMA_ACTS.length;
        render();
        schedule();
    }

    function setPlaying(v) {
        playing = v;
        $toggle.textContent = v ? '一時停止' : '再生';
        if (v) schedule(); else clearTimeout(timer);
    }

    $screen.addEventListener('click', () => go(index + 1));
    document.getElementById('cinemaNext').addEventListener('click', () => go(index + 1));
    document.getElementById('cinemaPrev').addEventListener('click', () => go(index - 1));
    $toggle.addEventListener('click', () => setPlaying(!playing));

    Array.from($chips).forEach(chip => {
        chip.addEventListener('click', () => go(parseInt(chip.dataset.go, 10)));
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight') go(index + 1);
        if (e.key === 'ArrowLeft') go(index - 1);
    });

    // 動きを減らす設定の人には自動送りを切っておく
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        playing = false;
        $toggle.textContent = '再生';
    }

    render();
    schedule();
})();
