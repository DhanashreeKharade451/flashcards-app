// Minimal modal + deck CRUD (in-memory) wired to UI

// ...existing code...

(() => {
  /* --- In-memory state --- */
  const state = {
    decks: [
      { name: "Spanish — Basics", cards: [{ front: "Hola", back: "Hi / Hello" }] },
      { name: "Biology — Cells", cards: [{ front: "Cell", back: "Basic unit of life" }] },
      { name: "History — WWII", cards: [{ front: "1939", back: "War begins" }] }
    ],
    currentDeckIndex: 0,
    currentCardIndex: 0
  };

  /* --- Helpers: DOM refs --- */
  const el = selector => document.querySelector(selector);
  const decksList = el('.decks');
  const deckTitle = el('.deck-title');
  const cardFront = el('.card-front');
  const cardBack = el('.card-back');
  const newDeckBtn = el('.new-deck');
  const newCardBtn = el('.new-card');
  const prevBtn = el('.prev');
  const nextBtn = el('.next');
  const flipBtn = el('.flip');

  /* --- Rendering --- */
  function renderDeckList() {
    decksList.innerHTML = '';
    state.decks.forEach((d, i) => {
      const li = document.createElement('li');
      li.className = 'deck' + (i === state.currentDeckIndex ? ' active' : '');
      li.role = 'listitem';
      li.tabIndex = 0;
      li.dataset.index = i;
      li.textContent = d.name;
      decksList.appendChild(li);
    });
  }

  function renderCardView() {
    const deck = state.decks[state.currentDeckIndex] || { name: 'No deck', cards: [] };
    deckTitle && (deckTitle.textContent = deck.name);
    const card = deck.cards[state.currentCardIndex] || { front: 'No cards', back: '' };
    cardFront.textContent = card.front;
    cardBack.textContent = card.back;
    cardBack.hidden = true;
    cardFront.hidden = false;
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

    // overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style = `
      position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.35);z-index:9999;padding:20px;
    `;

    // dialog
    const dialog = document.createElement('div');
    dialog.className = 'modal';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', title || 'Dialog');
    dialog.style = `
      background:var(--surface, #fff);color:var(--text,#111);border-radius:10px;
      max-width:520px;width:100%;padding:18px;box-shadow:0 10px 40px rgba(0,0,0,0.2);
    `;

    // header
    const h = document.createElement('h3');
    h.textContent = title;
    h.style = 'margin:0 0 12px 0;font-size:1.05rem;';
    dialog.appendChild(h);

    // content
    const content = document.createElement('div');
    content.className = 'modal-content';
    dialog.appendChild(content);
    // allow consumer to populate
    const focusTarget = buildContent(content) || content;

    // actions
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
      destructive.style.color = '#fff';
      actions.appendChild(destructive);
      destructive.addEventListener('click', () => {
        close('destructive');
      });
    }
    actions.appendChild(submitBtn);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // hide background from assistive tech
    const mainContent = document.querySelector('.flashcards-app');
    if (mainContent) mainContent.setAttribute('aria-hidden', 'true');

    // focusable management
    const focusableSelector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    let focusable = Array.from(dialog.querySelectorAll(focusableSelector));
    // If buildContent returned an element to focus, try focusing that
    setTimeout(() => {
      const first = focusTarget.querySelector ? focusTarget.querySelector(focusableSelector) : focusTarget;
      (first || focusable[0] || submitBtn).focus();
      focusable = Array.from(dialog.querySelectorAll(focusableSelector));
    }, 0);

    // key handling (Tab trap + ESC)
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
      // clicking outside dialog closes
      if (e.target === overlay) close('overlay');
    });

    return { close };
  }

  /* --- Deck CRUD operations --- */
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
    // adjust current index
    if (state.currentDeckIndex >= state.decks.length) state.currentDeckIndex = Math.max(0, state.decks.length - 1);
    renderDeckList();
    renderCardView();
  }

  /* --- UI wiring --- */
  // deck selection (click / keyboard)
  decksList.addEventListener('click', e => {
    const li = e.target.closest('.deck');
    if (!li) return;
    selectDeck(Number(li.dataset.index));
  });

  decksList.addEventListener('keydown', e => {
    const li = e.target.closest('.deck');
    if (!li) return;
    const idx = Number(li.dataset.index);
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectDeck(idx);
    } else if (e.key === 'Delete') {
      // quick keyboard delete with confirmation modal
      openDeleteDeckModal(idx);
    } else if ((e.key === 'F2')) {
      openRenameDeckModal(idx);
    }
  });

  // double-click to rename
  decksList.addEventListener('dblclick', e => {
    const li = e.target.closest('.deck');
    if (!li) return;
    openRenameDeckModal(Number(li.dataset.index));
  });

  // new deck -> open modal
  newDeckBtn.addEventListener('click', () => openCreateDeckModal());

  // flip/prev/next controls
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
    const isBack = flipBtn.getAttribute('aria-pressed') === 'true';
    flipBtn.setAttribute('aria-pressed', String(!isBack));
    cardFront.hidden = !cardFront.hidden;
    cardBack.hidden = !cardBack.hidden;
  });

  // new card (simple prompt to add a card in-memory)
  newCardBtn && newCardBtn.addEventListener('click', () => {
    const deck = state.decks[state.currentDeckIndex];
    if (!deck) return;
    createModal({
      title: 'New Card',
      buildContent: (container) => {
        const f = document.createElement('input'); f.type = 'text'; f.placeholder = 'Front text'; f.style = 'width:100%;margin-bottom:8px;padding:8px;';
        const b = document.createElement('input'); b.type = 'text'; b.placeholder = 'Back text'; b.style = 'width:100%;padding:8px;';
        container.appendChild(f);
        container.appendChild(b);
        // submit on Enter in last field
        b.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
        return container;
      },
      onSubmit: function () {
        const inputs = document.querySelectorAll('.modal .modal-content input');
        const front = inputs[0]?.value?.trim();
        const back = inputs[1]?.value?.trim();
        if (!front) return;
        state.decks[state.currentDeckIndex].cards.push({ front, back });
        state.currentCardIndex = state.decks[state.currentDeckIndex].cards.length - 1;
        renderCardView();
      },
      submitLabel: 'Add'
    });
  });

  /* --- Modals for deck create / rename / delete --- */
  function openCreateDeckModal() {
    createModal({
      title: 'Create Deck',
      buildContent: (container) => {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Deck name';
        input.style = 'width:100%;padding:10px;';
        input.className = 'modal-deck-name';
        container.appendChild(input);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            // trigger submit button click
            const submit = document.querySelector('.modal-submit');
            submit && submit.click();
          }
        });
        return container;
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
      title: 'Rename / Delete Deck',
      buildContent: (container) => {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = deck.name;
        input.style = 'width:100%;padding:10px;';
        input.className = 'modal-deck-rename';
        container.appendChild(input);
        return container;
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
        p.textContent = `Delete "${deck.name}" — this cannot be undone.`;
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

  /* --- Initialize --- */
  renderDeckList();
  renderCardView();
})();