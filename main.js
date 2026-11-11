// ======================================
// HTMLの要素を取得
// ======================================
const questionElement = document.getElementById('question');
const choicesElement = document.getElementById('choices'); // 選択肢を入れる場所
const resultElement = document.getElementById('result');

const quizContainer = document.getElementById('quiz-container');
const homeButton = document.getElementById('home-btn');
const categoryContainer = document.getElementById('category-selection-container');
const levelContainer = document.getElementById('level-selection-container');
const levelTitle = document.getElementById('level-title');
const categoryButtons = document.querySelectorAll('.category-btn');
const levelButtons = document.querySelectorAll('.level-btn'); // 「熟語」も含む
const sublevelButtons = levelContainer.querySelectorAll('.level-btn'); // 動詞・名詞・形副ボタン
const idiomButtons = categoryContainer.querySelectorAll('.level-btn'); // 熟語ボタン
const backButton = document.getElementById('back-btn');
const modeBtnEnJp = document.getElementById('mode-en-jp'); // 英語 → 日本語
const modeBtnJpEn = document.getElementById('mode-jp-en'); // 日本語 → 英語
const reviewWeakButton = document.getElementById('review-weak-btn');

// カウンター用の要素
const questionNumberEl = document.getElementById('question-number');
const totalQuestionsEl = document.getElementById('total-questions');
const correctCountEl = document.getElementById('correct-count');

// --- 定数 ---
const STORAGE_KEY = 'eitango.wrongWords'; // 間違えた単語を保存するキー
const CATEGORY_OFFSET = { A: 0, B: 3, C: 6 }; // A: 1〜3, B: 4〜6, C: 7〜9
const NEXT_DELAY_CORRECT = 1000;   // 正解のとき次の問題までの待ち時間(ms)
const NEXT_DELAY_INCORRECT = 2500; // 不正解のとき次の問題までの待ち時間(ms)

// --- グローバル変数 ---
let allWords = [];            // CSVから読み込んだすべての単語
let currentLevelWords = [];   // 今回のクイズで出題する単語リスト
let remainingQuestions = [];  // まだ出題していない単語
let currentQuestion = {};     // 現在の問題
let questionNumber = 0;       // 現在何問目か
let correctCount = 0;         // 現在の正解数
let quizDirection = 'en_to_jp';
let masterWrongList = [];     // 間違えた単語を溜め込むリスト
let isReviewMode = false;     // 今、復習モード中か
let nextQuestionTimer = null; // 次の問題を表示するタイマー（中断時に止める）

// ======================================
// CSVの読み込み
// ======================================
async function loadWordsFromCSV() {
    try {
        const response = await fetch('words.csv');
        // 404 などの場合もエラーとして扱う
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const csvText = await response.text();
        allWords = parseCSV(csvText);
        console.log('CSVの読み込み完了:', allWords.length, '語');

        masterWrongList = loadWrongList();
        updateReviewButton();
        updateButtonAvailability();
        modeBtnEnJp.disabled = false;
        modeBtnJpEn.disabled = false;
    } catch (error) {
        console.error('CSVの読み込みに失敗しました:', error);
        categoryContainer.innerHTML = `
            <h1>エラー</h1>
            <p>words.csv の読み込みに失敗しました。ファイルを確認してください。</p>
            <p>※ index.html を直接ダブルクリックで開くと読み込めません。ローカルサーバー経由で開いてください。</p>`;
    }
}

// CSVテキストを解析して { word, meaning, level } の配列にする
function parseCSV(text) {
    const lines = text.split('\n').slice(1); // 1行目(ヘッダー)を飛ばす
    const result = [];

    for (const line of lines) {
        if (line.trim() === '') continue; // 空行は無視

        const parts = line.split(',').map(part => part.trim());
        if (parts.length < 3) continue; // 3列ないものは弾く

        const [word, meaning, level] = parts;
        if (!word || !meaning) continue;
        result.push({ word, meaning, level });
    }
    return result;
}

// ======================================
// 間違えた単語リストの保存・読み込み（ブラウザに保存）
// ======================================
function loadWrongList() {
    try {
        const savedWords = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        // 保存しているのは英単語だけなので、最新のCSVの内容と結び付ける
        return allWords.filter(w => savedWords.includes(w.word));
    } catch (error) {
        return [];
    }
}

function saveWrongList() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(masterWrongList.map(w => w.word)));
    } catch (error) {
        // 保存できない環境（プライベートモードなど）でもクイズは続けられるようにする
    }
}

function updateReviewButton() {
    const count = masterWrongList.length;
    reviewWeakButton.textContent = `間違えた単語を復習 (${count})`;
    reviewWeakButton.disabled = count === 0;
}

// ======================================
// ボタンの有効・無効
// ======================================
function hasWordsInLevel(level) {
    return allWords.some(w => w.level === String(level));
}

// ボタンの元の文字を覚えておき、単語が無ければ「（準備中）」を付けて無効にする
function setButtonAvailable(button, available) {
    if (!button.dataset.label) {
        button.dataset.label = button.textContent.trim();
    }
    button.disabled = !available;
    button.textContent = available ? button.dataset.label : `${button.dataset.label}（準備中）`;
}

function updateButtonAvailability() {
    categoryButtons.forEach(button => {
        const offset = CATEGORY_OFFSET[button.dataset.category];
        setButtonAvailable(button, [1, 2, 3].some(base => hasWordsInLevel(base + offset)));
    });
    idiomButtons.forEach(button => {
        setButtonAvailable(button, hasWordsInLevel(button.dataset.level));
    });
}

// ======================================
// 画面切り替え
// ======================================
function showScreen(screen) {
    [categoryContainer, levelContainer, quizContainer].forEach(container => {
        container.classList.toggle('hidden', container !== screen);
    });
}

// ======================================
// クイズ
// ======================================
function startQuiz(words, reviewMode) {
    isReviewMode = reviewMode;
    currentLevelWords = [...words];
    remainingQuestions = [...words];

    questionNumber = 0;
    correctCount = 0;
    questionNumberEl.textContent = '0';
    correctCountEl.textContent = '0';
    totalQuestionsEl.textContent = currentLevelWords.length;
    homeButton.textContent = '中断してホームに戻る';

    showScreen(quizContainer);
    displayQuiz();
}

// 配列をシャッフルする (Fisher–Yates)
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ダミーの選択肢を3つ選ぶ
// ・正解と同じ意味の単語は除く（正解が2つになるのを防ぐ）
// ・なるべく同じレベル（＝同じ品詞）から選び、消去法で当てにくくする
function pickDummies(answer) {
    const key = quizDirection === 'en_to_jp' ? 'meaning' : 'word';
    const isValid = w => w.word !== answer.word && w.meaning !== answer.meaning;
    const uniqueValues = words => [...new Set(words.map(w => w[key]))];

    let candidates = uniqueValues(allWords.filter(w => w.level === answer.level && isValid(w)));
    if (candidates.length < 3) {
        candidates = uniqueValues(allWords.filter(isValid));
    }
    return shuffle(candidates).slice(0, 3);
}

function displayQuiz() {
    nextQuestionTimer = null;
    resultElement.textContent = '';
    resultElement.className = '';

    // 全問終わったら結果を表示
    if (remainingQuestions.length === 0) {
        questionElement.textContent = 'クイズ終了！';
        questionElement.classList.remove('question-jp');
        choicesElement.innerHTML = '';
        resultElement.textContent = `全 ${currentLevelWords.length} 問中、${correctCount} 問正解！`;
        homeButton.textContent = 'ホームに戻る';
        return;
    }

    questionNumber++;
    questionNumberEl.textContent = questionNumber;

    // 残りの問題からランダムに1つ取り出す（同時にリストから削除）
    const index = Math.floor(Math.random() * remainingQuestions.length);
    currentQuestion = remainingQuestions.splice(index, 1)[0];

    // 出題方向に合わせて、問題文と正解を決める
    const isEnToJp = quizDirection === 'en_to_jp';
    questionElement.textContent = isEnToJp ? currentQuestion.word : currentQuestion.meaning;
    questionElement.classList.toggle('question-jp', !isEnToJp); // 日本語は長いので小さめに表示
    const correctChoice = isEnToJp ? currentQuestion.meaning : currentQuestion.word;

    // 正解 + ダミー3つをシャッフルしてボタンにする
    const choices = shuffle([correctChoice, ...pickDummies(currentQuestion)]);
    choicesElement.innerHTML = '';
    choices.forEach(choice => {
        const button = document.createElement('button');
        button.textContent = choice;
        button.onclick = () => checkAnswer(choice);
        choicesElement.appendChild(button);
    });
}

function checkAnswer(selectedChoice) {
    // 答え合わせ中はボタンを無効化する（連打防止）
    choicesElement.querySelectorAll('button').forEach(button => button.disabled = true);

    const correctChoice = quizDirection === 'en_to_jp' ? currentQuestion.meaning : currentQuestion.word;
    const isCorrect = selectedChoice === correctChoice;

    if (isCorrect) {
        resultElement.textContent = '正解！ ⭕️';
        resultElement.className = 'correct';
        correctCount++;
        correctCountEl.textContent = correctCount;

        // 復習モードで正解したら、間違えた単語リストから外す
        if (isReviewMode) {
            masterWrongList = masterWrongList.filter(w => w.word !== currentQuestion.word);
        }
    } else {
        resultElement.textContent = `不正解... ❌ 正解は「${correctChoice}」`;
        resultElement.className = 'incorrect';

        if (!masterWrongList.some(w => w.word === currentQuestion.word)) {
            masterWrongList.push(currentQuestion);
        }
    }
    saveWrongList();

    nextQuestionTimer = setTimeout(displayQuiz, isCorrect ? NEXT_DELAY_CORRECT : NEXT_DELAY_INCORRECT);
}

// ======================================
// ボタンのイベント
// ======================================

// カテゴリーボタン（A, B, C）
categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
        const category = button.dataset.category;
        const offset = CATEGORY_OFFSET[category];
        levelTitle.textContent = `出る順 ${category}`;

        // 動詞・名詞・形副ボタンに最終的なレベル (1〜9) を設定
        sublevelButtons.forEach(subBtn => {
            const level = parseInt(subBtn.dataset.levelBase, 10) + offset;
            subBtn.dataset.level = level;
            setButtonAvailable(subBtn, hasWordsInLevel(level));
        });

        showScreen(levelContainer);
    });
});

// レベルボタン（動詞・名詞・形副・熟語）
levelButtons.forEach(button => {
    button.addEventListener('click', () => {
        const selectedLevel = button.dataset.level;
        const words = allWords.filter(w => w.level === selectedLevel);

        if (words.length === 0) {
            alert(`レベル${selectedLevel} の単語がCSVに見つかりません。`);
            return;
        }
        startQuiz(words, false);
    });
});

// 間違えた単語の復習ボタン
reviewWeakButton.addEventListener('click', () => {
    if (masterWrongList.length === 0) return;
    startQuiz(masterWrongList, true);
});

// レベル選択に戻るボタン
backButton.addEventListener('click', () => {
    showScreen(categoryContainer);
});

// ホームに戻るボタン（途中で中断する場合も、終了後もこのボタン）
homeButton.addEventListener('click', () => {
    if (nextQuestionTimer !== null) {
        clearTimeout(nextQuestionTimer); // 次の問題の表示を止める
        nextQuestionTimer = null;
    }
    resultElement.textContent = '';
    choicesElement.innerHTML = '';
    updateReviewButton();
    showScreen(categoryContainer);
});

// 出題方向の切り替え
function setQuizDirection(direction) {
    quizDirection = direction;
    modeBtnEnJp.classList.toggle('active', direction === 'en_to_jp');
    modeBtnJpEn.classList.toggle('active', direction === 'jp_to_en');
}
modeBtnEnJp.addEventListener('click', () => setQuizDirection('en_to_jp'));
modeBtnJpEn.addEventListener('click', () => setQuizDirection('jp_to_en'));

// ======================================
// ページ読み込み時の処理
// ======================================
// CSVを読み込むまでボタンを押せないようにする
levelButtons.forEach(button => button.disabled = true);
categoryButtons.forEach(button => button.disabled = true);
modeBtnEnJp.disabled = true;
modeBtnJpEn.disabled = true;

loadWordsFromCSV();
