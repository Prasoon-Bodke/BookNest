/* ============================================
   BookNest JSON File Storage Module
   Handles reading and writing shelf data to a JSON file
   ============================================ */

const fs = require('fs');
const path = require('path');

// Path to data directory and file
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'shelves.json');

/**
 * Ensure the data directory exists
 */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('Created data directory:', DATA_DIR);
  }
}

/**
 * Load all shelf data from the JSON file
 * Returns an object where keys are client IDs and values are arrays of books
 * @returns {Object} All shelves data organized by client ID
 */
function loadData() {
  ensureDataDir();

  // If file doesn't exist, return empty object
  if (!fs.existsSync(DATA_FILE)) {
    console.log('Data file does not exist yet, returning empty data');
    return {};
  }

  try {
    const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');

    // Handle empty file
    if (!fileContent.trim()) {
      console.log('Data file is empty, returning empty data');
      return {};
    }

    // Parse JSON
    const data = JSON.parse(fileContent);
    return data;

  } catch (error) {
    // If file is corrupt, log error and return empty object
    console.error('Error reading data file (corrupt JSON):', error.message);
    console.log('Returning empty data to prevent crash');
    return {};
  }
}

/**
 * Save all shelf data to the JSON file
 * @param {Object} data - All shelves data organized by client ID
 */
function saveData(data) {
  ensureDataDir();

  try {
    // Write with pretty formatting for readability
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing data file:', error.message);
    throw new Error('Failed to save data');
  }
}

/**
 * Get a specific client's shelf
 * @param {string} clientId - The client ID
 * @returns {Array} Array of books for this client (empty array if client not found)
 */
function getClientShelf(clientId) {
  const data = loadData();
  return data[clientId] || [];
}

/**
 * Save a specific client's shelf
 * @param {string} clientId - The client ID
 * @param {Array} shelf - Array of books for this client
 */
function saveClientShelf(clientId, shelf) {
  const data = loadData();
  data[clientId] = shelf;
  saveData(data);
}

/**
 * Add a book to a client's shelf
 * @param {string} clientId - The client ID
 * @param {Object} book - Book object to add
 * @returns {Object} The added book
 */
function addBook(clientId, book) {
  const shelf = getClientShelf(clientId);

  // Check for duplicate (same workKey)
  const existingBook = shelf.find(b => b.workKey === book.workKey);
  if (existingBook) {
    throw new Error('Book already exists in your shelf');
  }

  // Add timestamp
  book.addedAt = new Date().toISOString();

  // Add to shelf
  shelf.push(book);
  saveClientShelf(clientId, shelf);

  return book;
}

/**
 * Update a book on a client's shelf
 * @param {string} clientId - The client ID
 * @param {string} workKey - The work key of the book to update
 * @param {Object} updates - Fields to update
 * @returns {Object} The updated book
 */
function updateBook(clientId, workKey, updates) {
  const shelf = getClientShelf(clientId);

  // Find the book
  const bookIndex = shelf.findIndex(b => b.workKey === workKey);
  if (bookIndex === -1) {
    throw new Error('Book not found in your shelf');
  }

  // Update only allowed fields
  const book = shelf[bookIndex];
  if (updates.status !== undefined) book.status = updates.status;
  if (updates.rating !== undefined) book.rating = updates.rating;
  if (updates.notes !== undefined) book.notes = updates.notes;

  // Save updated shelf
  saveClientShelf(clientId, shelf);

  return book;
}

/**
 * Remove a book from a client's shelf
 * @param {string} clientId - The client ID
 * @param {string} workKey - The work key of the book to remove
 * @returns {boolean} True if book was removed
 */
function removeBook(clientId, workKey) {
  const shelf = getClientShelf(clientId);

  // Find the book
  const bookIndex = shelf.findIndex(b => b.workKey === workKey);
  if (bookIndex === -1) {
    throw new Error('Book not found in your shelf');
  }

  // Remove the book
  shelf.splice(bookIndex, 1);
  saveClientShelf(clientId, shelf);

  return true;
}

module.exports = {
  getClientShelf,
  addBook,
  updateBook,
  removeBook
};
