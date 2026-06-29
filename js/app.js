const STORAGE_KEY = 'flashcard-pro-data';

let allData = null;
let currentCards = [];
let currentIndex = 0;
let mode = 'practice';
let correct = 0;
let incorrect = 0;
let flipped = false;
let answered = false;
let quizSubmitted = false;

function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return null;
}

async function initData() {
  allData = loadData();
  if (!allData) {
    const resp = await fetch('data/flashcards.json');
    allData = await resp.json();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
  }
  populateCategories();
}

function populateCategories() {
  const select = document.getElementById('category-select');
  select.innerHTML = '<option value="">-- Select Category --</option>';
  allData.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = `${cat.name} (${cat.cards.length} cards)`;
    select.appendChild(opt);
  });
}

function startSession(categoryId) {
  const category = allData.categories.find(c => c.id === categoryId);
  if (!category || category.cards.length === 0) {
    showEmptyState();
    return;
  }
  currentCards = shuffle([...category.cards]);
  currentIndex = 0;
  correct = 0;
  incorrect = 0;
  flipped = false;
  answered = false;
  quizSubmitted = false;
  updateScores();
  showCard();
  document.getElementById('restart-btn').disabled = false;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function updateScores() {
  document.getElementById('correct-count').textContent = correct;
  document.getElementById('incorrect-count').textContent = incorrect;
  const remaining = currentCards.length - currentIndex;
  document.getElementById('remaining-count').textContent = remaining > 0 ? remaining : 0;
  document.getElementById('total-count').textContent = currentCards.length;
}

function showCard() {
  if (currentIndex >= currentCards.length) {
    showComplete();
    return;
  }

  const card = currentCards[currentIndex];
  const area = document.getElementById('card-area');
  flipped = false;
  answered = false;
  quizSubmitted = false;

  const progressPct = (currentIndex / currentCards.length) * 100;

  area.innerHTML = `
    <div class="progress-bar-container">
      <div class="progress-bar" style="width: ${progressPct}%"></div>
    </div>
    <div class="card-container" id="card-container">
      <div class="card" id="flashcard">
        <div class="card-face card-front">
          <div class="card-label">Question ${currentIndex + 1} of ${currentCards.length}</div>
          <div class="card-text">${escapeHtml(card.question)}</div>
          <div class="click-hint">Click to flip</div>
        </div>
        <div class="card-face card-back" id="card-back">
          ${renderBackFace(card)}
        </div>
      </div>
    </div>
    <div class="answer-buttons" id="answer-buttons">
      <button class="btn-yes" id="btn-yes" disabled onclick="handleAnswer(true)">Yes, I knew it</button>
      <button class="btn-no" id="btn-no" disabled onclick="handleAnswer(false)">No, repeat</button>
    </div>
  `;

  document.getElementById('card-container').addEventListener('click', flipCard);
  updateScores();
}

function renderBackFace(card) {
  if (mode === 'practice') {
    return `
      <div class="card-label">Answer</div>
      <div class="card-text">${escapeHtml(card.answer)}</div>
    `;
  }
  return `
    <div class="card-label">Your Answer</div>
    <div class="quiz-input-area">
      <input type="text" id="quiz-input" placeholder="Type your answer..." autocomplete="off">
      <button class="quiz-submit-btn" id="quiz-submit" onclick="checkQuizAnswer(event)">Check</button>
      <div id="quiz-result"></div>
    </div>
  `;
}

function flipCard() {
  if (flipped) return;
  flipped = true;

  const flashcard = document.getElementById('flashcard');
  flashcard.classList.add('flipped');

  if (mode === 'practice') {
    enableAnswerButtons();
  } else {
    setTimeout(() => {
      const input = document.getElementById('quiz-input');
      if (input) input.focus();
    }, 650);
  }
}

function checkQuizAnswer(e) {
  e.stopPropagation();
  if (quizSubmitted) return;
  quizSubmitted = true;

  const input = document.getElementById('quiz-input');
  const resultDiv = document.getElementById('quiz-result');
  const card = currentCards[currentIndex];
  const userAnswer = input.value.trim();
  const correctAnswer = card.answer.trim();

  const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();

  if (isCorrect) {
    resultDiv.innerHTML = `<span class="quiz-result correct">Correct!</span>`;
  } else {
    resultDiv.innerHTML = `
      <span class="quiz-result incorrect">Incorrect</span>
      <div class="answer-reveal">Correct answer: ${escapeHtml(correctAnswer)}</div>
    `;
  }

  input.disabled = true;
  document.getElementById('quiz-submit').disabled = true;
  enableAnswerButtons();
}

function enableAnswerButtons() {
  document.getElementById('btn-yes').disabled = false;
  document.getElementById('btn-no').disabled = false;
}

function handleAnswer(knewIt) {
  if (answered) return;
  answered = true;

  if (knewIt) {
    correct++;
  } else {
    incorrect++;
    currentCards.push(currentCards[currentIndex]);
  }

  currentIndex++;
  setTimeout(showCard, 300);
}

function showComplete() {
  const area = document.getElementById('card-area');
  const total = correct + incorrect;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  area.innerHTML = `
    <div class="complete-state">
      <h2>Session Complete!</h2>
      <div class="final-score">${pct}%</div>
      <p>You got <strong style="color:#4ade80">${correct}</strong> correct and <strong style="color:#f87171">${incorrect}</strong> incorrect out of ${total} attempts.</p>
      <button onclick="restartSession()">Study Again</button>
    </div>
  `;

  updateScores();
}

function showEmptyState() {
  const area = document.getElementById('card-area');
  area.innerHTML = `
    <div class="empty-state">
      <h2>No cards in this category</h2>
      <p>Go to the <a href="admin.html" style="color:#a78bfa">Admin panel</a> to add cards.</p>
    </div>
  `;
}

function restartSession() {
  const select = document.getElementById('category-select');
  if (select.value) {
    startSession(select.value);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Event listeners
document.getElementById('category-select').addEventListener('change', function () {
  if (this.value) {
    startSession(this.value);
  } else {
    document.getElementById('card-area').innerHTML = `
      <div class="empty-state">
        <h2>Select a category to start studying</h2>
        <p>Choose a category from the dropdown above, then pick your mode.</p>
      </div>
    `;
    document.getElementById('restart-btn').disabled = true;
  }
});

document.getElementById('mode-practice').addEventListener('click', function () {
  mode = 'practice';
  this.classList.add('active');
  document.getElementById('mode-quiz').classList.remove('active');
  const select = document.getElementById('category-select');
  if (select.value) startSession(select.value);
});

document.getElementById('mode-quiz').addEventListener('click', function () {
  mode = 'quiz';
  this.classList.add('active');
  document.getElementById('mode-practice').classList.remove('active');
  const select = document.getElementById('category-select');
  if (select.value) startSession(select.value);
});

document.getElementById('restart-btn').addEventListener('click', restartSession);

document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && mode === 'quiz' && flipped && !quizSubmitted) {
    const submitBtn = document.getElementById('quiz-submit');
    if (submitBtn) checkQuizAnswer(e);
  }
});

initData();
