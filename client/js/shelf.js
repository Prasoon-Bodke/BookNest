/* ============================================
   BookNest Shelf Page
   Displays and manages the user's book shelf
   ============================================ */

import { getShelf, updateBook, removeFromShelf, checkHealth } from './shelfApi.js';
import { getCoverUrl } from './api.js';

// DOM elements
let shelfContainer;
let filterButtons;
let currentFilter = 'all'; // all, to-read, reading, finished

/**
 * Initialize the shelf page when DOM is ready
 */
function init() {
  shelfContainer = document.getElementById('shelf-container');
  filterButtons = document.querySelectorAll('.filter-btn');

  // Set up filter button event listeners
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      setActiveFilter(filter);
      loadShelf(filter === 'all' ? null : filter);
    });
  });

  // Check server health first
  checkServerHealth();
}

/**
 * Check if the server is reachable
 */
async function checkServerHealth() {
  try {
    await checkHealth();
    // Server is reachable, load shelf
    loadShelf();
  } catch (error) {
    // Server is not reachable
    showServerUnreachable();
  }
}

/**
 * Load and display the shelf
 * @param {string|null} status - Status filter or null for all
 */
async function loadShelf(status = null) {
  showLoading();

  try {
    const books = await getShelf(status);
    displayShelf(books, status);
  } catch (error) {
    console.error('Error loading shelf:', error);
    showError(error.message, status);
  }
}

/**
 * Display shelf books
 * @param {Array} books - Array of books
 * @param {string|null} status - Current status filter
 */
function displayShelf(books, status) {
  shelfContainer.innerHTML = '';

  // Show empty state if no books
  if (books.length === 0) {
    showEmptyState(status);
    return;
  }

  // Show book count
  const countDiv = document.createElement('div');
  countDiv.className = 'mb-lg';
  countDiv.innerHTML = `<p class="text-muted">${books.length} book${books.length !== 1 ? 's' : ''} ${status ? `in "${getStatusLabel(status)}"` : 'on your shelf'}</p>`;
  shelfContainer.appendChild(countDiv);

  // Create grid for books
  const grid = document.createElement('div');
  grid.className = 'grid grid-3';

  books.forEach(book => {
    const card = createShelfBookCard(book);
    grid.appendChild(card);
  });

  shelfContainer.appendChild(grid);
}

/**
 * Create a card for a book on the shelf
 * @param {Object} book - Book data
 * @returns {HTMLElement} Book card
 */
function createShelfBookCard(book) {
  const card = document.createElement('article');
  card.className = 'card shelf-book-card';
  card.dataset.workKey = book.workKey;

  // Cover image
  const coverUrl = book.coverId ? getCoverUrl(book.coverId, 'M') : null;

  card.innerHTML = `
    <div class="book-cover mb-md">
      ${coverUrl
        ? `<img src="${coverUrl}" alt="Cover of ${book.title}" loading="lazy">`
        : `<div class="cover-placeholder">📖</div>`
      }
    </div>

    <h3 class="card-title">${escapeHtml(book.title)}</h3>
    <p class="card-text text-small mb-md">
      <strong>By:</strong> ${escapeHtml(book.author)}<br>
      ${book.firstPublishYear ? `<strong>Year:</strong> ${book.firstPublishYear}` : ''}
    </p>

    <!-- Status selector -->
    <div class="form-group mb-md">
      <label for="status-${book.workKey}" class="text-small">Status:</label>
      <select id="status-${book.workKey}" class="status-select text-small" data-work-key="${book.workKey}">
        <option value="to-read" ${book.status === 'to-read' ? 'selected' : ''}>Want to Read</option>
        <option value="reading" ${book.status === 'reading' ? 'selected' : ''}>Currently Reading</option>
        <option value="finished" ${book.status === 'finished' ? 'selected' : ''}>Finished</option>
      </select>
    </div>

    <!-- Star rating -->
    <div class="form-group mb-md">
      <label class="text-small">Rating:</label>
      <div class="star-rating" data-work-key="${book.workKey}" data-rating="${book.rating}" role="group" aria-label="Rate this book">
        ${[1, 2, 3, 4, 5].map(star => `
          <button
            class="star-btn ${star <= book.rating ? 'active' : ''}"
            data-star="${star}"
            aria-label="${star} star${star !== 1 ? 's' : ''}"
            type="button"
          >★</button>
        `).join('')}
      </div>
    </div>

    <!-- Notes -->
    <div class="form-group mb-md">
      <label for="notes-${book.workKey}" class="text-small">Notes:</label>
      <textarea
        id="notes-${book.workKey}"
        class="notes-input text-small"
        data-work-key="${book.workKey}"
        placeholder="Add your notes..."
        maxlength="500"
        rows="3"
      >${escapeHtml(book.notes || '')}</textarea>
      <div class="text-xs text-muted text-right mt-xs">
        <span class="note-count">${book.notes ? book.notes.length : 0}</span>/500
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-sm" style="flex-wrap: wrap;">
      <a href="book.html?key=${book.workKey}" class="btn btn-outline btn-small" style="flex: 1;">View Details</a>
      <button class="btn-remove btn btn-outline btn-small" data-work-key="${book.workKey}" style="flex: 1;">Remove</button>
    </div>
  `;

  // Add event listeners
  setupCardEventListeners(card, book);

  return card;
}

/**
 * Set up event listeners for a shelf book card
 * @param {HTMLElement} card - The card element
 * @param {Object} book - Book data
 */
function setupCardEventListeners(card, book) {
  // Status change
  const statusSelect = card.querySelector('.status-select');
  statusSelect.addEventListener('change', async (e) => {
    await handleStatusChange(book.workKey, e.target.value);
  });

  // Star rating
  const starRating = card.querySelector('.star-rating');
  const starButtons = starRating.querySelectorAll('.star-btn');
  starButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const rating = parseInt(btn.dataset.star);
      await handleRatingChange(book.workKey, rating, starRating);
    });
  });

  // Notes (save on blur with debounce)
  const notesInput = card.querySelector('.notes-input');
  const noteCount = card.querySelector('.note-count');

  notesInput.addEventListener('input', () => {
    noteCount.textContent = notesInput.value.length;
  });

  notesInput.addEventListener('blur', async () => {
    await handleNotesChange(book.workKey, notesInput.value);
  });

  // Remove button
  const removeBtn = card.querySelector('.btn-remove');
  removeBtn.addEventListener('click', async () => {
    await handleRemoveBook(book.workKey, book.title, card);
  });
}

/**
 * Handle status change
 * @param {string} workKey - Book work key
 * @param {string} newStatus - New status value
 */
async function handleStatusChange(workKey, newStatus) {
  try {
    await updateBook(workKey, { status: newStatus });
    console.log('Status updated successfully');
  } catch (error) {
    console.error('Error updating status:', error);
    alert('Failed to update status: ' + error.message);
    // Reload to restore original state
    loadShelf(currentFilter === 'all' ? null : currentFilter);
  }
}

/**
 * Handle rating change
 * @param {string} workKey - Book work key
 * @param {number} rating - New rating (1-5)
 * @param {HTMLElement} starRating - Star rating container
 */
async function handleRatingChange(workKey, rating, starRating) {
  try {
    await updateBook(workKey, { rating });

    // Update star display
    const stars = starRating.querySelectorAll('.star-btn');
    stars.forEach((star, index) => {
      if (index < rating) {
        star.classList.add('active');
      } else {
        star.classList.remove('active');
      }
    });

    console.log('Rating updated successfully');
  } catch (error) {
    console.error('Error updating rating:', error);
    alert('Failed to update rating: ' + error.message);
  }
}

/**
 * Handle notes change
 * @param {string} workKey - Book work key
 * @param {string} notes - New notes text
 */
async function handleNotesChange(workKey, notes) {
  try {
    await updateBook(workKey, { notes });
    console.log('Notes updated successfully');
  } catch (error) {
    console.error('Error updating notes:', error);
    alert('Failed to update notes: ' + error.message);
  }
}

/**
 * Handle remove book with confirmation
 * @param {string} workKey - Book work key
 * @param {string} title - Book title
 * @param {HTMLElement} card - Card element to remove
 */
async function handleRemoveBook(workKey, title, card) {
  // Show confirmation dialog
  const confirmed = confirm(`Are you sure you want to remove "${title}" from your shelf?`);

  if (!confirmed) {
    return;
  }

  try {
    // Show loading state on card
    card.style.opacity = '0.5';
    card.style.pointerEvents = 'none';

    await removeFromShelf(workKey);

    // Remove card with animation
    card.style.transition = 'opacity 0.3s ease';
    card.style.opacity = '0';

    setTimeout(() => {
      card.remove();

      // Check if shelf is now empty
      const remainingCards = document.querySelectorAll('.shelf-book-card');
      if (remainingCards.length === 0) {
        showEmptyState(currentFilter === 'all' ? null : currentFilter);
      } else {
        // Update count
        const countDiv = shelfContainer.querySelector('.text-muted');
        if (countDiv) {
          const newCount = remainingCards.length;
          countDiv.textContent = `${newCount} book${newCount !== 1 ? 's' : ''} ${currentFilter !== 'all' ? `in "${getStatusLabel(currentFilter)}"` : 'on your shelf'}`;
        }
      }
    }, 300);

  } catch (error) {
    console.error('Error removing book:', error);
    alert('Failed to remove book: ' + error.message);
    // Restore card state
    card.style.opacity = '1';
    card.style.pointerEvents = 'auto';
  }
}

/**
 * Set active filter button
 * @param {string} filter - Filter value
 */
function setActiveFilter(filter) {
  currentFilter = filter;

  filterButtons.forEach(btn => {
    if (btn.dataset.filter === filter) {
      btn.classList.add('active');
      btn.setAttribute('aria-current', 'true');
    } else {
      btn.classList.remove('active');
      btn.removeAttribute('aria-current');
    }
  });
}

/**
 * Show loading state
 */
function showLoading() {
  shelfContainer.innerHTML = `
    <div class="card text-center">
      <p class="text-muted" aria-live="polite">Loading your shelf...</p>
    </div>
  `;
}

/**
 * Show empty state
 * @param {string|null} status - Current filter status
 */
function showEmptyState(status) {
  const statusLabel = status ? getStatusLabel(status) : 'your shelf';

  shelfContainer.innerHTML = `
    <div class="card text-center">
      <h2>No Books ${status ? `in "${statusLabel}"` : 'on Your Shelf'}</h2>
      <p class="text-muted mt-md mb-lg">
        ${status
          ? 'You haven\'t added any books to this category yet.'
          : 'Start building your reading list by searching for books!'
        }
      </p>
      <a href="search.html" class="btn btn-primary">Search Books</a>
    </div>
  `;
}

/**
 * Show error state
 * @param {string} message - Error message
 * @param {string|null} status - Current filter status
 */
function showError(message, status) {
  shelfContainer.innerHTML = `
    <div class="card text-center">
      <h2>Error Loading Shelf</h2>
      <p class="text-muted mt-md mb-lg">${escapeHtml(message)}</p>
      <button id="retry-btn" class="btn btn-primary">Retry</button>
    </div>
  `;

  const retryBtn = document.getElementById('retry-btn');
  retryBtn.addEventListener('click', () => {
    loadShelf(status);
  });
}

/**
 * Show server unreachable message
 */
function showServerUnreachable() {
  shelfContainer.innerHTML = `
    <div class="card text-center">
      <h2>Unable to Connect to Server</h2>
      <p class="text-muted mt-md mb-md">
        The BookNest server is not running or unreachable.
      </p>
      <p class="text-small text-muted mb-lg">
        Please make sure the server is started by running <code>npm start</code> in the project directory.
      </p>
      <button id="retry-connection" class="btn btn-primary">Retry Connection</button>
    </div>
  `;

  const retryBtn = document.getElementById('retry-connection');
  retryBtn.addEventListener('click', () => {
    checkServerHealth();
  });
}

/**
 * Get human-readable status label
 * @param {string} status - Status value
 * @returns {string} Label
 */
function getStatusLabel(status) {
  const labels = {
    'to-read': 'Want to Read',
    'reading': 'Currently Reading',
    'finished': 'Finished'
  };
  return labels[status] || status;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
