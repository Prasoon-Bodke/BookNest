/* ============================================
   BookNest Shelf API Module
   Handles all shelf API requests with client ID management
   ============================================ */

// Base URL for the API
const API_BASE_URL = '/api';

// Client ID management
const CLIENT_ID_KEY = 'booknest-client-id';

/**
 * Get or generate a client ID
 * Stored in localStorage for persistence across sessions
 * @returns {string} The client ID
 */
function getClientId() {
  let clientId = localStorage.getItem(CLIENT_ID_KEY);

  if (!clientId) {
    // Generate a random client ID (UUID-like)
    clientId = 'client-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(CLIENT_ID_KEY, clientId);
    console.log('Generated new client ID:', clientId);
  }

  return clientId;
}

/**
 * Make a fetch request with client ID header and error handling
 * @param {string} endpoint - API endpoint (e.g., '/shelf')
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Object>} Response data
 */
async function fetchWithClientId(endpoint, options = {}) {
  const clientId = getClientId();

  // Add headers
  const headers = {
    'X-Client-Id': clientId,
    ...options.headers
  };

  // Add Content-Type for JSON requests
  if (options.body && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Parse JSON response
    const data = await response.json();

    // Check if request was successful
    if (!response.ok) {
      // Throw error with message from API
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data;

  } catch (error) {
    // Check if it's a network error (server unreachable)
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      throw new Error('Unable to connect to the server. Please make sure the server is running.');
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Get all books from the shelf
 * @param {string} status - Optional status filter ('to-read', 'reading', 'finished')
 * @returns {Promise<Array>} Array of books
 */
async function getShelf(status = null) {
  const endpoint = status ? `/shelf?status=${status}` : '/shelf';
  const data = await fetchWithClientId(endpoint);
  return data.books;
}

/**
 * Add a book to the shelf
 * @param {Object} book - Book object with required fields
 * @returns {Promise<Object>} Added book data
 */
async function addToShelf(book) {
  const data = await fetchWithClientId('/shelf', {
    method: 'POST',
    body: book
  });
  return data.book;
}

/**
 * Update a book on the shelf
 * @param {string} workKey - The work key of the book
 * @param {Object} updates - Fields to update (status, rating, notes)
 * @returns {Promise<Object>} Updated book data
 */
async function updateBook(workKey, updates) {
  // URL encode the work key
  const encodedKey = encodeURIComponent(workKey);
  const data = await fetchWithClientId(`/shelf/${encodedKey}`, {
    method: 'PUT',
    body: updates
  });
  return data.book;
}

/**
 * Remove a book from the shelf
 * @param {string} workKey - The work key of the book
 * @returns {Promise<void>}
 */
async function removeFromShelf(workKey) {
  // URL encode the work key
  const encodedKey = encodeURIComponent(workKey);
  await fetchWithClientId(`/shelf/${encodedKey}`, {
    method: 'DELETE'
  });
}

/**
 * Check if a book is on the shelf
 * @param {string} workKey - The work key to check
 * @returns {Promise<Object|null>} Book object if found, null otherwise
 */
async function isBookOnShelf(workKey) {
  try {
    const books = await getShelf();
    return books.find(book => book.workKey === workKey) || null;
  } catch (error) {
    console.error('Error checking if book is on shelf:', error);
    return null;
  }
}

/**
 * Check server health
 * @returns {Promise<Object>} Health status
 */
async function checkHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
}

// Export functions for use in other modules
export {
  getShelf,
  addToShelf,
  updateBook,
  removeFromShelf,
  isBookOnShelf,
  checkHealth,
  getClientId
};
