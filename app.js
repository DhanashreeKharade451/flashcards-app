/**
 * Flashcards App - Complete Implementation
 * Features: CRUD, Study Mode, Search, Persistence, Import/Export
 */

(() => {
  /* ========================================================================
     Configuration & Constants
     ======================================================================== */

  const CONFIG = {
    AUTO_SAVE_DELAY: 1000,
    SEARCH_DEBOUNCE: 300,
    MESSAGE_TIMEOUT: 3000,
    VERSION: '1.0.0'
  };

  /* ========================================================================
     Default State & Data Model
     ======================================================================== */

  const DEFAULT_STATE = {
    decks: [
      {
        id: 'deck-sample-1',
        name: 'Spanish Basics',
        createdAt: Date.now(),
        color: 'primary'
      }
    ],
    cardsByDeckId: {
      'deck-sample-1': [
        { id: 'card-1', front: 'Hola', back: 'Hello', createdAt: Date.now() },
        { id: 'card-2', front: 'Adiós', back: 'Goodbye', createdAt: Date.now() },
        { id: 'card-3', front: 'Sí', back: 'Yes', createdAt: Date.now() },
        { id: 'card-4', front: 'No', back: 'No', createdAt: Date.now() },
        { id: 'card-5', front: 'Gracias', back: 'Thank you', createdAt: Date.now() },
        { id: 'card-6', front: 'Por favor', back: 'Please', createdAt: Date.now() }
      ]
    },
    activeDeckId: 'deck-sample-1',
    nextDeckId: 2,
    nextCardId: 7,
    lastSaved: Date.now()
  };

  // Global app state
  const state = { ...DEFAULT_STATE };

  /* ========================================================================
     DOM Elements Cache
     ======================================================================== */

  const DOM = {
    // Header
    newDeckBtn: document.querySelector('.new-deck'),
    themeToggle: document.querySelector('.theme-toggle'),

    // Sidebar
    decksList: document.querySelector('.decks-list'),
    deckCount: document.querySelector('.deck-count'),
    sidebarEmpty: document.querySelector('.sidebar-empty'),
    importBtn: document.querySelector('.import-btn'),
    exportBtn: document.querySelector('.export-btn'),
    importFile: document.querySelector('#import-file'),
    totalCardsCount: document.querySelector('.total-cards-count'),
    lastSavedTime: document.querySelector('.last-saved-time'),

    // Main
    main: document.querySelector('.main'),
    deckTitle: document.querySelector('.deck-title'),
    deckCardCount: document.querySelector('.deck-card-count'),
    mainEmpty: document.querySelector('.main-empty'),
    statusMessage: document.querySelector('.status-message'),

    // Toolbar
    searchInput: document.querySelector('#search-input'),
    searchResults: document.querySelector('.search-results'),
    clearSearchBtn: document.querySelector('.clear-search'),
    shuffleBtn: document.querySelector('.shuffle-btn'),
    newCardBtn: document.querySelector('.new-card'),

    // Card
    cardView: document.querySelector('.card-view'),
    card: document.querySelector('.card'),
    cardInner: document.querySelector('.card-inner'),
    cardFront: document.querySelector('.card-front'),
    cardBack: document.querySelector('.card-back'),
    cardHint: document.querySelector('.card-hint'),

    // Controls
    prevBtn: document.querySelector('.prev-btn'),
    flipBtn: document.querySelector('.flip-btn'),
    nextBtn: document.querySelector('.next-btn'),

    // Progress
    currentCardSpan: document.querySelector('.current-card'),
    totalCardsSpan: document.querySelector('.total-cards'),
    currentPercentage: document.querySelector('.current-percentage'),
    progressFill: document.querySelector('.progress-fill'),
    progressBar: document.querySelector('[role="progressbar"]')
  };

  /* ========================================================================
     State Variables
     ======================================================================== */

  let currentMode = 'browse'; // 'browse' | 'study'
  let currentCardIndex = 0;
  let cardOrder = [];
  let filteredCards = [];
  let searchQuery = '';
  let autoSaveTimer = null;
  let studyKeyboardHandler = null;
  let lastSavedTime = Date.now();

  /* ========================================================================
     Initialization
     ======================================================================== */

  function init() {
    console.log(`🚀 Initializing Flashcards App v${CONFIG.VERSION}`);

    // Load persisted state
    const loadedState = Storage.loadState(DEFAULT_STATE);
    Object.assign(state, loadedState);

    // Initialize UI
    initializeTheme();
    renderDecksList();
    updateMainView();
    attachEventListeners();

    // Auto-select first deck
    if (state.decks.length > 0 && !state.activeDeckId) {
      state.activeDeckId = state.decks[0].id;
      updateMainView();
    }

    console.log('✅ App initialized successfully');
  }

  /* ========================================================================
     Theme Management
     ======================================================================== */

  function initializeTheme() {
    const savedTheme = localStorage.getItem('app-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');

    document.documentElement.style.colorScheme = theme;
    updateThemeToggle();
  }

  function toggleTheme() {
    const current = document.documentElement.style.colorScheme || 'light';
    const newTheme = current === 'dark' ? 'light' : 'dark';

    document.documentElement.style.colorScheme = newTheme;
    localStorage.setItem('app-theme', newTheme);
    updateThemeToggle();
    showMessage(`Switched to ${newTheme} mode`, 'info');
  }

  function updateThemeToggle() {
    const theme = document.documentElement.style.colorScheme || 'light';
    DOM.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    DOM.themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
  }

  /* ========================================================================
     Deck Management - CRUD Operations
     ======================================================================== */

  function renderDecksList() {
    DOM.decksList.innerHTML = '';

    if (state.decks.length === 0) {
      DOM.sidebarEmpty.classList.add('active');
      DOM.deckCount.textContent = '0';
      updateSidebarStats();
      return;
    }

    DOM.sidebarEmpty.classList.remove('active');
    DOM.deckCount.textContent = state.decks.length;

    state.decks.forEach(deck => {
      const li = document.createElement('li');
      li.className = 'deck-item';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `deck-btn ${deck.id === state.activeDeckId ? 'active' : ''}`;
      btn.setAttribute('aria-pressed', String(deck.id === state.activeDeckId));
      btn.setAttribute('aria-label', `Select deck: ${deck.name}`);
      btn.dataset.deckId = deck.id;

      const label = document.createElement('span');
      label.className = 'deck-label';
      label.textContent = deck.name;
      label.title = deck.name;

      const cardCount = (state.cardsByDeckId[deck.id] || []).length;
      const count = document.createElement('span');
      count.className = 'deck-card-count';
      count.textContent = cardCount;
      count.setAttribute('aria-label', `${cardCount} cards`);

      btn.appendChild(label);
      btn.appendChild(count);

      // Menu buttons
      const menu = document.createElement('div');
      menu.className = 'deck-menu';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'deck-action-btn';
      editBtn.setAttribute('aria-label', `Rename deck: ${deck.name}`);
      editBtn.textContent = '✎';
      editBtn.dataset.action = 'edit';
      editBtn.dataset.deckId = deck.id;
      editBtn.title = 'Rename (Shift+F2)';

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'deck-action-btn';
      deleteBtn.setAttribute('aria-label', `Delete deck: ${deck.name}`);
      deleteBtn.textContent = '🗑';
      deleteBtn.dataset.action = 'delete';
      deleteBtn.dataset.deckId = deck.id;
      deleteBtn.title = 'Delete (Shift+Del)';

      menu.appendChild(editBtn);
      menu.appendChild(deleteBtn);

      li.appendChild(btn);
      li.appendChild(menu);
      DOM.decksList.appendChild(li);
    });

    updateSidebarStats();
  }

  function createDeck(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      showMessage('Deck name cannot be empty', 'warning');
      return null;
    }

    const id = `deck-${state.nextDeckId++}`;
    state.decks.push({
      id,
      name: trimmed,
      createdAt: Date.now()
    });
    state.cardsByDeckId[id] = [];

    saveState();
    renderDecksList();
    selectDeck(id);
    showMessage(`Created deck: "${trimmed}"`, 'success');
    return id;
  }

  function renameDeck(deckId, name) {
    const deck = state.decks.find(d => d.id === deckId);
    if (!deck) return false;

    const trimmed = (name || '').trim();
    if (!trimmed) {
      showMessage('Deck name cannot be empty', 'warning');
      return false;
    }

    const oldName = deck.name;
    deck.name = trimmed;
    saveState();
    renderDecksList();
    updateMainView();
    showMessage(`Renamed "${oldName}" to "${trimmed}"`, 'success');
    return true;
  }

  function deleteDeck(deckId) {
    const deck = state.decks.find(d => d.id === deckId);
    if (!deck) return false;

    const idx = state.decks.findIndex(d => d.id === deckId);
    state.decks.splice(idx, 1);
    delete state.cardsByDeckId[deckId];

    if (state.activeDeckId === deckId) {
      state.activeDeckId = state.decks.length > 0 ? state.decks[0].id : null;
    }

    saveState();
    renderDecksList();
    updateMainView();
    showMessage(`Deleted deck: "${deck.name}"`, 'success');
    return true;
  }

  function selectDeck(deckId) {
    state.activeDeckId = deckId;
    currentMode = 'study';
    currentCardIndex = 0;
    searchQuery = '';
    DOM.searchInput.value = '';
    cardOrder = [];
    filteredCards = [];

    renderDecksList();
    updateMainView();
    enterStudyMode();
  }

  /* ========================================================================
     Card Management - CRUD Operations
     ======================================================================== */

  function getCards(deckId = state.activeDeckId) {
    return state.cardsByDeckId[deckId] || [];
  }

  function addCard(deckId, front, back) {
    const trimmedFront = (front || '').trim();
    const trimmedBack = (back || '').trim();

    if (!trimmedFront) {
      showMessage('Card front cannot be empty', 'warning');
      return null;
    }

    if (!state.cardsByDeckId[deckId]) {
      state.cardsByDeckId[deckId] = [];
    }

    const id = `card-${state.nextCardId++}`;
    const card = {
      id,
      front: trimmedFront,
      back: trimmedBack,
      createdAt: Date.now()
    };

    state.cardsByDeckId[deckId].push(card);
    saveState();
    updateMainView();
    showMessage('Card added', 'success');
    return id;
  }

  function updateCard(deckId, cardId, front, back) {
    const cards = state.cardsByDeckId[deckId];
    if (!cards) return false;

    const card = cards.find(c => c.id === cardId);
    if (!card) return false;

    const trimmedFront = (front || '').trim() || card.front;
    const trimmedBack = (back || '').trim() || card.back;

    if (!trimmedFront) {
      showMessage('Card front cannot be empty', 'warning');
      return false;
    }

    card.front = trimmedFront;
    card.back = trimmedBack;
    card.updatedAt = Date.now();

    saveState();
    updateMainView();
    showMessage('Card updated', 'success');
    return true;
  }

  function deleteCard(deckId, cardId) {
    const cards = state.cardsByDeckId[deckId];
    if (!cards) return false;

    const idx = cards.findIndex(c => c.id === cardId);
    if (idx === -1) return false;

    cards.splice(idx, 1);

    if (currentCardIndex >= cards.length && cards.length > 0) {
      currentCardIndex = cards.length - 1;
    }

    saveState();
    updateMainView();
    showMessage('Card deleted', 'success');
    return true;
  }

  /* ========================================================================
     Study Mode - Navigation & Controls
     ======================================================================== */

  function enterStudyMode() {
    currentMode = 'study';
    updateCardOrder();
    renderCard();

    DOM.main.classList.add('study-mode');
    enableStudyControls(true);
    attachStudyKeyboardShortcuts();
  }

  function exitStudyMode() {
    currentMode = 'browse';
    DOM.main.classList.remove('study-mode');
    removeStudyKeyboardShortcuts();
    enableStudyControls(false);
  }

  function updateCardOrder() {
    const cards = getCards(state.activeDeckId);

    // Apply search filter
    if (searchQuery) {
      const result = Search.filterCards(cards, searchQuery);
      filteredCards = result.filtered;
    } else {
      filteredCards = cards;
    }

    // Create order array
    cardOrder = filteredCards.map((_, i) => i);

    // Reset index if out of bounds
    if (currentCardIndex >= cardOrder.length && cardOrder.length > 0) {
      currentCardIndex = 0;
    }
  }

  function renderCard() {
    const cards = getCards(state.activeDeckId);

    if (cards.length === 0) {
      renderEmptyCard('No cards in deck', 'Create a card to start');
      return;
    }

    if (filteredCards.length === 0) {
      renderEmptyCard('No matches', `No cards match "${searchQuery}"`);
      return;
    }

    DOM.mainEmpty.classList.add('hidden');

    const card = filteredCards[currentCardIndex];
    if (!card) {
      renderEmptyCard('Error', 'Card not found');
      return;
    }

    DOM.cardFront.querySelector('.card-content').textContent = card.front;
    DOM.cardBack.querySelector('.card-content').textContent = card.back;

    // Reset flip
    DOM.card.classList.remove('is-flipped');
    DOM.flipBtn.setAttribute('aria-pressed', 'false');

    // Update progress
    updateProgress();

    // Update hint
    DOM.cardHint.textContent = '💡 Click or press Space to flip • Use arrow keys to navigate';
  }

  function renderEmptyCard(front, back) {
    DOM.mainEmpty.classList.remove('hidden');
    DOM.cardFront.querySelector('.card-content').textContent = front;
    DOM.cardBack.querySelector('.card-content').textContent = back;
  }

  function updateProgress() {
    const progress = cardOrder.length > 0 ? ((currentCardIndex + 1) / cardOrder.length) * 100 : 0;
    DOM.currentCardSpan.textContent = cardOrder.length > 0 ? currentCardIndex + 1 : 0;
    DOM.totalCardsSpan.textContent = cardOrder.length;
    DOM.currentPercentage.textContent = Math.round(progress);
    DOM.progressFill.style.width = `${progress}%`;
    DOM.progressBar.setAttribute('aria-valuenow', Math.round(progress));
  }

  function nextCard() {
    if (cardOrder.length === 0) return;
    currentCardIndex = (currentCardIndex + 1) % cardOrder.length;
    renderCard();
  }

  function prevCard() {
    if (cardOrder.length === 0) return;
    currentCardIndex = (currentCardIndex - 1 + cardOrder.length) % cardOrder.length;
    renderCard();
  }

  function toggleFlip() {
    DOM.card.classList.toggle('is-flipped');
    const isFlipped = DOM.card.classList.contains('is-flipped');
    DOM.flipBtn.setAttribute('aria-pressed', String(isFlipped));
  }

  function shuffleDeck() {
    if (cardOrder.length === 0) {
      showMessage('No cards to shuffle', 'warning');
      return;
    }

    // Fisher-Yates shuffle
    for (let i = cardOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardOrder[i], cardOrder[j]] = [cardOrder[j], cardOrder[i]];
    }

    currentCardIndex = 0;
    renderCard();
    showMessage('Deck shuffled', 'info');
  }

  /* ========================================================================
     Search & Filtering
     ======================================================================== */

  function updateSearchResults() {
    const cards = getCards(state.activeDeckId);
    const result = Search.filterCards(cards, searchQuery);

    DOM.searchResults.textContent = Search.formatResults(result);
    DOM.clearSearchBtn.disabled = !searchQuery;

    updateCardOrder();
    currentCardIndex = 0;
    renderCard();
  }

  /* ========================================================================
     UI Updates
     ======================================================================== */

  function updateMainView() {
    const deck = state.decks.find(d => d.id === state.activeDeckId);
    const cards = getCards(state.activeDeckId);

    if (!deck) {
      DOM.deckTitle.textContent = 'No deck selected';
      DOM.deckCardCount.textContent = '0 cards';
      DOM.mainEmpty.classList.remove('hidden');
      enableMainControls(false);
      return;
    }

    DOM.deckTitle.textContent = deck.name;
    DOM.deckCardCount.textContent = `${cards.length} card${cards.length !== 1 ? 's' : ''}`;

    if (cards.length === 0) {
      renderEmptyCard('No cards', `Click "+ Card" to add cards to "${deck.name}"`);
      enableMainControls(false);
      return;
    }

    DOM.mainEmpty.classList.add('hidden');
    enableMainControls(true);

    if (currentMode === 'study') {
      updateCardOrder();
      renderCard();
    }
  }

  function updateSidebarStats() {
    const totalCards = Object.values(state.cardsByDeckId).flat().length;
    DOM.totalCardsCount.textContent = totalCards;

    const lastSaved = new Date(state.lastSaved || Date.now());
    const now = new Date();
    const diff = (now - lastSaved) / 1000;

    let timeText = 'now';
    if (diff < 60) {
      timeText = 'now';
    } else if (diff < 3600) {
      timeText = `${Math.floor(diff / 60)}m ago`;
    } else if (diff < 86400) {
      timeText = `${Math.floor(diff / 3600)}h ago`;
    } else {
      timeText = `${Math.floor(diff / 86400)}d ago`;
    }

    DOM.lastSavedTime.textContent = timeText;
  }

  function enableMainControls(enabled) {
    DOM.searchInput.disabled = !enabled;
    DOM.shuffleBtn.disabled = !enabled;
    DOM.newCardBtn.disabled = !enabled;
  }

  function enableStudyControls(enabled) {
    DOM.prevBtn.disabled = !enabled || cardOrder.length === 0;
    DOM.flipBtn.disabled = !enabled || cardOrder.length === 0;
    DOM.nextBtn.disabled = !enabled || cardOrder.length === 0;
  }

  /* ========================================================================
     Persistence & Auto-Save
     ======================================================================== */

  function saveState() {
    state.lastSaved = Date.now();

    if (autoSaveTimer) clearTimeout(autoSaveTimer);

    autoSaveTimer = setTimeout(() => {
      Storage.saveState(state);
      updateSidebarStats();
      console.log('💾 Auto-saved');
    }, CONFIG.AUTO_SAVE_DELAY);
  }

  /* ========================================================================
     Import / Export
     ======================================================================== */

  function exportDecks() {
    try {
      const exported = {
        version: CONFIG.VERSION,
        exportedAt: new Date().toISOString(),
        decks: state.decks,
        cardsByDeckId: state.cardsByDeckId
      };

      const json = JSON.stringify(exported, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flashcards-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showMessage('Decks exported successfully', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      showMessage('Failed to export decks', 'error');
    }
  }

  function importDecks(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);

        // Validate structure
        if (!Array.isArray(imported.decks) || typeof imported.cardsByDeckId !== 'object') {
          throw new Error('Invalid file format');
        }

        // Ask for confirmation
        const deckCount = imported.decks.length;
        const cardCount = Object.values(imported.cardsByDeckId).flat().length;

        Modal.open({
          title: 'Import Decks?',
          buildContent: (container) => {
            const p = document.createElement('p');
            p.textContent = `Import ${deckCount} deck${deckCount !== 1 ? 's' : ''} with ${cardCount} card${cardCount !== 1 ? 's' : ''}? This will add to your existing decks.`;
            container.appendChild(p);
          },
          onSubmit: (reason) => {
            if (reason === 'submit') {
              // Merge decks
              state.decks.push(...imported.decks);
              Object.assign(state.cardsByDeckId, imported.cardsByDeckId);

              // Update IDs
              const maxDeckId = Math.max(...state.decks.map(d => {
                const match = d.id.match(/\d+$/);
                return match ? parseInt(match[0]) : 0;
              }));
              state.nextDeckId = Math.max(state.nextDeckId, maxDeckId + 1);

              const maxCardId = Math.max(...Object.values(state.cardsByDeckId).flat().map(c => {
                const match = c.id.match(/\d+$/);
                return match ? parseInt(match[0]) : 0;
              }));
              state.nextCardId = Math.max(state.nextCardId, maxCardId + 1);

              saveState();
              renderDecksList();
              updateMainView();
              showMessage(`Imported ${deckCount} deck${deckCount !== 1 ? 's' : ''}`, 'success');
            }
          },
          submitLabel: 'Import',
          cancelLabel: 'Cancel'
        });
      } catch (error) {
        console.error('Import failed:', error);
        showMessage('Failed to import file. Invalid format.', 'error');
      }
    };

    reader.onerror = () => {
      showMessage('Failed to read file', 'error');
    };

    reader.readAsText(file);
  }

  /* ========================================================================
     Keyboard Shortcuts
     ======================================================================== */

  function attachStudyKeyboardShortcuts() {
    if (studyKeyboardHandler) return;

    studyKeyboardHandler = (e) => {
      // Don't hijack input events
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          toggleFlip();
          break;
        case 'ArrowRight':
        case 'n':
        case 'N':
          e.preventDefault();
          nextCard();
          break;
        case 'ArrowLeft':
        case 'p':
        case 'P':
          e.preventDefault();
          prevCard();
          break;
        case 's':
        case 'S':
          e.preventDefault();
          shuffleDeck();
          break;
        case 'Escape':
          e.preventDefault();
          exitStudyMode();
          break;
      }
    };

    document.addEventListener('keydown', studyKeyboardHandler);
  }

  function removeStudyKeyboardShortcuts() {
    if (studyKeyboardHandler) {
      document.removeEventListener('keydown', studyKeyboardHandler);
      studyKeyboardHandler = null;
    }
  }

  function attachGlobalKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + N: New Deck
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openCreateDeckModal();
      }

      // Ctrl/Cmd + K: New Card
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (state.activeDeckId) {
          openCreateCardModal();
        }
      }

      // Escape: Clear search
      if (e.key === 'Escape' && searchQuery) {
        searchQuery = '';
        DOM.searchInput.value = '';
        updateSearchResults();
      }
    });
  }

  /* ========================================================================
     Messages & Notifications
     ======================================================================== */

  function showMessage(text, type = 'info') {
    DOM.statusMessage.textContent = text;
    DOM.statusMessage.className = `status-message ${type}`;
    DOM.statusMessage.classList.remove('hidden');

    setTimeout(() => {
      DOM.statusMessage.classList.add('hidden');
    }, CONFIG.MESSAGE_TIMEOUT);
  }

  /* ========================================================================
     Event Listeners
     ======================================================================== */

  function attachEventListeners() {
    // Header
    DOM.newDeckBtn.addEventListener('click', openCreateDeckModal);
    DOM.themeToggle.addEventListener('click', toggleTheme);

    // Sidebar
    DOM.decksList.addEventListener('click', handleDeckListClick);
    DOM.importBtn.addEventListener('click', () => DOM.importFile.click());
    DOM.exportBtn.addEventListener('click', exportDecks);
    DOM.importFile.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        importDecks(e.target.files[0]);
        e.target.value = ''; // Reset
      }
    });

    // Search
    DOM.searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      Search.search(searchQuery, () => {
        updateSearchResults();
      });
    });
    DOM.clearSearchBtn.addEventListener('click', () => {
      searchQuery = '';
      DOM.searchInput.value = '';
      updateSearchResults();
    });

    // Card controls
    DOM.prevBtn.addEventListener('click', prevCard);
    DOM.flipBtn.addEventListener('click', toggleFlip);
    DOM.nextBtn.addEventListener('click', nextCard);
    DOM.shuffleBtn.addEventListener('click', shuffleDeck);

    // Card
    DOM.card.addEventListener('click', toggleFlip);
    DOM.card.addEventListener('dblclick', () => {
      if (filteredCards.length > 0 && currentCardIndex < filteredCards.length) {
        openEditCardModal(filteredCards[currentCardIndex].id);
      }
    });

    // New Card
    DOM.newCardBtn.addEventListener('click', openCreateCardModal);

    // Global shortcuts
    attachGlobalKeyboardShortcuts();
  }

  function handleDeckListClick(e) {
    const btn = e.target.closest('.deck-btn');
    if (btn) {
      e.preventDefault();
      selectDeck(btn.dataset.deckId);
      return;
    }

    const actionBtn = e.target.closest('.deck-action-btn');
    if (actionBtn) {
      e.preventDefault();
      const action = actionBtn.dataset.action;
      const deckId = actionBtn.dataset.deckId;

      if (action === 'edit') {
        openRenameDeckModal(deckId);
      } else if (action === 'delete') {
        openDeleteDeckModal(deckId);
      }
    }
  }

  /* ========================================================================
     Modals
     ======================================================================== */

  function openCreateDeckModal() {
    Modal.open({
      title: 'Create New Deck',
      buildContent: (container) => {
        const group = document.createElement('div');
        group.className = 'form-group';

        const label = document.createElement('label');
        label.className = 'form-label';
        label.htmlFor = 'deck-name-input';
        label.textContent = 'Deck Name';

        const input = document.createElement('input');
        input.id = 'deck-name-input';
        input.className = 'form-input';
        input.type = 'text';
        input.placeholder = 'e.g., Spanish Vocabulary';
        input.required = true;
        input.autocomplete = 'off';

        group.appendChild(label);
        group.appendChild(input);
        container.appendChild(group);

        return input;
      },
      onSubmit: () => {
        const input = document.querySelector('#deck-name-input');
        if (input?.value.trim()) {
          createDeck(input.value);
        }
      },
      submitLabel: 'Create Deck'
    });
  }

  function openRenameDeckModal(deckId) {
    const deck = state.decks.find(d => d.id === deckId);
    if (!deck) return;

    Modal.open({
      title: 'Rename Deck',
      buildContent: (container) => {
        const group = document.createElement('div');
        group.className = 'form-group';

        const label = document.createElement('label');
        label.className = 'form-label';
        label.htmlFor = 'rename-input';
        label.textContent = 'New Name';

        const input = document.createElement('input');
        input.id = 'rename-input';
        input.className = 'form-input';
        input.type = 'text';
        input.value = deck.name;
        input.required = true;
        input.autocomplete = 'off';

        group.appendChild(label);
        group.appendChild(input);
        container.appendChild(group);

        return input;
      },
      onSubmit: (reason) => {
        if (reason === 'destructive') {
          deleteDeck(deckId);
          return;
        }

        const input = document.querySelector('#rename-input');
        if (input?.value.trim()) {
          renameDeck(deckId, input.value);
        }
      },
      submitLabel: 'Save',
      destructiveLabel: 'Delete Deck'
    });
  }

  function openDeleteDeckModal(deckId) {
    const deck = state.decks.find(d => d.id === deckId);
    if (!deck) return;

    Modal.open({
      title: 'Delete Deck?',
      buildContent: (container) => {
        const p = document.createElement('p');
        const cardCount = (state.cardsByDeckId[deckId] || []).length;
        p.textContent = `Are you sure you want to delete "${deck.name}"? This will also delete ${cardCount} card${cardCount !== 1 ? 's' : ''}. This action cannot be undone.`;
        container.appendChild(p);
      },
      onSubmit: (reason) => {
        if (reason === 'destructive' || reason === 'submit') {
          deleteDeck(deckId);
        }
      },
      submitLabel: 'Delete',
      destructiveLabel: 'Delete'
    });
  }

  function openCreateCardModal() {
    if (!state.activeDeckId) return;

    Modal.open({
      title: 'Add New Card',
      buildContent: (container) => {
        const frontGroup = document.createElement('div');
        frontGroup.className = 'form-group';

        const frontLabel = document.createElement('label');
        frontLabel.className = 'form-label';
        frontLabel.htmlFor = 'card-front-input';
        frontLabel.textContent = 'Front (Question)';

        const frontInput = document.createElement('input');
        frontInput.id = 'card-front-input';
        frontInput.className = 'form-input';
        frontInput.type = 'text';
        frontInput.placeholder = 'What to learn';
        frontInput.required = true;
        frontInput.autocomplete = 'off';

        frontGroup.appendChild(frontLabel);
        frontGroup.appendChild(frontInput);
        container.appendChild(frontGroup);

        const backGroup = document.createElement('div');
        backGroup.className = 'form-group';

        const backLabel = document.createElement('label');
        backLabel.className = 'form-label';
        backLabel.htmlFor = 'card-back-input';
        backLabel.textContent = 'Back (Answer)';

        const backInput = document.createElement('input');
        backInput.id = 'card-back-input';
        backInput.className = 'form-input';
        backInput.type = 'text';
        backInput.placeholder = 'The definition or answer';
        backInput.autocomplete = 'off';

        backGroup.appendChild(backLabel);
        backGroup.appendChild(backInput);
        container.appendChild(backGroup);

        return frontInput;
      },
      onSubmit: () => {
        const front = document.querySelector('#card-front-input')?.value || '';
        const back = document.querySelector('#card-back-input')?.value || '';

        if (front.trim()) {
          addCard(state.activeDeckId, front, back);
        }
      },
      submitLabel: 'Add Card'
    });
  }

  function openEditCardModal(cardId) {
    if (!state.activeDeckId) return;

    const cards = getCards(state.activeDeckId);
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    Modal.open({
      title: 'Edit Card',
      buildContent: (container) => {
        const frontGroup = document.createElement('div');
        frontGroup.className = 'form-group';

        const frontLabel = document.createElement('label');
        frontLabel.className = 'form-label';
        frontLabel.htmlFor = 'edit-card-front';
        frontLabel.textContent = 'Front';

        const frontInput = document.createElement('input');
        frontInput.id = 'edit-card-front';
        frontInput.className = 'form-input';
        frontInput.type = 'text';
        frontInput.value = card.front;
        frontInput.required = true;

        frontGroup.appendChild(frontLabel);
        frontGroup.appendChild(frontInput);
        container.appendChild(frontGroup);

        const backGroup = document.createElement('div');
        backGroup.className = 'form-group';

        const backLabel = document.createElement('label');
        backLabel.className = 'form-label';
        backLabel.htmlFor = 'edit-card-back';
        backLabel.textContent = 'Back';

        const backInput = document.createElement('input');
        backInput.id = 'edit-card-back';
        backInput.className = 'form-input';
        backInput.type = 'text';
        backInput.value = card.back;

        backGroup.appendChild(backLabel);
        backGroup.appendChild(backInput);
        container.appendChild(backGroup);

        return frontInput;
      },
      onSubmit: (reason) => {
        if (reason === 'destructive') {
          deleteCard(state.activeDeckId, cardId);
          return;
        }

        const front = document.querySelector('#edit-card-front')?.value || '';
        const back = document.querySelector('#edit-card-back')?.value || '';

        if (front.trim()) {
          updateCard(state.activeDeckId, cardId, front, back);
        }
      },
      submitLabel: 'Save',
      destructiveLabel: 'Delete Card'
    });
  }

  /* ========================================================================
     Bootstrap
     ======================================================================== */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();