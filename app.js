// Minimal modal + deck CRUD (in-memory) wired to UI with LocalStorage persistence

(() => {
  const STORAGE_KEY = 'flashcards_state';

  /* --- In-memory state --- */
  const state = {
    decks: [
      { name: "Deck 1", cards: [
        { id: 1, front: "Hello", back: "Bonjour" },
        { id: 2, front: "Goodbye", back: "Au revoir" }
      ]},
      { name: "Deck 2", cards: [
        { id: 3, front: "Cat", back: "Chat" },
        { id: 4, front: "Dog", back: "Chien" }
      ]},
      { name: "Deck 3", cards: [
        { id: 5, front: "One", back: "Un" },
        { id: 6, front: "Two", back: "Deux" }
      ]}
    ],
    currentDeckIndex: 0,
    currentCardIndex: 0,
    nextCardId: 7,
    studyMode: false,
    shuffledOrder: null,
    searchQuery: ''
  };

  /* --- LocalStorage helpers --- */
  function saveState() {
    try {
      const toSave = {
        decks: state.decks,
        currentDeckIndex: state.currentDeckIndex,
        currentCardIndex: state.currentCardIndex,
        nextCardId: state.nextCardId
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn('Failed to save state to LocalStorage:', e);
    }
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state.decks = parsed.decks || state.decks;
        state.currentDeckIndex = Math.min(parsed.currentDeckIndex || 0, state.decks.length - 1);
        state.currentCardIndex = parsed.currentCardIndex || 0;
        state.nextCardId = parsed.nextCardId || 7;
      }
    } catch (e) {
      console.warn('Failed to load state from LocalStorage:', e);
    }
  }

  /* --- Helpers: DOM refs --- */
  const el = selector => document.querySelector(selector);
  const decksList = el('.decks');
  const deckTitle = el('.deck-title');
  const cardArticle = el('.card');
  const cardFront = el('.card-front');
  const cardBack = el('.card-back');
  const newDeckBtn = el('.new-deck');
  const newCardBtn = el('.new-card');
  const shuffleBtn = el('.shuffle');
  const searchInput = el('.search');
  const prevBtn = el('.prev');
  const nextBtn = el('.next');
  const flipBtn = el('.flip');
  const mainEl = el('.main');
  const currentCardSpan = el('.current-card');
  const totalCardsSpan = el('.total-cards');

  /* --- Study Mode Keyboard Handler --- */
  let studyKeydownHandler = null;

  function enterStudyMode(deckIndex = state.currentDeckIndex) {
    if (!state.decks[deckIndex]) return;
    
    state.studyMode = true;
    state.currentDeckIndex = deckIndex;
    state.currentCardIndex = 0;
    state.shuffledOrder = null;
    state.searchQuery = '';
    searchInput && (searchInput.value = '');
    
    // Disable sidebar deck selection & edit/delete buttons during study
    decksList.querySelectorAll('.deck, .deck-edit, .deck-delete').forEach(el => {
      el.disabled = true;
      el.style.opacity = '0.5';
      el.style.pointerEvents = 'none';
    });

    // Disable toolbar during study (focus on cards)
    searchInput && (searchInput.disabled = true);
    newCardBtn && (newCardBtn.disabled = true);

    // Add visual indicator
    mainEl.classList.add('study-mode');
    cardArticle.focus();

    renderCardView();

    // Keyboard shortcuts for study mode
    studyKeydownHandler = (e) => {
      // Escape to exit study mode
      if (e.key === 'Escape') {
        e.preventDefault();
        exitStudyMode();
        return;
      }

      // Space or F to flip
      if (e.key === ' ' || e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        flipBtn.click();
        return;
      }

      // ArrowRight or N for next
      if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        nextBtn.click();
        return;
      }

      // ArrowLeft or P for prev
      if (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        prevBtn.click();
        return;
      }

      // S for shuffle
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        shuffleBtn && shuffleBtn.click();
        return;
      }
    };

    document.addEventListener('keydown', studyKeydownHandler, true);
  }

  function exitStudyMode() {
    if (!state.studyMode) return;

    state.studyMode = false;
    state.shuffledOrder = null;

    // Remove keyboard listener
    if (studyKeydownHandler) {
      document.removeEventListener('keydown', studyKeydownHandler, true);
      studyKeydownHandler = null;
    }

    // Re-enable sidebar
    decksList.querySelectorAll('.deck, .deck-edit, .deck-delete').forEach(el => {
      el.disabled = false;
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
    });

    // Re-enable toolbar
    searchInput && (searchInput.disabled = false);
    newCardBtn && (newCardBtn.disabled = false);

    // Remove visual indicator
    mainEl.classList.remove('study-mode');
    cardArticle.classList.remove('is-flipped');
    flipBtn.setAttribute('aria-pressed', 'false');

    // Focus back to deck list
    decksList.querySelector('.deck.active')?.focus();
  }

  /* --- Card order & search --- */
  function getFilteredCards() {
    const deck = state.decks[state.currentDeckIndex];
    if (!deck) return [];
    
    if (!state.searchQuery) {
      return deck.cards;
    }
    
    const query = state.searchQuery.toLowerCase();
    return deck.cards.filter(card => 
      card.front.toLowerCase().includes(query) || 
      card.back.toLowerCase().includes(query)
    );
  }

  function getCardOrder() {
    const filtered = getFilteredCards();
    if (!filtered.length) return [];
    
    if (state.shuffledOrder) {
      return state.shuffledOrder.filter(idx => 
        filtered.some(c => state.decks[state.currentDeckIndex].cards.indexOf(c) === idx)
      );
    }
    
    return state.decks[state.currentDeckIndex].cards
      .map((_, i) => i)
      .filter(idx => filtered.includes(state.decks[state.currentDeckIndex].cards[idx]));
  }

  function getCurrentVisualCardIndex() {
    const order = getCardOrder();
    return order.indexOf(state.currentCardIndex) + 1;
  }

  /* --- Rendering --- */
  function renderDeckList() {
    decksList.innerHTML = '';
    state.decks.forEach((d, i) => {
      const li = document.createElement('li');
      li.className = 'deck' + (i === state.currentDeckIndex ? ' active' : '');
      li.setAttribute('role', 'listitem');
      li.tabIndex = 0;
      li.dataset.index = i;
      li.style = 'display:flex;align-items:center;gap:6px;';

      const label = document.createElement('span');
      label.className = 'deck-label';
      label.textContent = d.name;
      label.style = 'flex:1;min-width:0;cursor:pointer;';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'deck-edit';
      editBtn.title = 'Rename deck (F2)';
      editBtn.setAttribute('aria-label', `Rename ${d.name}`);
      editBtn.dataset.index = i;
      editBtn.textContent = '✎';
      editBtn.style = 'padding:4px 8px;border-radius:4px;background:transparent;border:none;cursor:pointer;font-size:0.9rem;color:inherit;';

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'deck-delete';
      delBtn.title = 'Delete deck';
      delBtn.setAttribute('aria-label', `Delete ${d.name}`);
      delBtn.dataset.index = i;
      delBtn.textContent = '🗑';
      delBtn.style = 'padding:4px 8px;border-radius:4px;background:transparent;border:none;cursor:pointer;font-size:0.9rem;color:inherit;';

      li.appendChild(label);
      li.appendChild(editBtn);
      li.appendChild(delBtn);
      decksList.appendChild(li);
    });
  }

  function renderCardView() {
    const deck = state.decks[state.currentDeckIndex] || { name: 'No deck', cards: [] };
    deckTitle && (deckTitle.textContent = deck.name);
    
    const filtered = getFilteredCards();
    const card = filtered.length > 0 && state.currentCardIndex < state.decks[state.currentDeckIndex].cards.length
      ? state.decks[state.currentDeckIndex].cards[state.currentCardIndex]
      : { front: 'No cards', back: '' };
    
    cardFront.textContent = card.front;
    cardBack.textContent = card.back;
    cardArticle.classList.remove('is-flipped');
    flipBtn && flipBtn.setAttribute('aria-pressed', 'false');
    
    // Update progress
    const total = filtered.length;
    const current = getCurrentVisualCardIndex();
    totalCardsSpan && (totalCardsSpan.textContent = total);
    currentCardSpan && (currentCardSpan.textContent = total > 0 ? current : 0);
  }

  function selectDeck(index) {
    if (index < 0 || index >= state.decks.length) return;
    state.currentDeckIndex = index;
    state.currentCardIndex = 0;
    state.searchQuery = '';
    searchInput && (searchInput.value = '');
    saveState();
    renderDeckList();
    renderCardView();
    // Auto-enter study mode when deck selected
    enterStudyMode(index);
  }

  /**
   * Accessible Modal Component
   * Features: focus trap, ESC to close, return focus on close
   */
  const Modal = (() => {
    let currentModal = null;
    let previousActiveElement = null;

    /**
     * Create and open a modal
     * @param {Object} options
     * @param {string} options.title - Modal title
     * @param {Function} options.buildContent - Function to build modal body
     * @param {Function} options.onSubmit - Callback on submit
     * @param {string} options.submitLabel - Submit button text
     * @param {string} options.cancelLabel - Cancel button text
     * @param {string} options.destructiveLabel - Destructive action text (optional)
     * @returns {Object} Modal methods
     */
    function open({
      title = '',
      buildContent,
      onSubmit,
      submitLabel = 'Save',
      cancelLabel = 'Cancel',
      destructiveLabel = null
    }) {
      // Close existing modal first
      if (currentModal) {
        currentModal.close();
      }

      previousActiveElement = document.activeElement;

      // Create overlay
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.setAttribute('role', 'presentation');

      // Create modal
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'modal-title');

      // Header with close button
      const header = document.createElement('div');
      header.className = 'modal-header';
      const modalTitle = document.createElement('h2');
      modalTitle.id = 'modal-title';
      modalTitle.className = 'modal-title';
      modalTitle.textContent = title;
      header.appendChild(modalTitle);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'modal-close';
      closeBtn.setAttribute('aria-label', 'Close dialog');
      closeBtn.type = 'button';
      closeBtn.textContent = '✕';

      modal.appendChild(header);
      modal.insertBefore(closeBtn, modal.firstChild);

      // Content
      const content = document.createElement('div');
      content.className = 'modal-content';

      if (typeof buildContent === 'function') {
        buildContent(content);
      }

      modal.appendChild(content);

      // Actions
      const actions = document.createElement('div');
      actions.className = 'modal-actions';

      const cancelBtnEl = document.createElement('button');
      cancelBtnEl.type = 'button';
      cancelBtnEl.className = 'btn btn-secondary';
      cancelBtnEl.textContent = cancelLabel;

      const submitBtnEl = document.createElement('button');
      submitBtnEl.type = 'button';
      submitBtnEl.className = 'btn btn-primary';
      submitBtnEl.textContent = submitLabel;

      actions.appendChild(cancelBtnEl);

      if (destructiveLabel) {
        const destructiveBtnEl = document.createElement('button');
        destructiveBtnEl.type = 'button';
        destructiveBtnEl.className = 'btn btn-danger';
        destructiveBtnEl.textContent = destructiveLabel;

        destructiveBtnEl.addEventListener('click', () => {
          close('destructive');
        });

        actions.appendChild(destructiveBtnEl);
      }

      actions.appendChild(submitBtnEl);
      modal.appendChild(actions);

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Hide main content
      const mainApp = document.querySelector('.flashcards-app');
      if (mainApp) {
        mainApp.setAttribute('aria-hidden', 'true');
      }

      // Get focusable elements
      const focusableSelector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(', ');

      let focusableElements = Array.from(modal.querySelectorAll(focusableSelector));

      // Focus first input
      setTimeout(() => {
        const firstInput = content.querySelector('input, textarea');
        if (firstInput) {
          firstInput.focus();
        } else if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
        focusableElements = Array.from(modal.querySelectorAll(focusableSelector));
      }, 0);

      // Event handlers
      function handleKeyDown(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          close('cancel');
          return;
        }

        if (e.key === 'Tab') {
          const visibleElements = focusableElements.filter(el => el.offsetParent !== null);
          if (visibleElements.length === 0) {
            e.preventDefault();
            return;
          }

          const currentIndex = visibleElements.indexOf(document.activeElement);

          if (e.shiftKey) {
            if (currentIndex === 0) {
              e.preventDefault();
              visibleElements[visibleElements.length - 1].focus();
            }
          } else {
            if (currentIndex === visibleElements.length - 1) {
              e.preventDefault();
              visibleElements[0].focus();
            }
          }
        }
      }

      function handleClickOutside(e) {
        if (e.target === overlay) {
          close('cancel');
        }
      }

      function close(reason = 'cancel') {
        // Remove listeners
        document.removeEventListener('keydown', handleKeyDown, true);
        overlay.removeEventListener('mousedown', handleClickOutside);

        // Remove modal from DOM
        overlay.remove();

        // Restore main content
        if (mainApp) {
          mainApp.removeAttribute('aria-hidden');
        }

        // Restore focus
        if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
          previousActiveElement.focus();
        }

        currentModal = null;

        // Call submit callback
        if (reason === 'submit' && typeof onSubmit === 'function') {
          onSubmit();
        } else if (reason === 'destructive' && typeof onSubmit === 'function') {
          onSubmit('destructive');
        }
      }

      // Attach listeners
      document.addEventListener('keydown', handleKeyDown, true);
      overlay.addEventListener('mousedown', handleClickOutside);
      closeBtn.addEventListener('click', () => close('cancel'));
      cancelBtnEl.addEventListener('click', () => close('cancel'));
      submitBtnEl.addEventListener('click', () => close('submit'));

      currentModal = { close, modal, overlay, actions };
      return currentModal;
    }

    return { open };
  })();

  /* --- Deck CRUD --- */
  function createDeck(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;
    state.decks.push({ name: trimmed, cards: [] });
    const newIndex = state.decks.length - 1;
    saveState();
    renderDeckList();
    return newIndex;
  }

  function renameDeck(index, newName) {
    if (!state.decks[index]) return;
    state.decks[index].name = (newName || '').trim() || state.decks[index].name;
    saveState();
    renderDeckList();
    renderCardView();
  }

  function deleteDeck(index) {
    if (!state.decks[index]) return;
    state.decks.splice(index, 1);
    if (state.currentDeckIndex >= state.decks.length) {
      state.currentDeckIndex = Math.max(0, state.decks.length - 1);
    }
    saveState();
    if (state.studyMode) exitStudyMode();
    renderDeckList();
    renderCardView();
  }

  /* --- Card CRUD with delegated events --- */
  function addCard(front, back) {
    const deck = state.decks[state.currentDeckIndex];
    if (!deck) return;
    const newCard = { id: state.nextCardId++, front, back };
    deck.cards.push(newCard);
    state.currentCardIndex = deck.cards.length - 1;
    saveState();
    renderCardView();
  }

  function editCard(index, front, back) {
    const deck = state.decks[state.currentDeckIndex];
    if (!deck || !deck.cards[index]) return;
    deck.cards[index].front = front;
    deck.cards[index].back = back;
    saveState();
    renderCardView();
  }

  function deleteCard(index) {
    const deck = state.decks[state.currentDeckIndex];
    if (!deck || !deck.cards[index]) return;
    deck.cards.splice(index, 1);
    if (state.currentCardIndex >= deck.cards.length) {
      state.currentCardIndex = Math.max(0, deck.cards.length - 1);
    }
    saveState();
    renderCardView();
  }

  function shuffleDeck() {
    const filtered = getFilteredCards();
    if (!filtered.length) return;
    
    // Create shuffled order from filtered cards
    const order = filtered.map(card => 
      state.decks[state.currentDeckIndex].cards.indexOf(card)
    );
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    
    state.shuffledOrder = order;
    state.currentCardIndex = order[0];
    renderCardView();
  }

  /* --- UI wiring: delegated events --- */
  decksList.addEventListener('click', e => {
    const editBtn = e.target.closest('.deck-edit');
    const delBtn = e.target.closest('.deck-delete');
    const li = e.target.closest('.deck');

    if (editBtn) {
      e.stopPropagation();
      openRenameDeckModal(Number(editBtn.dataset.index));
      return;
    }
    if (delBtn) {
      e.stopPropagation();
      openDeleteDeckModal(Number(delBtn.dataset.index));
      return;
    }
    if (li) {
      selectDeck(Number(li.dataset.index));
    }
  });

  decksList.addEventListener('keydown', e => {
    const li = e.target.closest('.deck');
    if (!li) return;
    const idx = Number(li.dataset.index);
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectDeck(idx);
    } else if (e.key === 'Delete') {
      openDeleteDeckModal(idx);
    } else if (e.key === 'F2') {
      e.preventDefault();
      openRenameDeckModal(idx);
    }
  });

  // Search input: case-insensitive keyword search
  searchInput && searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    state.currentCardIndex = 0;
    state.shuffledOrder = null;
    renderCardView();
  });

  // card actions: edit/delete
  cardArticle.addEventListener('dblclick', () => {
    const deck = state.decks[state.currentDeckIndex];
    if (!deck || !deck.cards.length) return;
    openEditCardModal(state.currentCardIndex);
  });

  // buttons
  newDeckBtn.addEventListener('click', () => openCreateDeckModal());

  shuffleBtn && shuffleBtn.addEventListener('click', () => shuffleDeck());

  newCardBtn && newCardBtn.addEventListener('click', () => {
    const deck = state.decks[state.currentDeckIndex];
    if (!deck) return;
    createModal({
      title: 'New Card',
      buildContent: (container) => {
        const f = document.createElement('input');
        f.type = 'text';
        f.placeholder = 'Front (question)';
        f.style = 'width:100%;margin-bottom:8px;padding:10px;border:1px solid rgba(0,0,0,0.06);border-radius:6px;';
        const b = document.createElement('input');
        b.type = 'text';
        b.placeholder = 'Back (answer)';
        b.style = 'width:100%;padding:10px;border:1px solid rgba(0,0,0,0.06);border-radius:6px;';
        container.appendChild(f);
        container.appendChild(b);
        b.addEventListener('keydown', e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            document.querySelector('.modal-submit').click();
          }
        });
        return f;
      },
      onSubmit: () => {
        const inputs = document.querySelectorAll('.modal .modal-content input');
        const front = inputs[0]?.value?.trim();
        const back = inputs[1]?.value?.trim();
        if (!front) return;
        addCard(front, back || '');
      },
      submitLabel: 'Add'
    });
  });

  prevBtn.addEventListener('click', () => {
    const order = getCardOrder();
    if (!order.length) return;
    const currentIdx = order.indexOf(state.currentCardIndex);
    const prevIdx = (currentIdx - 1 + order.length) % order.length;
    state.currentCardIndex = order[prevIdx];
    renderCardView();
  });

  nextBtn.addEventListener('click', () => {
    const order = getCardOrder();
    if (!order.length) return;
    const currentIdx = order.indexOf(state.currentCardIndex);
    const nextIdx = (currentIdx + 1) % order.length;
    state.currentCardIndex = order[nextIdx];
    renderCardView();
  });

  flipBtn.addEventListener('click', () => {
    cardArticle.classList.toggle('is-flipped');
    const isFlipped = cardArticle.classList.contains('is-flipped');
    flipBtn.setAttribute('aria-pressed', String(isFlipped));
  });

  /* --- Modals --- */
  function openCreateDeckModal() {
    if (state.studyMode) exitStudyMode();
    createModal({
      title: 'Create Deck',
      buildContent: (container) => {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Deck name';
        input.style = 'width:100%;padding:10px;border:1px solid rgba(0,0,0,0.06);border-radius:6px;';
        input.className = 'modal-deck-name';
        container.appendChild(input);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            document.querySelector('.modal-submit').click();
          }
        });
        return input;
      },
      onSubmit: () => {
        const name = document.querySelector('.modal-deck-name')?.value || '';
        createDeck(name);
      },
      submitLabel: 'Create'
    });
  }

  function openRenameDeckModal(index) {
    if (state.studyMode) exitStudyMode();
    const deck = state.decks[index];
    if (!deck) return;
    createModal({
      title: 'Rename Deck',
      buildContent: (container) => {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = deck.name;
        input.style = 'width:100%;padding:10px;border:1px solid rgba(0,0,0,0.06);border-radius:6px;';
        input.className = 'modal-deck-rename';
        container.appendChild(input);
        return input;
      },
      onSubmit: (mode) => {
        if (mode === 'destructive') {
          deleteDeck(index);
          return;
        }
        const newName = document.querySelector('.modal-deck-rename')?.value || deck.name;
        renameDeck(index, newName);
      },
      submitLabel: 'Save',
      cancelLabel: 'Cancel',
      destructiveLabel: 'Delete'
    });
  }

  function openDeleteDeckModal(index) {
    if (state.studyMode) exitStudyMode();
    const deck = state.decks[index];
    if (!deck) return;
    createModal({
      title: 'Delete Deck?',
      buildContent: (container) => {
        const p = document.createElement('p');
        p.textContent = `Delete "${deck.name}" and all its cards? This cannot be undone.`;
        container.appendChild(p);
        return container;
      },
      onSubmit: (mode) => {
        if (mode === 'destructive' || mode === 'submit') {
          deleteDeck(index);
        }
      },
      submitLabel: 'Delete',
      cancelLabel: 'Cancel'
    });
  }

  function openEditCardModal(index) {
    const deck = state.decks[state.currentDeckIndex];
    const card = deck?.cards[index];
    if (!card) return;
    createModal({
      title: 'Edit Card',
      buildContent: (container) => {
        const f = document.createElement('input');
        f.type = 'text';
        f.value = card.front;
        f.style = 'width:100%;margin-bottom:8px;padding:10px;border:1px solid rgba(0,0,0,0.06);border-radius:6px;';
        const b = document.createElement('input');
        b.type = 'text';
        b.value = card.back;
        b.style = 'width:100%;padding:10px;border:1px solid rgba(0,0,0,0.06);border-radius:6px;';
        container.appendChild(f);
        container.appendChild(b);
        return f;
      },
      onSubmit: (mode) => {
        if (mode === 'destructive') {
          deleteCard(index);
          return;
        }
        const inputs = document.querySelectorAll('.modal .modal-content input');
        const front = inputs[0]?.value?.trim();
        const back = inputs[1]?.value?.trim();
        if (!front) return;
        editCard(index, front, back || '');
      },
      submitLabel: 'Save',
      cancelLabel: 'Cancel',
      destructiveLabel: 'Delete'
    });
  }

  /* --- Initialize --- */
  loadState();
  renderDeckList();
  renderCardView();
  // Auto-enter study mode on first deck
  enterStudyMode(state.currentDeckIndex);
})();