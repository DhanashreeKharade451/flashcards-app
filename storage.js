/**
 * LocalStorage Persistence with Versioning & Safe Fallback
 */
const Storage = (() => {
  const STORAGE_KEY = 'flashcards_app_v1';
  const STORAGE_VERSION = 1;

  /**
   * Save app state to LocalStorage
   * @param {Object} state - App state object
   * @returns {boolean} Success flag
   */
  function saveState(state) {
    try {
      const payload = {
        version: STORAGE_VERSION,
        timestamp: Date.now(),
        data: {
          decks: state.decks,
          cardsByDeckId: state.cardsByDeckId,
          activeDeckId: state.activeDeckId,
          nextDeckId: state.nextDeckId,
          nextCardId: state.nextCardId
        }
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return true;
    } catch (error) {
      console.warn('Failed to save state:', error);

      // Attempt recovery on quota exceeded
      if (error.name === 'QuotaExceededError') {
        try {
          localStorage.removeItem(STORAGE_KEY);
          console.warn('Cleared storage to recover quota');
        } catch (clearError) {
          console.error('Failed to clear storage:', clearError);
        }
      }

      return false;
    }
  }

  /**
   * Load app state from LocalStorage
   * @param {Object} defaultState - Fallback state if load fails
   * @returns {Object} Loaded or default state
   */
  function loadState(defaultState) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (!stored) {
        return defaultState;
      }

      const parsed = JSON.parse(stored);

      // Version check
      if (parsed.version !== STORAGE_VERSION) {
        console.warn(
          `Version mismatch: expected ${STORAGE_VERSION}, got ${parsed.version}`
        );
        return defaultState;
      }

      // Validate structure
      if (!parsed.data || typeof parsed.data !== 'object') {
        console.warn('Invalid data structure');
        return defaultState;
      }

      const { data } = parsed;

      // Safe merge with defaults
      return {
        decks: Array.isArray(data.decks) ? data.decks : defaultState.decks,
        cardsByDeckId:
          typeof data.cardsByDeckId === 'object'
            ? data.cardsByDeckId
            : defaultState.cardsByDeckId,
        activeDeckId: data.activeDeckId || defaultState.activeDeckId,
        nextDeckId: Number.isInteger(data.nextDeckId)
          ? data.nextDeckId
          : defaultState.nextDeckId,
        nextCardId: Number.isInteger(data.nextCardId)
          ? data.nextCardId
          : defaultState.nextCardId
      };
    } catch (error) {
      console.warn('Failed to parse stored state:', error);

      // Attempt cleanup
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (clearError) {
        console.error('Failed to clear corrupted storage:', clearError);
      }

      return defaultState;
    }
  }

  /**
   * Clear all stored data
   * @returns {boolean} Success flag
   */
  function clearStorage() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.warn('Failed to clear storage:', error);
      return false;
    }
  }

  /**
   * Get storage metadata for debugging
   * @returns {Object} Storage info
   */
  function getInfo() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return { exists: false, message: 'No data stored' };
      }

      const parsed = JSON.parse(stored);
      const size = new Blob([stored]).size;

      return {
        exists: true,
        version: parsed.version,
        timestamp: new Date(parsed.timestamp).toISOString(),
        size: `${Math.round(size / 1024 * 100) / 100} KB`,
        deckCount: (parsed.data.decks || []).length
      };
    } catch (error) {
      return { exists: false, error: error.message };
    }
  }

  /**
   * Export state as JSON
   * @returns {string} JSON string
   */
  function exportState(state) {
    try {
      return JSON.stringify(state, null, 2);
    } catch (error) {
      console.error('Failed to export state:', error);
      return null;
    }
  }

  /**
   * Import state from JSON
   * @param {string} jsonString - JSON to import
   * @returns {Object|null} Parsed state or null
   */
  function importState(jsonString) {
    try {
      const imported = JSON.parse(jsonString);

      // Basic validation
      if (!Array.isArray(imported.decks) || typeof imported.cardsByDeckId !== 'object') {
        throw new Error('Invalid state structure');
      }

      return imported;
    } catch (error) {
      console.error('Failed to import state:', error);
      return null;
    }
  }

  return {
    saveState,
    loadState,
    clearStorage,
    getInfo,
    exportState,
    importState
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Storage;
}