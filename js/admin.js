const STORAGE_KEY = 'flashcard-pro-data';

let allData = null;
let selectedCategoryId = null;
let editingCardId = null;

function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);
  return null;
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
}

async function initAdmin() {
  allData = loadData();
  if (!allData) {
    const resp = await fetch('data/flashcards.json');
    allData = await resp.json();
    saveData();
  }
  renderCategoryList();
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Category list
function renderCategoryList() {
  const list = document.getElementById('category-list');
  list.innerHTML = '';
  allData.categories.forEach(cat => {
    const div = document.createElement('div');
    div.className = 'sidebar-item' + (cat.id === selectedCategoryId ? ' active' : '');
    div.innerHTML = `
      <span>${escapeHtml(cat.name)}</span>
      <span class="card-count">${cat.cards.length}</span>
    `;
    div.addEventListener('click', () => selectCategory(cat.id));
    list.appendChild(div);
  });
}

function selectCategory(id) {
  selectedCategoryId = id;
  renderCategoryList();
  renderCards();
}

function renderCards() {
  const main = document.getElementById('admin-main');
  const category = allData.categories.find(c => c.id === selectedCategoryId);
  if (!category) {
    main.innerHTML = '<div class="empty-state"><h2>Select a category</h2></div>';
    return;
  }

  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
      <h2>${escapeHtml(category.name)} <span style="color:#888; font-weight:400; font-size:0.9rem;">(${category.cards.length} cards)</span></h2>
      <div style="display:flex; gap:0.5rem;">
        <button onclick="openAddCard()" style="padding:0.5rem 1rem; border-radius:6px; border:1px solid #7c3aed; background:#7c3aed20; color:#a78bfa; cursor:pointer;">+ Add Card</button>
        <button onclick="deleteCategory()" style="padding:0.5rem 1rem; border-radius:6px; border:1px solid #f87171; background:transparent; color:#f87171; cursor:pointer;">Delete Category</button>
      </div>
    </div>
  `;

  if (category.cards.length === 0) {
    html += '<div class="empty-state"><p>No cards yet. Add some cards or import a CSV.</p></div>';
  } else {
    html += `
      <table class="card-table">
        <thead>
          <tr><th>#</th><th>Question</th><th>Answer</th><th>Actions</th></tr>
        </thead>
        <tbody>
    `;
    category.cards.forEach((card, i) => {
      html += `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(card.question)}</td>
          <td>${escapeHtml(card.answer)}</td>
          <td class="actions">
            <button onclick="openEditCard('${card.id}')">Edit</button>
            <button class="delete-btn" onclick="deleteCard('${card.id}')">Delete</button>
          </td>
        </tr>
      `;
    });
    html += '</tbody></table>';
  }

  main.innerHTML = html;
}

// Card modal
function openAddCard() {
  editingCardId = null;
  document.getElementById('card-modal-title').textContent = 'Add Card';
  document.getElementById('card-question').value = '';
  document.getElementById('card-answer').value = '';
  document.getElementById('card-modal').style.display = 'flex';
}

function openEditCard(cardId) {
  const category = allData.categories.find(c => c.id === selectedCategoryId);
  const card = category.cards.find(c => c.id === cardId);
  if (!card) return;

  editingCardId = cardId;
  document.getElementById('card-modal-title').textContent = 'Edit Card';
  document.getElementById('card-question').value = card.question;
  document.getElementById('card-answer').value = card.answer;
  document.getElementById('card-modal').style.display = 'flex';
}

function closeCardModal() {
  document.getElementById('card-modal').style.display = 'none';
}

function saveCard() {
  const question = document.getElementById('card-question').value.trim();
  const answer = document.getElementById('card-answer').value.trim();

  if (!question || !answer) {
    alert('Both question and answer are required.');
    return;
  }

  const category = allData.categories.find(c => c.id === selectedCategoryId);

  if (editingCardId) {
    const card = category.cards.find(c => c.id === editingCardId);
    card.question = question;
    card.answer = answer;
  } else {
    category.cards.push({ id: generateId(), question, answer });
  }

  saveData();
  closeCardModal();
  renderCategoryList();
  renderCards();
}

function deleteCard(cardId) {
  if (!confirm('Delete this card?')) return;
  const category = allData.categories.find(c => c.id === selectedCategoryId);
  category.cards = category.cards.filter(c => c.id !== cardId);
  saveData();
  renderCategoryList();
  renderCards();
}

// Category modal
document.getElementById('add-category-btn').addEventListener('click', () => {
  document.getElementById('category-name').value = '';
  document.getElementById('category-modal').style.display = 'flex';
});

function closeCategoryModal() {
  document.getElementById('category-modal').style.display = 'none';
}

function saveCategory() {
  const name = document.getElementById('category-name').value.trim();
  if (!name) {
    alert('Category name is required.');
    return;
  }

  const id = generateId();
  allData.categories.push({ id, name, cards: [] });
  saveData();
  closeCategoryModal();
  renderCategoryList();
  selectCategory(id);
}

function deleteCategory() {
  if (!confirm('Delete this entire category and all its cards?')) return;
  allData.categories = allData.categories.filter(c => c.id !== selectedCategoryId);
  selectedCategoryId = null;
  saveData();
  renderCategoryList();
  document.getElementById('admin-main').innerHTML = '<div class="empty-state"><h2>Select a category</h2></div>';
}

// Import CSV
document.getElementById('import-csv-btn').addEventListener('click', () => {
  const select = document.getElementById('import-category');
  select.innerHTML = '';
  allData.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.name;
    select.appendChild(opt);
  });

  if (allData.categories.length === 0) {
    alert('Create a category first before importing.');
    return;
  }

  document.getElementById('csv-data').value = '';
  document.getElementById('import-modal').style.display = 'flex';
});

function closeImportModal() {
  document.getElementById('import-modal').style.display = 'none';
}

function importCSV() {
  const categoryId = document.getElementById('import-category').value;
  const csvText = document.getElementById('csv-data').value.trim();

  if (!csvText) {
    alert('Please paste some CSV data.');
    return;
  }

  const category = allData.categories.find(c => c.id === categoryId);
  if (!category) return;

  const lines = csvText.split('\n');
  let imported = 0;

  lines.forEach(line => {
    line = line.trim();
    if (!line) return;

    const commaIndex = line.indexOf(',');
    if (commaIndex === -1) return;

    const question = line.substring(0, commaIndex).trim();
    const answer = line.substring(commaIndex + 1).trim();

    if (question && answer) {
      category.cards.push({ id: generateId(), question, answer });
      imported++;
    }
  });

  saveData();
  closeImportModal();
  renderCategoryList();

  if (selectedCategoryId === categoryId) {
    renderCards();
  }

  alert(`Imported ${imported} cards successfully.`);
}

// Export
document.getElementById('export-btn').addEventListener('click', () => {
  const json = JSON.stringify(allData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flashcards-export.json';
  a.click();
  URL.revokeObjectURL(url);
});

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.style.display = 'none';
    }
  });
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

initAdmin();
