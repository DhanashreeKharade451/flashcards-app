/**
 * Debounced Card Search with Match Highlighting
 */
const Search = (() => {
  const DEBOUNCE_DELAY = 300; // ms
  let debounceTimer = null;
  let currentQuery = '';

  /**
   * Filter cards by keyword (case-insensitive)
   * @param {Array} cards - Cards to filter
   * @param {string} query - Search query
   * @returns {Object} Filtered results with metadata
   */
  function filterCards(cards, query) {
    if (!query || typeof query !== 'string') {
      return {
        filtered: cards,
        matchCount: cards.length,
        totalCards: cards.length,
        query: ''
      };
    }

    const q = query.toLowerCase().trim();

    if (!q) {
      return {
        filtered: cards,
        matchCount: cards.length,
        totalCards: cards.length,
        query: ''
      };
    }

    const filtered = cards.filter(
      card =>
        card.front.toLowerCase().includes(q) ||
        card.back.toLowerCase().includes(q)
    );

    return {
      filtered,
      matchCount: filtered.length,
      totalCards: cards.length,
      query: q
    };
  }

  /**
   * Debounced search trigger
   * @param {string} query - Search query
   * @param {Function} callback - Called after debounce delay
   */
  function search(query, callback) {
    currentQuery = query;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      if (typeof callback === 'function') {
        callback(currentQuery);
      }
    }, DEBOUNCE_DELAY);
  }

  /**
   * Cancel pending search
   */
  function cancel() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  /**
   * Format results for display
   * @param {Object} result - Result from filterCards
   * @returns {string} Formatted text
   */
  function formatResults(result) {
    const { matchCount, totalCards, query } = result;

    if (!query) {
      return `${matchCount} cards`;
    }

    if (matchCount === 0) {
      return `No matches for "${query}"`;
    }

    return `${matchCount} of ${totalCards} match`;
  }

  /**
   * Highlight search term in text (for future UI enhancement)
   * @param {string} text - Text to highlight
   * @param {string} query - Query to find
   * @returns {string} HTML with <mark> tags
   */
  function highlight(text, query) {
    if (!query || !text) return text;

    const q = query.toLowerCase();
    const textLower = text.toLowerCase();
    const idx = textLower.indexOf(q);

    if (idx === -1) return text;

    const before = text.substring(0, idx);
    const match = text.substring(idx, idx + q.length);
    const after = text.substring(idx + q.length);

    return `${before}<mark>${match}</mark>${after}`;
  }

  return {
    filterCards,
    search,
    cancel,
    formatResults,
    highlight
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Search;
}