const API_BASE_URL = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://qualify-ai-studying.onrender.com";

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

        // 習熟度
        const proficiencyElem = document.createElement('div');
        proficiencyElem.className = 'term-proficiency';
        const percent = term.proficiency || 0;
        proficiencyElem.innerHTML = `
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="
              width: 80px;
              background-color: #eee;
              height: 16px;
              border-radius: 4px;
              overflow: hidden;
            ">
              <div style="
                width: ${percent}%;
                background-color: ${percent >= 70 ? 'green' : percent >= 40 ? 'orange' : 'red'};
                height: 100%;
                transition: width 0.3s;
              "></div>
            </div>
            <div style="font-size: 14px;">${percent}%</div>
          </div>
        `;

        // ボタンコンテナの定義
        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'term-action';

        // 問題を作るボタン
        const generateBtn = document.createElement('button');
        generateBtn.textContent = '問題を作る';
        generateBtn.onclick = () => generateQuestion(term.word, term.id);
        buttonWrapper.appendChild(generateBtn);

        // 削除ボタン
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '削除';
        deleteBtn.style.marginLeft = '10px';
        deleteBtn.onclick = () => deleteWord(term.id);
        buttonWrapper.appendChild(deleteBtn);

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
        label.style.marginRight = '10px';

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
  // generate-questionにwordを送信し、wordを元にAIが問題を生成
  fetch(`${API_BASE_URL}/terms/generate-question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word })
  })
    .then(res => res.json())
    .then(data => {
      // 問題が生成されれば画面表示（習熟度更新のためIDも渡す）
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

// MarkdownをHTMLに変換する関数
function renderMarkdownToHTML(markdownText) {
  return marked.parse(markdownText);
}

// 生成された問題を表示する関数
function displayGeneratedQuestion(questionObject, id) {
  // 既存の吹き出しを全て削除
  document.querySelectorAll('.question-bubble').forEach(el => el.remove());

  // 問題と解説をパース
  const { question, explanation } = questionObject;

  if (!question || !explanation) {
    alert('問題の形式が正しくありません');
    return;
  }

  // 吹き出し本体
  const bubble = document.createElement('div');
  bubble.className = 'question-bubble';

  // 問題部（MarkdownからHTMLへ変換）
  const questionHTML = renderMarkdownToHTML(`**問題：**\n${question}`);
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

        // 選択中のプロンプトには太線をつける
        if (prompt.id === selectedPromptId) {
          box.classList.add('selected');
        }

        // タイトル要素の作成（太字）
        const titleElem = document.createElement('div');
        titleElem.style.fontWeight = 'bold';
        titleElem.textContent = prompt.title;

        // 内容要素の作成（preで折り返し表示）
        const contentElem = document.createElement('pre');
        contentElem.style.whiteSpace = 'pre-wrap';
        contentElem.textContent = prompt.content;

        // 要素をコンテナに追加
        box.appendChild(titleElem);
        box.appendChild(contentElem);

        // クリックされたとき、選択状態を更新する
        box.onclick = () => {
          selectedPromptId = prompt.id;

          // 選択状態をサーバー側にも保存
          fetch(`${API_BASE_URL}/prompts/select/${prompt.id}`, {
            method: 'PATCH'
          })
            .then(() => fetchPromptList()) // UIを再描画
            .catch(err => console.error('プロンプト選択更新エラー:', err));
        };

        if (prompt.id !== 1) {  // ID=1（デフォルト）以外のみ削除可能
          const deleteBtn = document.createElement('button');
          deleteBtn.textContent = '削除';
          deleteBtn.style.marginTop = '10px';
          deleteBtn.style.alignSelf = 'flex-end';
          deleteBtn.onclick = () => {
            if (confirm('このプロンプトを削除してもよいですか？')) {
              fetch(`${API_BASE_URL}/prompts/${prompt.id}`, {
                method: 'DELETE'
              })
                .then(() => fetchPromptList())
                .catch(err => console.error('プロンプト削除エラー:', err));
            }
          };
          box.appendChild(deleteBtn);
        }

        // 表示エリアに追加
        list.appendChild(box);
      });
    });
}

// Chatのメッセージを保存する関数
function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message || !selectedPromptId) {
    console.warn('送信中止：messageまたはselectedPromptIdが無効');
    return;
  }

  fetch(`${API_BASE_URL}/prompts/${selectedPromptId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  })
    .then(() => {
      input.value = '';
      return fetchPromptList();
    })
    .then(() => {
      if (selectedPromptId) {
        fetchChatHistory(selectedPromptId);
      } else {
        console.warn('再取得後の selectedPromptId が null のままです');
      }
    });
}

// Chat履歴を呼び出す関数
function fetchChatHistory(promptId) {
  console.log('Chat履歴取得：promptId =', promptId);

  // タイトルを取得するんご
  fetch(`${API_BASE_URL}/prompts/${promptId}/title`)
    .then(res => res.json())
    .then(title => {
      const chatPrompt = document.getElementById('chatPrompt')
      chatPrompt.innerHTML = '';
      const selectedPrompt = document.createElement('div');
      selectedPrompt.style.fontWeight = 'bold';
      selectedPrompt.textContent = title.title;
      chatPrompt.appendChild(selectedPrompt);
    })
  
  // 修正履歴を取得するんご！
  fetch(`${API_BASE_URL}/prompts/${promptId}/chat`)
    .then(res => {
      return res.json();
    })
    .then(messages => {
      console.log('受信メッセージ数:', messages.length);
      const chatLog = document.getElementById('chatLog');
      chatLog.innerHTML = '';
      messages.forEach(({ id: chatId, message }, i) => {
        // チャットと削除ボタンのコンテナ
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '8px';
        // チャット
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.textContent = message;
        // 削除ボタン
        const icon = document.createElement('i');
        icon.className = 'fas fa-trash'; // FontAwesome用クラス
        icon.onclick = () => deleteChatMessage(promptId, chatId);

        wrapper.appendChild(bubble);
        wrapper.appendChild(icon);
        chatLog.appendChild(wrapper);
        console.log(`表示メッセージ[${i}]:`, message);
      });
    })
    .catch(err => {
      console.error('fetchChatHistoryエラー:', err);
    });
}

// チャットを削除する関数
function deleteChatMessage(promptId, chatId) {
  if (!confirm('このチャットを削除しますか？')) return;

  fetch(`${API_BASE_URL}/prompts/${promptId}/chat/${chatId}`, {
    method: 'DELETE'
  })
    .then(res => {
      if (!res.ok) throw new Error('削除に失敗しました');
      return res.json();
    })
    .then(() => {
      fetchChatHistory(promptId); // チャット再取得
    })
    .catch(err => {
      alert('削除に失敗しました');
      console.error('削除エラー:', err);
    });
}

// ページ読み込み時の更新内容
window.onload = () => {
  updateTermList();    // 語句一覧を取得
  updateTagCandidates(); // タグ候補も取得
  createTagCheckboxes(); // フィルター用タグ候補
  fetchPromptList().then(() => {  // 起動時にプロンプト一覧を取得
    if (selectedPromptId) {
      fetchChatHistory(selectedPromptId); // チャット記録を画面に表示
      console.warn('初期化時の selectedPromptId が null のままです');
    }
  });

  document.getElementById('sortSelect').addEventListener('change', updateTermList);
};

