// Minimal flashcards behavior: deck selection, flip, prev/next
(() => {
  const decksData = {
    "Deck 1": [
      { front: "Hello", back: "Hi" },
      { front: "Goodbye", back: "Bye" }
    ],
    "Deck 2": [
      { front: "Cat", back: "A small carnivorous mammal" },
      { front: "Dog", back: "A domesticated carnivorous mammal" }
    ],
    "Deck 3": [
      { front: "One", back: "1" },
      { front: "Two", back: "2" }
    ]
  };

  const deckEls = Array.from(document.querySelectorAll('.deck'));
  const frontEl = document.querySelector('.card-front');
  const backEl = document.querySelector('.card-back');
  const prevBtn = document.querySelector('button.prev');
  const nextBtn = document.querySelector('button.next');
  const flipBtn = document.querySelector('button.flip');

  let currentDeck = deckEls[0]?.textContent.trim() || Object.keys(decksData)[0];
  let currentIndex = 0;
  let showingBack = false;

  function renderCard() {
    const cards = decksData[currentDeck] || [];
    const card = cards[currentIndex] || { front: "No cards", back: "" };
    frontEl.textContent = card.front;
    backEl.textContent = card.back;
    backEl.hidden = !showingBack;
    frontEl.hidden = showingBack;
  }

  function setActiveDeck(name, el) {
    deckEls.forEach(d => d.classList.remove('active'));
    if (el) el.classList.add('active');
    currentDeck = name;
    currentIndex = 0;
    showingBack = false;
    renderCard();
  }

  deckEls.forEach(el => {
    el.addEventListener('click', () => setActiveDeck(el.textContent.trim(), el));
  });

  prevBtn.addEventListener('click', () => {
    const cards = decksData[currentDeck] || [];
    currentIndex = (currentIndex - 1 + cards.length) % Math.max(cards.length, 1);
    showingBack = false;
    renderCard();
  });

  nextBtn.addEventListener('click', () => {
    const cards = decksData[currentDeck] || [];
    currentIndex = (currentIndex + 1) % Math.max(cards.length, 1);
    showingBack = false;
    renderCard();
  });

  flipBtn.addEventListener('click', () => {
    showingBack = !showingBack;
    renderCard();
  });

  // initialize
  const initialEl = deckEls.find(d => d.classList.contains('active')) || deckEls[0];
  if (initialEl) setActiveDeck(initialEl.textContent.trim(), initialEl);
  else renderCard();
})();