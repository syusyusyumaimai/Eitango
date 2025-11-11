// HTMLの要素を取得
const questionElement = document.getElementById('question');
const choicesElement = document.getElementById('choices'); // 選択肢を入れる場所
const resultElement = document.getElementById('result');

// ★ スタート画面用の要素を追加
const quizContainer = document.getElementById('quiz-container');
const homeButton = document.getElementById('home-btn');
const categoryContainer = document.getElementById('category-selection-container');
const levelContainer = document.getElementById('level-selection-container');
const levelTitle = document.getElementById('level-title');
const categoryButtons = document.querySelectorAll('.category-btn');
const levelButtons = document.querySelectorAll('.level-btn'); // 「熟語」も含む
const sublevelButtons = levelContainer.querySelectorAll('.level-btn'); // 動詞・名詞・形副ボタン
const backButton = document.getElementById('back-btn');
const modeBtnEnJp = document.getElementById('mode-en-jp');//英語日本語変換
const modeBtnJpEn = document.getElementById('mode-jp-en');//上記同様

// ★ カウンター用のHTML要素を取得
const questionNumberEl = document.getElementById('question-number');
const totalQuestionsEl = document.getElementById('total-questions');
const correctCountEl = document.getElementById('correct-count');

// --- グローバル変数 ---
let currentQuestion = {}; // 現在の問題
let remainingQuestions = []; 
let allWords = []; // CSVから読み込んだすべての単語
let questionNumber = 0; // 現在何問目か
let correctCount = 0;  // 現在の正解数
let currentLevelWords = []; // ★ 選択したレベルの単語リスト
let quizDirection = 'en_to_jp';

// ======================================
// ★ ステップ1：CSVを読み込む非同期関数
// ======================================
async function loadWordsFromCSV() {
  try {
     // 'words.csv' ファイルを取りに行く
     const response = await fetch('words.csv');
     // レスポンスからテキストデータを取得
     const csvText = await response.text();

     // CSVテキストを解析して 'allWords' 配列を生成
     allWords = parseCSV(csvText);
    
     // 読み込み完了
     console.log('CSVの読み込み完了:', allWords);
    
     // ★ レベルボタンを有効化
     levelButtons.forEach(button => {
         button.disabled = false;
         // (ローディング表示はお好みで)
     });
        categoryButtons.forEach(button => { // ★ この3行を追加
    button.disabled = false;
});
        modeBtnEnJp.disabled = false; // 
        modeBtnJpEn.disabled = false; // ★ 追加

     } catch (error) {
     console.error('CSVの読み込みに失敗しました:', error);
     // エラーメッセージをスタート画面に表示
     categoryContainer.innerHTML = `<h1>エラー</h1><p>words.csv の読み込みに失敗しました。ファイルを確認してください。</p>`;
     }
}

// ======================================
// ★ ステップ2：CSVテキストを解析する関数 (★ 修正)
// ======================================
function parseCSV(text) {
    // 1行目(ヘッダー)を飛ばす
     const lines = text.split('\n').slice(1); 
     const result = [];

    // 'for...of' ループで全行を処理
     for (const line of lines) {
     const trimmedLine = line.trim(); // 前後の空白を削除
     if (trimmedLine === "") continue; // 空行は無視

     const parts = trimmedLine.split(','); // カンマで分割
        
        // 3列ないとデータとして不完全なので、弾く
        if (parts.length < 3) continue;

     // CSVの "word" と "meaning" と "level" をオブジェクトに
     const obj = {
         word: parts[0],
         meaning: parts[1],
         level: parts[2]
     };
     result.push(obj);
     }
     return result;
}

// ======================================
// ★ メインのクイズ作成・表示関数 
// ======================================
function displayQuiz() {
     resultElement.textContent = ""; // 結果をリセット

     // ★ 2. 残りの問題があるかチェック
     if (remainingQuestions.length === 0) {
         questionElement.textContent = "クイズ終了！";
         choicesElement.innerHTML = ""; // 選択肢を空にする
        
        // ★ 修正： 'words.length' ではなく 'currentLevelWords.length' を使う
         resultElement.textContent = `全 ${currentLevelWords.length} 問中、${correctCount} 問正解！`;
    
         homeButton.classList.remove('hidden'); // ホームボタンを表示
         return; // 関数を終了
     }

    // ★ 3. 問題番号を更新
     questionNumber++;
     questionNumberEl.textContent = questionNumber;

     // ★ 4. "残りの問題" リストからランダムにインデックスを選ぶ
     const remainingIndex = Math.floor(Math.random() * remainingQuestions.length);

     // ★ 5. 選んだ問題を "残りの問題" リストから取り出し（同時に削除する）
     const correctAnswer = remainingQuestions.splice(remainingIndex, 1)[0]; 

     currentQuestion = correctAnswer; // 正解を保持
     questionElement.textContent = correctAnswer.word; // 問題（英単語）を表示

     // ★ 6. ダミーの選択肢を3つ作る (★ 修正)
     const dummies = [];
     let correctChoice = "";

     if (quizDirection === 'en_to_jp') {
        // 【英→日】モード（従来）
        questionElement.textContent = correctAnswer.word; // 問題は「英単語」
        correctChoice = correctAnswer.meaning; // 正解は「日本語」
        while (dummies.length < 3) {
            // ★ 修正： 'words' ではなく 'allWords' (全単語) から選ぶ
            const dummy = allWords[Math.floor(Math.random() * allWords.length)];
        
            // 正解と被らず、ダミーリストにもまだ無ければ追加
            // ★ 修正：ダミーの比較対象は 'dummy.meaning'
            if (dummy.word !== correctAnswer.word && !dummies.includes(dummy.meaning)) {
                dummies.push(dummy.meaning);
            }
        }
    } else {// 【日→英】モード（新規）
        questionElement.textContent = correctAnswer.meaning; // 問題は「日本語」
        correctChoice = correctAnswer.word; // 正解は「英単語」

        while (dummies.length < 3) {
            const dummy = allWords[Math.floor(Math.random() * allWords.length)];
            // ダミーの「英単語」を追加
            if (dummy.word !== correctAnswer.word && !dummies.includes(dummy.word)) {
                dummies.push(dummy.word);
            }
        }
    }

     // ★ 7. 選択肢をシャッフルする (正解 + ダミー3つ)
     const choices = [correctChoice, ...dummies];
     for (let i = choices.length - 1; i > 0; i--) {
         const j = Math.floor(Math.random() * (i + 1));
         [choices[i], choices[j]] = [choices[j], choices[i]];
     }

 // ★ 8. 画面にボタンとして表示する
     choicesElement.innerHTML = ""; // 前回の選択肢をクリア
     choices.forEach(choice => {
         const button = document.createElement('button');
         button.textContent = choice;
         button.onclick = () => checkAnswer(choice); // クリックされたら答え合わせ
         choicesElement.appendChild(button);
     });
}

// ======================================
// ★ 答え合わせの関数 (変更なし)
// ======================================
function checkAnswer(selectedChoice) {
    // 答え合わせ中はボタンを無効化する（連打防止）
    const buttons = choicesElement.querySelectorAll('button');
    buttons.forEach(button => button.disabled = true);

    let correctAnswerText = "";
    if (quizDirection === 'en_to_jp') {
        correctAnswerText = currentQuestion.word; // 正解は「日本語」
    } else {
        correctAnswerText = currentQuestion.meaning; // 正解は「英単語」
    }


     if (quizDirection === 'en_to_jp' && selectedChoice === currentQuestion.meaning) {
         resultElement.textContent = "正解！ ⭕️";
         resultElement.className = "correct";
         correctCount++;
         correctCountEl.textContent = correctCount;
         setTimeout(displayQuiz, 1000)
     }
     else if (quizDirection === 'jp_to_en' && selectedChoice === currentQuestion.word) {
         resultElement.textContent = "正解！ ⭕️";
         resultElement.className = "correct";
         correctCount++;
         correctCountEl.textContent = correctCount;
         setTimeout(displayQuiz, 1000)
     }
     else if (quizDirection === 'en_to_jp') {
         resultElement.textContent = `不正解... ❌ 正解は「${currentQuestion.meaning}」`;
         resultElement.className = "incorrect";
         setTimeout(displayQuiz, 2500)
     }
     else {
        resultElement.textContent = `不正解... ❌ 正解は「${currentQuestion.word}」`;
         resultElement.className = "incorrect";
         setTimeout(displayQuiz, 2500)
     }
}

// ======================================
// ★ 実行開始処理 (大幅変更)
// ======================================
// --- 1. カテゴリーボタン（A, B, C）が押された時の処理 ---
categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
        const category = button.dataset.category; // "A", "B", "C"
        
        // レベル選択画面のタイトルを設定
        levelTitle.textContent = `出る順 ${category}`;

        // レベル選択ボタンの 'data-level' 属性を動的に設定
        let levelOffset = 0;
        if (category === 'B') { levelOffset = 3; } // Bなら (3+1=4, 3+2=5, ...)
        if (category === 'C') { levelOffset = 6; } // Cなら (6+1=7, 6+2=8, ...)

        sublevelButtons.forEach(subBtn => {
            const baseLevel = parseInt(subBtn.dataset.levelBase); // 1, 2, 3
            // 最終的なレベル (1~9) をボタンに設定
            subBtn.dataset.level = baseLevel + levelOffset; 
        });

        // 画面切り替え
        categoryContainer.classList.add('hidden');
        levelContainer.classList.remove('hidden');
    });
});

// --- 2. レベルボタン（動詞・名詞・形副・熟語）が押された時の処理 ---
levelButtons.forEach(button => {
    button.addEventListener('click', () => {
        // 'data-level' 属性からレベル番号 (1~10) を取得
        const selectedLevel = button.dataset.level;
        
        // 1. 選択したレベルの単語だけを絞り込む
        currentLevelWords = allWords.filter(word => word.level === selectedLevel);
        
        if (currentLevelWords.length === 0) {
            alert(`レベル${selectedLevel} の単語がCSVに見つかりません。`);
            return;
        }

        // 2. 画面切り替え
        // (もしレベル選択画面が表示されていれば、隠す)
        if (!levelContainer.classList.contains('hidden')) {
            levelContainer.classList.add('hidden');
        }
        // (もしカテゴリー画面が表示されていれば、隠す)
        if (!categoryContainer.classList.contains('hidden')) {
            categoryContainer.classList.add('hidden');
        }
        quizContainer.classList.remove('hidden');
        
        // 3. カウンターをリセット
        questionNumber = 0;
        correctCount = 0;
        questionNumberEl.textContent = "0";
        correctCountEl.textContent = "0";
        totalQuestionsEl.textContent = currentLevelWords.length;

        // 4. クイズ開始
        remainingQuestions = [...currentLevelWords]; 
        displayQuiz();
    });
});

// --- 3. 戻るボタンが押された時の処理 ---
backButton.addEventListener('click', () => {
    levelContainer.classList.add('hidden');
    categoryContainer.classList.remove('hidden');
});

// --- 4. ホームに戻るボタン（クイズ終了時）の処理 ---
homeButton.addEventListener('click', () => {
    quizContainer.classList.add('hidden');
    homeButton.classList.add('hidden');
    resultElement.textContent = "";
    
    // ★ 戻る先を「カテゴリー選択」画面にする
    categoryContainer.classList.remove('hidden'); 
});

modeBtnEnJp.addEventListener('click', () => {
    quizDirection = 'en_to_jp';
    modeBtnEnJp.classList.add('active'); // 自分をアクティブに
    modeBtnJpEn.classList.remove('active'); // 反対側を非アクティブに
});

modeBtnJpEn.addEventListener('click', () => {
    quizDirection = 'jp_to_en';
    modeBtnJpEn.classList.add('active'); // 自分をアクティブに
    modeBtnEnJp.classList.remove('active'); // 反対側を非アクティブに
});

// --- ページ読み込み時の最初の処理 ---

// ★ レベルボタンを一旦無効化
levelButtons.forEach(button => button.disabled = true);
categoryButtons.forEach(button => button.disabled = true);
modeBtnEnJp.disabled = true; // ★ 追加
modeBtnJpEn.disabled = true; // ★ 追加
// CSVの読み込みを自動で開始
loadWordsFromCSV();