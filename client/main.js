const API_BASE_URL = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://qualify-ai-studying.onrender.com";

// サイドバーの表示/折りたたみ切り替え
function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;
  sidebar.classList.toggle("hidden");
}

// 初期表示時の制御（必要に応じて）
function closeSidebarIfMobile() {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;

  if (window.innerWidth < 768) {
    sidebar.classList.add("hidden");
  }
}

// APIキーを保存
function saveApiKey() {
  const key = document.getElementById("settingsApiKeyInput").value;
  if (!key) return alert("APIキーを入力してください");
  localStorage.setItem("gemini_api_key", key);
  alert("APIキーを保存しました");
  updateApiKeyStatus();
}

// APIキーを削除
function deleteApiKey() {
  localStorage.removeItem("gemini_api_key");
  updateApiKeyStatus();
}

// APIキーの登録状態を表示
function updateApiKeyStatus() {
  const saved = localStorage.getItem("gemini_api_key");
  document.getElementById("apiKeyStatus").textContent =
    saved ? "登録済み" : "未登録";
}

// APIキーを取得
function getApiKey() {
  return localStorage.getItem("gemini_api_key");
}

// モデルを保存
function saveModel() {
  const model = document.getElementById("modelSelect").value;
  localStorage.setItem("GEMINI_MODEL", model);
  updateModelStatus();
}

// モデルの状態を表示
function updateModelStatus() {
  const model = localStorage.getItem("GEMINI_MODEL") || "未設定";
  document.getElementById("modelStatus").textContent = `現在のモデル：${model}`;
}

// サーバーに語句を登録
function addWord() {
  const wordInput = document.getElementById('wordInput');
  const tagInput = document.getElementById('tagInput');
  const word = wordInput.value.trim();
  const tag = tagInput.value.trim() || '未分類';

  if (!word) return;

  fetch(`${API_BASE_URL}/terms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, tag })
  })
    .then(res => res.json()) // 成功時、フォームを空にしてリストを再取得
    .then(() => {
      wordInput.value = '';
      tagInput.value = '';
      updateTermList();
    });
}

// 登録済みの語句一覧を取得し、画面に表示
function updateTermList() {
  fetch(`${API_BASE_URL}/terms`)
    .then(res => res.json())
    .then(terms => {
      // チェックされているタグ一覧を取得し、配列に変換
      const selectedTags = Array.from(document.querySelectorAll('input[name="tagFilter"]:checked'))
        .map(cb => cb.value);

      // チェックされたタグがあれば、そのタグに一致する語句だけ残す
      if (selectedTags.length > 0) {
        terms = terms.filter(term => selectedTags.includes(term.tag));
      }

      // 並べ替え
      const sortValue = document.getElementById('sortSelect').value;
      terms.sort((a, b) => {
        switch (sortValue) {
          case 'id': // 新しい順
            return b.id - a.id;
          case 'tag': // タグ順
            return (a.tag || '').localeCompare(b.tag || '');
          case 'proficiency': // 習熟度昇順
            return (a.proficiency || 0) - (b.proficiency || 0);
          default:
            return 0;
        }
      });

      // 一度リストを初期化
      const list = document.getElementById('wordList');
      list.innerHTML = '';

      // 各語句の表示リストを作成
      terms.forEach(term => {
        // 語句1つ分のコンテナとしてdivを生成
        // CSSクラス(term-row)を付けて装飾に利用できるように
        const row = document.createElement('div');
        row.className = 'term-row';
        row.dataset.id = term.id;

        // 単語
        const wordElem = document.createElement('div');
        wordElem.className = 'term-word';
        wordElem.textContent = term.word;

        // タグ
        const tagElem = createEditableTagElement(term);

        // 習熟度（スリムなインライン表示）
        const proficiencyElem = document.createElement('div');
        proficiencyElem.className = 'term-proficiency';
        const percent = term.proficiency || 0;
        const barColor = percent >= 70 ? '#22c55e' : percent >= 40 ? '#f59e0b' : '#ef4444';
        proficiencyElem.innerHTML = `
          <div class="proficiency-bar-container">
            <div class="proficiency-bar-fill" style="width: ${percent}%; background-color: ${barColor};">
              <span class="proficiency-text">${percent}</span>
            </div>
          </div>
        `;

        // ボタンコンテナの定義（アイコンベース）
        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'term-action';

        // 削除ボタン（ゴミ箱アイコン）
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fa-regular fa-trash-can"></i>';
        deleteBtn.className = 'icon-btn delete-btn';
        deleteBtn.title = '削除';
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          deleteWord(term.id);
        };

        // 問題を作るボタン（紙飛行機アイコン）
        const generateBtn = document.createElement('button');
        generateBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
        generateBtn.className = 'icon-btn generate-btn';
        generateBtn.title = '問題を作る';
        generateBtn.onclick = (e) => {
          e.stopPropagation();
          generateQuestion(term.word, term.id);
        };

        buttonWrapper.appendChild(deleteBtn);
        buttonWrapper.appendChild(generateBtn);

        // 行コンテナに要素を追加
        row.appendChild(wordElem);
        row.appendChild(tagElem);
        row.appendChild(proficiencyElem);
        row.appendChild(buttonWrapper);

        list.appendChild(row);
      });
    })
    .catch(err => {
      console.error('語句リスト取得エラー：', err);
    });
}

// タグでのフィルター機能
function createTagCheckboxes() {
  // サーバーから登録済みのタグ一覧を取得
  fetch(`${API_BASE_URL}/terms/tags`)
    .then(res => res.json())
    .then(tags => {
      const container = document.getElementById('tagCheckboxes');
      container.innerHTML = ''; // 初期化

      // 1タグずつ、<label><input type="checkbox"> タグ名</label> を生成
      tags.forEach(tag => {
        const label = document.createElement('label');
        label.style.marginRight = '12px';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = tag;
        checkbox.name = 'tagFilter';
        checkbox.addEventListener('change', updateTermList); // チェック変更で再描画

        label.appendChild(checkbox);
        label.append(` ${tag}`);
        container.appendChild(label);
      });
    });
}


// 単語を削除する関数
function deleteWord(id) {
  // 選ばれた語句の id を使って、サーバーにDELETEリクエストを送信
  fetch(`${API_BASE_URL}/terms/${id}`, {
    method: 'DELETE'
  })
    .then(res => {
      if (!res.ok) throw new Error('削除に失敗しました');
      updateTermList(); // リストを再取得して更新
    })
    .catch(err => {
      console.error('削除エラー:', err);
    });
}

// タグをクリックで編集できるようにする関数
function createEditableTagElement(term) {
  // タグ表示用
  const tagElem = document.createElement('div');
  tagElem.className = 'term-tag';
  tagElem.textContent = term.tag || '未分類';

  // クリックされたらinputモードに切り替え
  // list="tagList" により、タグ候補が補完候補に出る
  tagElem.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = term.tag || '未分類';
    input.setAttribute('list', 'tagList');
    input.className = 'term-tag';

    tagElem.replaceWith(input);
    // クリック時すぐ編集可能にする
    input.focus();

    // Enterキー押したら確定
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        input.blur(); // blurで保存処理が走る
      }
    });

    // 新しいタグを入力すると、PATCHリクエストでサーバーに保存
    input.addEventListener('blur', () => {
      const newTag = input.value.trim() || '未分類';

      fetch(`${API_BASE_URL}/terms/${term.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: newTag })
      })
        .then(res => res.json())
        .then(() => {
          term.tag = newTag; // termの中身を更新
          const updatedTagElem = createEditableTagElement(term);
          input.replaceWith(updatedTagElem);
        })
        .catch(err => {
          console.error('タグ更新エラー:', err);
        });
    });
  });

  return tagElem;
}

// タグ候補を取得して表示
function updateTagCandidates() {
  fetch(`${API_BASE_URL}/terms/tags`)
    .then(res => res.json())
    .then(tags => {
      // サーバーにリクエストして、DISTINCT tag で取得したタグ一覧を受け取る
      const tagListElem = document.getElementById('tagList');
      tagListElem.innerHTML = '';

      //datalist にoption要素を動的に追加し、<input list="tagList">に候補を出す
      tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        tagListElem.appendChild(option);
      });
    })
    .catch(err => {
      console.error('タグ候補取得エラー：', err);
    });
}


// 選ばれた語句から問題を生成（API呼び出し）
function generateQuestion(word, id) {
  // 既存の機能：APIキーが未設定なら警告
  if (!getApiKey()) return alert("Gemini APIキーが設定されていません。各種設定より保存してください。");

  // fetchQuestionForWord を使ってデータを取得し、既存の表示関数に渡す
  fetchQuestionForWord(word)
    .then(data => {
      if (data?.question && data?.explanation) {
        displayGeneratedQuestion(data, id);
      } else {
        document.getElementById('questionText').textContent = '問題の生成に失敗しました。';
      }
    })
    .catch(err => {
      console.error(err);
      document.getElementById('questionText').textContent = 'エラーが発生しました。';
    });
}

// 単語に対して問題を取得するユーティリティ（Promiseを返す）
function fetchQuestionForWord(word) {
  if (!getApiKey()) return Promise.reject(new Error('APIキーが未設定'));
  const apiKey = getApiKey();
  const model = localStorage.getItem("gemini_model") || "gemini-2.5-flash-lite";

  return fetch(`${API_BASE_URL}/terms/generate-question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, apiKey, model })
  }).then(res => res.json().then(body => {
    if (!res.ok) {
      return Promise.reject(new Error(body.error || '問題の取得に失敗しました'));
    }
    return body;
  }));
}

// MarkdownをHTMLに変換する関数
function renderMarkdownToHTML(markdownText) {
  return marked.parse(markdownText);
}

// 生成された問題を表示する関数
function displayGeneratedQuestion(questionObject, id) {
  // 既存の吹き出しを全て削除
  document.querySelectorAll('.question-bubble').forEach(el => el.remove());

  // 問題と解説をパース
  const { question, options, explanation } = questionObject;

  if (!question || !explanation) {
    alert('問題の形式が正しくありません');
    return;
  }

  // 吹き出し本体
  const bubble = document.createElement('div');
  bubble.className = 'question-bubble';

  // Markdown → HTML
  let questionMarkdown = `**問題：**\n${question}`;

  // options がある場合は選択肢つける
  if (Array.isArray(options) && options.length > 0) {
    questionMarkdown += "\n\n**選択肢：**\n";
    questionMarkdown += options.map(opt => `- ${opt}`).join("\n");
  }

  // 問題部（MarkdownからHTMLへ変換）
  const questionHTML = renderMarkdownToHTML(questionMarkdown);
  const explanationHTML = renderMarkdownToHTML(`**解説：**\n${explanation}`);

  // 解説ボタンと解説領域
  const explanationDiv = document.createElement('div');
  explanationDiv.style.display = 'none';
  explanationDiv.innerHTML = explanationHTML;

  const explanationButton = document.createElement('button');
  explanationButton.textContent = '解説を見る';
  explanationButton.onclick = () => {
    explanationDiv.style.display = 'block';
    explanationButton.disabled = true;

    const feedbackArea = document.createElement('div');
    feedbackArea.style.marginTop = '10px';

    const levels = [
      { label: '〇', change: +20 },
      { label: '△', change: +10 },
      { label: '✕', change: -10 },
    ];

    levels.forEach(({ label, change }) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.marginRight = '5px';
      btn.onclick = () => updateProficiency(id, change);
      feedbackArea.appendChild(btn);
    });

    explanationDiv.appendChild(feedbackArea);
  };

  // 吹き出し内部構築
  bubble.innerHTML = questionHTML;
  bubble.appendChild(explanationButton);
  bubble.appendChild(explanationDiv);

  // id一致する .term-row を data-id で検索
  const targetRow = document.querySelector(`.term-row[data-id="${id}"]`);
  if (targetRow) {
    targetRow.insertAdjacentElement('afterend', bubble);
  } else {
    console.error('語句のDOM要素が見つかりませんでした。');
  }
}

// 習熟度を更新する関数
function updateProficiency(id, delta) {
  fetch(`${API_BASE_URL}/terms/${id}/proficiency`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta })
  })
    // 成功したら updateTermList() を呼んで画面を更新
    .then(res => res.json())
    .then(() => updateTermList())
    .catch(err => console.error('習熟度更新エラー:', err));
}

let selectedPromptId = null;

// プロンプトを作成
// 新しいプロンプトを作成する関数
function createPrompt() {
  // 入力欄からタイトルと内容を取得
  const title = document.getElementById('promptTitleInput').value.trim();
  const content = document.getElementById('promptContentInput').value.trim();

  // 入力が不足している場合は警告
  if (!title || !content) return alert('タイトルと内容を入力してください');

  // サーバーにPOSTリクエストを送信してプロンプトを作成
  fetch(`${API_BASE_URL}/prompts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content })
  })
    .then(res => res.json())
    .then(({ id }) => {
      // 作成成功時、入力欄をクリア
      document.getElementById('promptTitleInput').value = '';
      document.getElementById('promptContentInput').value = '';

      // 選択状態にするため、IDを保存
      selectedPromptId = id;

      // サーバーにも選択状態をPATCHで送信
      return fetch(`${API_BASE_URL}/prompts/select/${id}`, {
        method: 'PATCH'
      });
    })
    .then(() => {
      // プロンプト一覧を再取得してUI更新
      fetchPromptList();
    });
}

// プロンプトを更新
function updatePrompt(id, title, content) {
  return fetch(`${API_BASE_URL}/prompts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content })
  })
    .then(res => res.json())
    .then(() => fetchPromptList())
    .catch(err => console.error('プロンプト更新エラー:', err));
}

// プロンプト一覧を取得・表示
function fetchPromptList() {
  // サーバーから現在選択中のプロンプトIDを取得
  return fetch(`${API_BASE_URL}/prompts/selected`)
    .then(res => res.json())
    .then(({ selectedId }) => {
      selectedPromptId = selectedId; // フロント側でもIDを保持

      // 続けて、登録済みのプロンプト一覧を取得
      return fetch(`${API_BASE_URL}/prompts`);
    })
    .then(res => res.json())
    .then(prompts => {
      const list = document.getElementById('promptList');
      list.innerHTML = ''; // 既存のリストを初期化

      // プロンプト1件ごとに表示要素を構築
      prompts.forEach(prompt => {
        const box = document.createElement('div');
        box.className = 'prompt-box';
        box.dataset.id = prompt.id;

        // 選択中のプロンプトには強調表示
        if (prompt.id === selectedPromptId) {
          box.classList.add('selected');
        }

        // 表示モード用コンテナ
        const viewMode = document.createElement('div');
        viewMode.style.width = '100%';

        // タイトル要素の作成（太字）
        const titleElem = document.createElement('div');
        titleElem.style.fontWeight = 'bold';
        titleElem.style.fontSize = '18px';
        titleElem.style.marginBottom = '8px';
        titleElem.textContent = prompt.title;

        // 内容要素の作成（preで折り返し表示）
        const contentElem = document.createElement('pre');
        contentElem.style.whiteSpace = 'pre-wrap';
        contentElem.style.backgroundColor = '#f4f4f4';
        contentElem.style.padding = '10px';
        contentElem.style.borderRadius = '4px';
        contentElem.textContent = prompt.content;

        viewMode.appendChild(titleElem);
        viewMode.appendChild(contentElem);

        // ボタンエリア
        const actionArea = document.createElement('div');
        actionArea.style.display = 'flex';
        actionArea.style.gap = '10px';
        actionArea.style.marginTop = '10px';
        actionArea.style.justifyContent = 'flex-end';
        actionArea.style.width = '100%';

        // 編集ボタン
        const editBtn = document.createElement('button');
        editBtn.textContent = '編集';
        editBtn.onclick = (e) => {
          e.stopPropagation();
          enterEditMode();
        };

        // 削除ボタン
        if (prompt.id !== 1) {
          const deleteBtn = document.createElement('button');
          deleteBtn.textContent = '削除';
          deleteBtn.style.backgroundColor = '#e74c3c';
          deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm('このプロンプトを削除してもよいですか？')) {
              fetch(`${API_BASE_URL}/prompts/${prompt.id}`, {
                method: 'DELETE'
              })
                .then(() => fetchPromptList())
                .catch(err => console.error('プロンプト削除エラー:', err));
            }
          };
          actionArea.appendChild(deleteBtn);
        }
        actionArea.appendChild(editBtn);
        viewMode.appendChild(actionArea);

        // 編集モード用コンテナ
        const editMode = document.createElement('div');
        editMode.style.display = 'none';
        editMode.style.width = '100%';

        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.value = prompt.title;
        titleInput.style.width = '100%';
        titleInput.style.marginBottom = '8px';
        titleInput.className = 'prompt-input';

        const contentInput = document.createElement('textarea');
        contentInput.value = prompt.content;
        contentInput.style.width = '100%';
        contentInput.rows = 6;
        contentInput.className = 'prompt-input';

        const editActions = document.createElement('div');
        editActions.style.display = 'flex';
        editActions.style.gap = '10px';
        editActions.style.marginTop = '10px';
        editActions.style.justifyContent = 'flex-end';

        const saveBtn = document.createElement('button');
        saveBtn.textContent = '保存';
        saveBtn.onclick = (e) => {
          e.stopPropagation();
          updatePrompt(prompt.id, titleInput.value.trim(), contentInput.value.trim());
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'キャンセル';
        cancelBtn.style.backgroundColor = '#95a5a6';
        cancelBtn.onclick = (e) => {
          e.stopPropagation();
          exitEditMode();
        };

        editActions.appendChild(cancelBtn);
        editActions.appendChild(saveBtn);
        editMode.appendChild(titleInput);
        editMode.appendChild(contentInput);
        editMode.appendChild(editActions);

        function enterEditMode() {
          viewMode.style.display = 'none';
          editMode.style.display = 'block';
        }

        function exitEditMode() {
          viewMode.style.display = 'block';
          editMode.style.display = 'none';
        }

        box.appendChild(viewMode);
        box.appendChild(editMode);

        // カードクリックで選択
        box.onclick = () => {
          if (editMode.style.display === 'block') return; // 編集時は選択更新しない
          selectedPromptId = prompt.id;
          fetch(`${API_BASE_URL}/prompts/select/${prompt.id}`, {
            method: 'PATCH'
          })
            .then(() => fetchPromptList())
            .catch(err => console.error('プロンプト選択更新エラー:', err));
        };

        list.appendChild(box);
      });
    });
}

// 古いチャット関連関数は削除

// === 道場 (dojo) 機能 ===
// タブ切り替え時に「入場中なら確認」するため公開
window.isDojoActive = () => dojoState.active;
window.endDojoFromTab = () => endDojo();

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const dojoState = {
  active: false,
  candidates: [],
  remaining: [],      // 出題済みを除外したプール
  currentTerm: null,
  presented: 0,
  correct: 0
};

function populateDojoTagCheckboxes() {
  fetch(`${API_BASE_URL}/terms/tags`)
    .then(res => res.json())
    .then(tags => {
      const container = document.getElementById('dojoTagCheckboxes');
      if (!container) return;
      container.innerHTML = '';
      tags.forEach(tag => {
        const label = document.createElement('label');
        label.style.marginRight = '12px';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = tag;
        checkbox.name = 'dojoTagFilter';

        label.appendChild(checkbox);
        label.append(` ${tag}`);
        container.appendChild(label);
      });
    })
    .catch(err => console.error('dojoタグ取得エラー:', err));
}

function initDojoTab() {
  const startBtn = document.getElementById('dojoStartBtn');
  const exitBtn = document.getElementById('dojoExitBtn');
  const correctBtn = document.getElementById('dojoCorrectBtn');
  const wrongBtn = document.getElementById('dojoWrongBtn');
  const showExpBtn = document.getElementById('dojoShowExplanationBtn');

  if (startBtn) startBtn.addEventListener('click', startDojo);
  if (exitBtn) exitBtn.addEventListener('click', endDojo);
  if (correctBtn) correctBtn.addEventListener('click', () => markDojoAnswer(true));
  if (wrongBtn) wrongBtn.addEventListener('click', () => markDojoAnswer(false));
  if (showExpBtn) showExpBtn.addEventListener('click', showDojoExplanation);
}

function startDojo() {
  // 選択中のタグを取得
  const selectedTags = Array.from(document.querySelectorAll('input[name="dojoTagFilter"]:checked')).map(cb => cb.value);
  if (selectedTags.length === 0) return alert('少なくとも1つのタグを選択してください');

  // 対象語句を取得してプールを作成
  fetch(`${API_BASE_URL}/terms`)
    .then(res => res.json())
    .then(terms => {
      const pool = terms.filter(t => selectedTags.includes(t.tag));
      if (!pool || pool.length === 0) return alert('該当する単語が見つかりません');

      // 最大出題数（未入力・0なら全て）
      const maxInput = document.getElementById('dojoMaxQuestions');
      const maxNum = maxInput && maxInput.value.trim() !== '' ? parseInt(maxInput.value, 10) : 0;
      const limit = (maxNum > 0) ? Math.min(maxNum, pool.length) : pool.length;
      const shuffled = shuffleArray([...pool]);
      const remainingPool = shuffled.slice(0, limit);

      dojoState.active = true;
      dojoState.candidates = remainingPool;
      dojoState.remaining = [...remainingPool];
      dojoState.presented = 0;
      dojoState.correct = 0;

      document.getElementById('dojoExitBtn').style.display = 'inline-block';
      document.getElementById('dojoStartBtn').style.display = 'none'; // 入場中は出題開始を非表示
      document.getElementById('dojoShowExplanationBtn').style.display = 'none'; // 問題表示後に表示
      document.getElementById('dojoQuestionArea').innerHTML = '';
      document.getElementById('dojoExplanationArea').innerHTML = '';
      document.getElementById('dojoFeedbackButtons').style.display = 'none';
      document.getElementById('dojoSummary').style.display = 'none';

      presentDojoQuestion();
    })
    .catch(err => {
      console.error('startDojoエラー:', err);
      alert('問題を開始できませんでした');
    });
}

function presentDojoQuestion() {
  if (!dojoState.active) return;

  // 出題済みプールが空になったら終了
  if (!dojoState.remaining || dojoState.remaining.length === 0) {
    document.getElementById('dojoLoadingSpinner').style.display = 'none';
    document.getElementById('dojoQuestionArea').style.display = 'block';
    document.getElementById('dojoShowExplanationBtn').style.display = 'none';
    endDojo();
    return;
  }

  // 問題取得中は青枠内でローディング表示・問題文エリアは非表示
  document.getElementById('dojoLoadingSpinner').style.display = 'flex';
  document.getElementById('dojoQuestionArea').style.display = 'none';
  document.getElementById('dojoQuestionArea').innerHTML = '';
  document.getElementById('dojoShowExplanationBtn').style.display = 'none';

  // ランダムで1つ取り出す
  const idx = Math.floor(Math.random() * dojoState.remaining.length);
  const term = dojoState.remaining[idx];

  // プールから削除（次は出題しない）
  dojoState.remaining.splice(idx, 1);
  dojoState.currentTerm = term;

  // 問題を取得して表示
  fetchQuestionForWord(term.word)
    .then(data => {
      dojoState.presented += 1;

      // ローディング非表示・問題文を青枠内に表示
      document.getElementById('dojoLoadingSpinner').style.display = 'none';
      const qArea = document.getElementById('dojoQuestionArea');
      qArea.style.display = 'block';

      // 問題＋選択肢を単語管理タブと同じ形式で組み立て（択ごとに改行される）
      let questionMarkdown = `**問題：**\n${data.question || ''}`;
      if (Array.isArray(data.options) && data.options.length > 0) {
        questionMarkdown += "\n\n**選択肢：**\n";
        questionMarkdown += data.options.map(opt => `- ${opt}`).join("\n");
      }
      qArea.innerHTML = renderMarkdownToHTML(questionMarkdown);

      // 解説領域をリセット
      const expArea = document.getElementById('dojoExplanationArea');
      expArea.innerHTML = '';
      document.getElementById('dojoFeedbackButtons').style.display = 'none';

      // 解説データを保存（ボタン押時に使用）
      dojoState.currentExplanation = data.explanation;

      // 問題が表示されたタイミングで解説ボタンを表示
      document.getElementById('dojoShowExplanationBtn').style.display = 'inline-block';
    })
    .catch(err => {
      console.error('presentDojoQuestionエラー:', err);
      document.getElementById('dojoLoadingSpinner').style.display = 'none';
      const qArea = document.getElementById('dojoQuestionArea');
      qArea.style.display = 'block';
      const msg = err.message || '問題の取得に失敗しました';
      const safeMsg = ('' + msg).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      qArea.innerHTML = `<p class="dojo-error-message"><strong>エラー</strong><br>${safeMsg}</p><p class="dojo-error-hint">この語句は出題リストに戻しました。しばらく待ってから「次の問題へ」で再度お試しください。</p><button type="button" class="dojo-btn dojo-btn-primary" onclick="presentDojoQuestion()">次の問題へ</button>`;
      document.getElementById('dojoShowExplanationBtn').style.display = 'none';
      // 取得失敗した語句をプールに戻して再試行できるようにする
      if (term) dojoState.remaining.push(term);
      dojoState.presented = Math.max(0, dojoState.presented - 1);
      alert(msg);
    });
}

function showDojoExplanation() {
  if (!dojoState.currentExplanation) return;

  const expArea = document.getElementById('dojoExplanationArea');
  expArea.innerHTML = renderMarkdownToHTML(dojoState.currentExplanation);

  // ○×ボタン表示
  document.getElementById('dojoFeedbackButtons').style.display = 'block';
}

function markDojoAnswer(isCorrect) {
  if (!dojoState.currentTerm) return;

  if (isCorrect) {
    dojoState.correct += 1;
    // 習熟度を+10
    updateProficiency(dojoState.currentTerm.id, 10);
  } else {
    // 習熟度を-10
    updateProficiency(dojoState.currentTerm.id, -10);
  }

  // ローディング表示
  document.getElementById('dojoLoadingSpinner').style.display = 'block';
  document.getElementById('dojoQuestionArea').innerHTML = '';
  document.getElementById('dojoExplanationArea').innerHTML = '';
  document.getElementById('dojoFeedbackButtons').style.display = 'none';

  // 次の問題へ
  setTimeout(() => presentDojoQuestion(), 200);
}

function endDojo() {
  dojoState.active = false;

  // 画面要素のリセット（退場後は出題開始を再表示）
  document.getElementById('dojoLoadingSpinner').style.display = 'none';
  document.getElementById('dojoExitBtn').style.display = 'none';
  document.getElementById('dojoStartBtn').style.display = 'inline-block';
  document.getElementById('dojoShowExplanationBtn').style.display = 'none';
  document.getElementById('dojoFeedbackButtons').style.display = 'none';
  document.getElementById('dojoQuestionArea').innerHTML = '';
  document.getElementById('dojoExplanationArea').innerHTML = '';

  const stats = {
    presented: dojoState.presented,
    correct: dojoState.correct,
    wrong: dojoState.presented - dojoState.correct
  };
  const rate = stats.presented > 0 ? Math.round((stats.correct / stats.presented) * 100) : 0;

  // 統計カードと正解率リングを更新
  document.getElementById('dojoStatPresented').textContent = stats.presented;
  document.getElementById('dojoStatCorrect').textContent = stats.correct;
  document.getElementById('dojoStatWrong').textContent = stats.wrong;
  document.getElementById('dojoRateValue').textContent = rate + '%';
  const ring = document.getElementById('dojoRateRing');
  if (ring) ring.style.setProperty('--rate', rate);

  document.getElementById('dojoSummary').style.display = 'block';
}

window.onload = () => {
  updateApiKeyStatus(); // APIキーの登録状態を表示
  updateModelStatus(); // モデルの状態を表示
  updateTermList();    // 語句一覧を取得
  updateTagCandidates(); // タグ候補も取得
  createTagCheckboxes(); // フィルター用タグ候補
  populateDojoTagCheckboxes(); // 道場用タグチェックボックス
  initDojoTab();
  fetchPromptList(); // 起動時にプロンプト一覧を取得

  document.getElementById('sortSelect').addEventListener('change', updateTermList);

  // モバイル初期状態のチェック（リサイズリスナーは削除）
  closeSidebarIfMobile();

  // スマホ画面でサイドバーの外側をタップしたら閉じる
  document.addEventListener('click', (e) => {
    if (window.innerWidth < 768) {
      const sidebar = document.querySelector('.sidebar');
      const menuButton = document.getElementById('menuButton');

      if (sidebar && !sidebar.classList.contains('hidden')) {
        // クリックされたのがサイドバー内でもメニューボタンでもない場合
        if (!sidebar.contains(e.target) && !menuButton.contains(e.target)) {
          sidebar.classList.add('hidden');
        }
      }
    }
  });
};
