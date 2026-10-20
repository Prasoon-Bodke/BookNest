/* ============================================
   BookNest Book Detail Page
   Displays detailed information about a single book
   ============================================ */

import { getWorkDetails, getCoverUrl } from './api.js';

// DOM elements
let bookDetailsSection;

/**
 * Initialize the book detail page when DOM is ready
 */
function init() {
  bookDetailsSection = document.getElementById('book-details');

  // Get the work key from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const workKey = urlParams.get('key');

  if (!workKey) {
    showError('No book specified. Please search for a book first.');
    return;
  }

  // Load book details
  loadBookDetails(workKey);
}

/**
 * Load and display book details
 * @param {string} workKey - The Open Library work key (e.g., "/works/OL45804W")
 */
async function loadBookDetails(workKey) {
  // Show loading state
  showLoading();

  try {
    // Fetch book details from API
    const book = await getWorkDetails(workKey);

    // Hide loading state
    hideLoading();

    // Display the book details
    displayBookDetails(book);

  } catch (error) {
    // Hide loading state
    hideLoading();

    // Check if it's a 404 (book not found)
    if (error.message.includes('404')) {
      showNotFound(workKey);
    } else {
      // Show error with retry option
      showError(error.message || 'Failed to load book details. Please try again.', workKey);
    }
  }
}

/**
 * Display the book details in a formatted layout
 * @param {Object} book - Book data from API
 */
function displayBookDetails(book) {
  bookDetailsSection.innerHTML = '';

  // Create main container
  const container = document.createElement('div');
  container.className = 'book-detail-container';

  // Create two-column layout
  const leftColumn = document.createElement('div');
  leftColumn.className = 'book-detail-left';

  const rightColumn = document.createElement('div');
  rightColumn.className = 'book-detail-right';

  // LEFT COLUMN: Cover image and action buttons
  const coverDiv = document.createElement('div');
  coverDiv.className = 'book-detail-cover';

  // Get cover image (large size for detail page)
  const coverUrl = book.cover_id
    ? getCoverUrl(book.cover_id, 'L')
    : null;

  if (coverUrl) {
    const coverImg = document.createElement('img');
    coverImg.src = coverUrl;
    coverImg.alt = `Cover of ${book.title}`;
    coverDiv.appendChild(coverImg);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'cover-placeholder-large';
    placeholder.textContent = '📖';
    coverDiv.appendChild(placeholder);
  }

  leftColumn.appendChild(coverDiv);

  // Add to shelf button (disabled for now)
  const shelfButton = document.createElement('button');
  shelfButton.className = 'btn btn-primary btn-large mt-md';
  shelfButton.disabled = true;
  shelfButton.innerHTML = '➕ Add to My Shelf <span class="badge-coming-soon">Coming Soon</span>';
  leftColumn.appendChild(shelfButton);

  // RIGHT COLUMN: Book information
  const infoCard = document.createElement('div');
  infoCard.className = 'card';

  // Title
  const title = document.createElement('h1');
  title.textContent = book.title;
  title.className = 'mb-md';
  infoCard.appendChild(title);

  // Author(s)
  if (book.authors && book.authors.length > 0) {
    const authorDiv = document.createElement('div');
    authorDiv.className = 'book-meta mb-md';

    const authorLabel = document.createElement('strong');
    authorLabel.textContent = book.authors.length > 1 ? 'Authors: ' : 'Author: ';
    authorDiv.appendChild(authorLabel);

    const authorText = document.createElement('span');
    authorText.textContent = book.authors.join(', ');
    authorDiv.appendChild(authorText);

    infoCard.appendChild(authorDiv);
  }

  // First published year
  if (book.first_publish_year) {
    const yearDiv = document.createElement('div');
    yearDiv.className = 'book-meta mb-lg';

    const yearLabel = document.createElement('strong');
    yearLabel.textContent = 'First Published: ';
    yearDiv.appendChild(yearLabel);

    const yearText = document.createElement('span');
    yearText.textContent = book.first_publish_year;
    yearDiv.appendChild(yearText);

    infoCard.appendChild(yearDiv);
  }

  // Description
  const descriptionHeading = document.createElement('h2');
  descriptionHeading.textContent = 'Description';
  descriptionHeading.className = 'mt-lg mb-md';
  infoCard.appendChild(descriptionHeading);

  const descriptionDiv = document.createElement('div');
  descriptionDiv.className = 'book-description mb-lg';

  if (book.description) {
    const descriptionText = document.createElement('p');
    descriptionText.textContent = book.description;
    descriptionDiv.appendChild(descriptionText);
  } else {
    const noDescription = document.createElement('p');
    noDescription.className = 'text-muted';
    noDescription.textContent = 'No description available for this book.';
    descriptionDiv.appendChild(noDescription);
  }

  infoCard.appendChild(descriptionDiv);

  // Subjects/Tags
  if (book.subjects && book.subjects.length > 0) {
    const subjectsHeading = document.createElement('h3');
    subjectsHeading.textContent = 'Subjects';
    subjectsHeading.className = 'mt-lg mb-md';
    infoCard.appendChild(subjectsHeading);

    const subjectsContainer = document.createElement('div');
    subjectsContainer.className = 'subject-tags';

    // Show first 15 subjects (to avoid overwhelming the page)
    const displaySubjects = book.subjects.slice(0, 15);
    displaySubjects.forEach(subject => {
      const tag = document.createElement('span');
      tag.className = 'subject-tag';
      tag.textContent = subject;
      subjectsContainer.appendChild(tag);
    });

    if (book.subjects.length > 15) {
      const moreTag = document.createElement('span');
      moreTag.className = 'subject-tag';
      moreTag.textContent = `+${book.subjects.length - 15} more`;
      subjectsContainer.appendChild(moreTag);
    }

    infoCard.appendChild(subjectsContainer);
  }

  // Add columns to container
  rightColumn.appendChild(infoCard);
  container.appendChild(leftColumn);
  container.appendChild(rightColumn);

  bookDetailsSection.appendChild(container);
}

/**
 * Show loading state
 */
function showLoading() {
  bookDetailsSection.innerHTML = `
    <div class="card text-center">
      <p class="text-muted" aria-live="polite">Loading book details...</p>
    </div>
  `;
}

/**
 * Hide loading state (called before displaying content)
 */
function hideLoading() {
  // Loading state is cleared when we set innerHTML in display/error functions
}

/**
 * Show error message with optional retry button
 * @param {string} message - Error message to display
 * @param {string} workKey - Work key to retry loading (optional)
 */
function showError(message, workKey = null) {
  bookDetailsSection.innerHTML = `
    <div class="card text-center">
      <h2>Error Loading Book</h2>
      <p class="text-muted mt-md mb-md">${escapeHtml(message)}</p>
      ${workKey ? `
        <button id="retry-button" class="btn btn-primary">Retry</button>
        <a href="search.html" class="btn btn-outline mt-md">Back to Search</a>
      ` : `
        <a href="search.html" class="btn btn-primary mt-md">Back to Search</a>
      `}
    </div>
  `;

  // Add retry functionality if work key provided
  if (workKey) {
    const retryButton = document.getElementById('retry-button');
    retryButton.addEventListener('click', () => {
      loadBookDetails(workKey);
    });
  }
}

/**
 * Show not found state (404 error)
 * @param {string} workKey - The work key that was not found
 */
function showNotFound(workKey) {
  bookDetailsSection.innerHTML = `
    <div class="card text-center">
      <h2>Book Not Found</h2>
      <p class="text-muted mt-md mb-md">
        The book you're looking for (${escapeHtml(workKey)}) could not be found in the Open Library.
      </p>
      <p class="text-small text-muted mb-lg">
        It may have been removed or the link may be incorrect.
      </p>
      <a href="search.html" class="btn btn-primary">Back to Search</a>
    </div>
  `;
}

/**
 * Escape HTML to prevent XSS attacks
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
