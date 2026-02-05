// Minimal modal + deck CRUD (in-memory) wired to UI

(() => {
  /* --- In-memory state --- */
  const state = {
    decks: [
      { name: "Spanish — Basics", cards: [
        { id: 1, front: "Hola", back: "Hi / Hello" },
        { id: 2, front: "Adiós", back: "Goodbye" }
      ]},
      { name: "Biology — Cells", cards: [
        { id: 3, front: "Cell", back: "Basic unit of life" }
      ]},
      { name: "History — WWII", cards: [
        { id: 4, front: "1939", back: "War begins" }
      ]}
    ],
    currentDeckIndex: 0,
    currentCardIndex: 0,
    nextCardId: 5
  };

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
    const card = deck.cards[state.currentCardIndex] || { front: 'No cards', back: '' };
    cardFront.textContent = card.front;
    cardBack.textContent = card.back;
    cardArticle.classList.remove('is-flipped');
    flipBtn && flipBtn.setAttribute('aria-pressed', 'false');
  }

  function selectDeck(index) {
    if (index < 0 || index >= state.decks.length) return;
    state.currentDeckIndex = index;
    state.currentCardIndex = 0;
    renderDeckList();
    renderCardView();
  }

  /* --- Modal: create on demand, focus trap, ESC to close, restore focus --- */
  function createModal({ title = '', buildContent, onSubmit, submitLabel = 'Save', cancelLabel = 'Cancel', destructiveLabel }) {
    const opener = document.activeElement;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style = `
      position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.35);z-index:9999;padding:20px;
    `;

    const dialog = document.createElement('div');
    dialog.className = 'modal';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', title || 'Dialog');
    dialog.style = `
      background:var(--surface, #fff);color:var(--text,#111);border-radius:10px;
      max-width:520px;width:100%;padding:18px;box-shadow:0 10px 40px rgba(0,0,0,0.2);
    `;

    const h = document.createElement('h3');
    h.textContent = title;
    h.style = 'margin:0 0 12px 0;font-size:1.05rem;';
    dialog.appendChild(h);

    const content = document.createElement('div');
    content.className = 'modal-content';
    dialog.appendChild(content);
    const focusTarget = buildContent(content) || content;

    const actions = document.createElement('div');
    actions.style = 'display:flex;gap:8px;justify-content:flex-end;margin-top:14px;';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn modal-cancel';
    cancelBtn.textContent = cancelLabel;
    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'btn modal-submit';
    submitBtn.textContent = submitLabel;
    actions.appendChild(cancelBtn);
    if (destructiveLabel) {
      const destructive = document.createElement('button');
      destructive.type = 'button';
      destructive.className = 'btn modal-destructive';
      destructive.textContent = destructiveLabel;
      destructive.style.background = '#e55353';
      actions.appendChild(destructive);
      destructive.addEventListener('click', () => close('destructive'));
    }
    actions.appendChild(submitBtn);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const mainContent = document.querySelector('.flashcards-app');
    if (mainContent) mainContent.setAttribute('aria-hidden', 'true');

    const focusableSelector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    let focusable = Array.from(dialog.querySelectorAll(focusableSelector));
    setTimeout(() => {
      const first = focusTarget.querySelector ? focusTarget.querySelector(focusableSelector) : focusTarget;
      (first || focusable[0] || submitBtn).focus();
      focusable = Array.from(dialog.querySelectorAll(focusableSelector));
    }, 0);

    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close('escape');
        return;
      }
      if (e.key === 'Tab') {
        const nodes = focusable.filter(n => n.offsetParent !== null);
        if (nodes.length === 0) { e.preventDefault(); return; }
        const idx = nodes.indexOf(document.activeElement);
        if (e.shiftKey) {
          if (idx === 0 || document.activeElement === dialog) {
            e.preventDefault();
            nodes[nodes.length - 1].focus();
          }
        } else {
          if (idx === nodes.length - 1) {
            e.preventDefault();
            nodes[0].focus();
          }
        }
      }
    }

    document.addEventListener('keydown', onKey, true);

    function close(reason = 'close') {
      document.removeEventListener('keydown', onKey, true);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (mainContent) mainContent.removeAttribute('aria-hidden');
      if (opener && typeof opener.focus === 'function') opener.focus();
      if (reason === 'submit' && typeof onSubmit === 'function') onSubmit();
      if (reason === 'destructive' && typeof onSubmit === 'function') onSubmit('destructive');
    }

    cancelBtn.addEventListener('click', () => close('cancel'));
    submitBtn.addEventListener('click', () => close('submit'));
    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay) close('overlay');
    });

    return { close };
  }

  /* --- Deck CRUD --- */
  function createDeck(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;
    state.decks.push({ name: trimmed, cards: [] });
    const newIndex = state.decks.length - 1;
    renderDeckList();
    selectDeck(newIndex);
    return newIndex;
  }

  function renameDeck(index, newName) {
    if (!state.decks[index]) return;
    state.decks[index].name = (newName || '').trim() || state.decks[index].name;
    renderDeckList();
    renderCardView();
  }

  function deleteDeck(index) {
    if (!state.decks[index]) return;
    state.decks.splice(index, 1);
    if (state.currentDeckIndex >= state.decks.length) {
      state.currentDeckIndex = Math.max(0, state.decks.length - 1);
    }
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
    renderCardView();
  }

  function editCard(index, front, back) {
    const deck = state.decks[state.currentDeckIndex];
    if (!deck || !deck.cards[index]) return;
    deck.cards[index].front = front;
    deck.cards[index].back = back;
    renderCardView();
  }

  function deleteCard(index) {
    const deck = state.decks[state.currentDeckIndex];
    if (!deck || !deck.cards[index]) return;
    deck.cards.splice(index, 1);
    if (state.currentCardIndex >= deck.cards.length) {
      state.currentCardIndex = Math.max(0, deck.cards.length - 1);
    }
    renderCardView();
  }

  function shuffleDeck() {
    const deck = state.decks[state.currentDeckIndex];
    if (!deck || !deck.cards.length) return;
    for (let i = deck.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck.cards[i], deck.cards[j]] = [deck.cards[j], deck.cards[i]];
    }
    state.currentCardIndex = 0;
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

  // card actions: edit/delete (for future use)
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
    const deck = state.decks[state.currentDeckIndex] || { cards: [] };
    if (!deck.cards.length) return;
    state.currentCardIndex = (state.currentCardIndex - 1 + deck.cards.length) % deck.cards.length;
    renderCardView();
  });

  nextBtn.addEventListener('click', () => {
    const deck = state.decks[state.currentDeckIndex] || { cards: [] };
    if (!deck.cards.length) return;
    state.currentCardIndex = (state.currentCardIndex + 1) % deck.cards.length;
    renderCardView();
  });

  flipBtn.addEventListener('click', () => {
    cardArticle.classList.toggle('is-flipped');
    const isFlipped = cardArticle.classList.contains('is-flipped');
    flipBtn.setAttribute('aria-pressed', String(isFlipped));
  });

  /* --- Modals --- */
  function openCreateDeckModal() {
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
  renderDeckList();
  renderCardView();
})();