/* ============================================
   BookNest Search Page
   Handles search UI, form submission, and results display
   ============================================ */

import { searchBooks, getCoverUrl } from './api.js';
import { isBookOnShelf, addToShelf } from './shelfApi.js';

// DOM elements
let searchForm;
let searchInput;
let searchResults;
let loadingIndicator;
let paginationContainer;
let languageFilter;
let sortSelect;
let yearFromInput;
let yearToInput;
let hasCoverCheckbox;
let clearFiltersButton;

// Current search state
let currentQuery = '';
let currentPage = 1;
let currentFilters = {};
let currentSort = '';
const RESULTS_PER_PAGE = 20;

/**
 * Initialize the search page when DOM is ready
 */
function init() {
  // Get DOM elements
  searchForm = document.getElementById('search-form');
  searchInput = document.getElementById('search-input');
  searchResults = document.getElementById('search-results');
  languageFilter = document.getElementById('language-filter');
  sortSelect = document.getElementById('sort-select');
  yearFromInput = document.getElementById('year-from');
  yearToInput = document.getElementById('year-to');
  hasCoverCheckbox = document.getElementById('has-cover');
  clearFiltersButton = document.getElementById('clear-filters');

  // Create loading indicator (hidden by default)
  createLoadingIndicator();

  // Create pagination container
  paginationContainer = document.createElement('div');
  paginationContainer.id = 'pagination';
  paginationContainer.className = 'text-center mt-xl';
  searchResults.parentNode.insertBefore(paginationContainer, searchResults.nextSibling);

  // Set up event listeners
  searchForm.addEventListener('submit', handleSearch);
  clearFiltersButton.addEventListener('click', clearFilters);

  // Check URL for existing parameters and restore state
  loadStateFromUrl();
}

/**
 * Create a loading indicator with aria-live announcement
 */
function createLoadingIndicator() {
  loadingIndicator = document.createElement('div');
  loadingIndicator.id = 'loading-indicator';
  loadingIndicator.className = 'card text-center hidden';
  loadingIndicator.setAttribute('aria-live', 'polite');
  loadingIndicator.innerHTML = '<p>Searching for books...</p>';
  searchResults.parentNode.insertBefore(loadingIndicator, searchResults);
}

/**
 * Load state from URL parameters (query, filters, sort)
 */
function loadStateFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);

  // Get query
  const queryFromUrl = urlParams.get('q');
  if (queryFromUrl) {
    searchInput.value = queryFromUrl;
    currentQuery = queryFromUrl;
  }

  // Get filters
  const language = urlParams.get('language');
  if (language) {
    languageFilter.value = language;
  }

  const yearFrom = urlParams.get('yearFrom');
  if (yearFrom) {
    yearFromInput.value = yearFrom;
  }

  const yearTo = urlParams.get('yearTo');
  if (yearTo) {
    yearToInput.value = yearTo;
  }

  const hasCover = urlParams.get('hasCover');
  if (hasCover === 'true') {
    hasCoverCheckbox.checked = true;
  }

  // Get sort
  const sort = urlParams.get('sort');
  if (sort) {
    sortSelect.value = sort;
    currentSort = sort;
  }

  // Perform search if query exists
  if (queryFromUrl) {
    // Gather current filters
    gatherFilters();
    performSearch(queryFromUrl, 1);
  }
}

/**
 * Gather current filter values from form
 */
function gatherFilters() {
  currentFilters = {};

  if (languageFilter.value) {
    currentFilters.language = languageFilter.value;
  }

  if (yearFromInput.value) {
    currentFilters.yearFrom = yearFromInput.value;
  }

  if (yearToInput.value) {
    currentFilters.yearTo = yearToInput.value;
  }

  if (hasCoverCheckbox.checked) {
    currentFilters.hasCover = true;
  }

  currentSort = sortSelect.value;
}

/**
 * Update URL with all current parameters
 */
function updateUrl() {
  const params = new URLSearchParams();
  params.set('q', currentQuery);

  // Add filters to URL
  if (currentFilters.language) {
    params.set('language', currentFilters.language);
  }
  if (currentFilters.yearFrom) {
    params.set('yearFrom', currentFilters.yearFrom);
  }
  if (currentFilters.yearTo) {
    params.set('yearTo', currentFilters.yearTo);
  }
  if (currentFilters.hasCover) {
    params.set('hasCover', 'true');
  }

  // Add sort to URL
  if (currentSort) {
    params.set('sort', currentSort);
  }

  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState({}, '', newUrl);
}

/**
 * Clear all filters and reset form
 */
function clearFilters() {
  languageFilter.value = '';
  sortSelect.value = '';
  yearFromInput.value = '';
  yearToInput.value = '';
  hasCoverCheckbox.checked = false;

  currentFilters = {};
  currentSort = '';

  // If there's an active search, re-run it without filters
  if (currentQuery) {
    updateUrl();
    performSearch(currentQuery, 1);
  }
}

/**
 * Handle search form submission
 * @param {Event} event - Form submit event
 */
function handleSearch(event) {
  event.preventDefault();

  const query = searchInput.value.trim();

  // Validate input - don't search if empty
  if (!query) {
    showError('Please enter a search query');
    return;
  }

  // Reset to page 1 for new searches
  currentQuery = query;
  currentPage = 1;

  // Gather filters and sort
  gatherFilters();

  // Update URL with all parameters
  updateUrl();

  // Perform the search
  performSearch(query, 1);
}

/**
 * Perform the actual search API call
 * @param {string} query - Search query
 * @param {number} page - Page number
 */
async function performSearch(query, page) {
  // Show loading indicator
  showLoading();

  try {
    // Call the API with filters and sort
    const results = await searchBooks(query, page, RESULTS_PER_PAGE, currentFilters, currentSort);

    // Hide loading indicator
    hideLoading();

    // Display results
    displayResults(results);

  } catch (error) {
    // Hide loading indicator
    hideLoading();

    // Show error message with retry option
    showError(error.message || 'An error occurred while searching. Please try again.', query, page);
  }
}

/**
 * Display search results as cards
 * @param {Object} results - Search results from API
 */
async function displayResults(results) {
  // Clear previous results
  searchResults.innerHTML = '';
  paginationContainer.innerHTML = '';

  // Handle no results found (either from server or after client-side filtering)
  if (results.numFound === 0 || results.docs.length === 0) {
    searchResults.innerHTML = `
      <div class="card text-center">
        <p class="text-muted">No books found for "${results.query}"${hasActiveFilters() ? ' with the selected filters' : ''}</p>
        <p class="text-small mt-md">Try different keywords${hasActiveFilters() ? ' or clear some filters' : ' or check your spelling'}</p>
        ${hasActiveFilters() ? '<button id="clear-from-results" class="btn btn-outline mt-md">Clear Filters</button>' : ''}
      </div>
    `;

    // Add clear filters button handler
    const clearButton = document.getElementById('clear-from-results');
    if (clearButton) {
      clearButton.addEventListener('click', clearFilters);
    }
    return;
  }

  // Show client-side filter warning if applicable
  if (results.clientSideFilters && results.clientSideFilters.length > 0) {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'filter-info';
    warningDiv.innerHTML = `
      <strong>Note:</strong> Filters for ${results.clientSideFilters.join(' and ')} only apply to the current page of results, not the entire search.
    `;
    searchResults.appendChild(warningDiv);
  }

  // Show active filters
  if (hasActiveFilters()) {
    const filtersDiv = document.createElement('div');
    filtersDiv.className = 'mb-md';
    filtersDiv.innerHTML = '<strong>Active filters:</strong>';

    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'active-filters';

    if (currentFilters.language) {
      const tag = document.createElement('span');
      tag.className = 'filter-tag';
      tag.textContent = `Language: ${getLanguageName(currentFilters.language)}`;
      tagsDiv.appendChild(tag);
    }

    if (currentFilters.yearFrom || currentFilters.yearTo) {
      const tag = document.createElement('span');
      tag.className = 'filter-tag';
      const from = currentFilters.yearFrom || 'any';
      const to = currentFilters.yearTo || 'now';
      tag.textContent = `Years: ${from} - ${to}`;
      tagsDiv.appendChild(tag);
    }

    if (currentFilters.hasCover) {
      const tag = document.createElement('span');
      tag.className = 'filter-tag';
      tag.textContent = 'Has cover image';
      tagsDiv.appendChild(tag);
    }

    if (currentSort) {
      const tag = document.createElement('span');
      tag.className = 'filter-tag';
      tag.textContent = `Sort: ${getSortName(currentSort)}`;
      tagsDiv.appendChild(tag);
    }

    filtersDiv.appendChild(tagsDiv);
    searchResults.appendChild(filtersDiv);
  }

  // Show result count
  const resultInfo = document.createElement('p');
  resultInfo.className = 'text-muted mb-lg';

  // Show both total and filtered count if different
  if (results.filteredCount < results.docs.length || results.clientSideFilters.length > 0) {
    resultInfo.textContent = `Showing ${results.docs.length} of ${results.numFound.toLocaleString()} results for "${results.query}"`;
  } else {
    resultInfo.textContent = `Found ${results.numFound.toLocaleString()} results for "${results.query}"`;
  }

  searchResults.appendChild(resultInfo);

  // Create grid container for book cards
  const grid = document.createElement('div');
  grid.className = 'grid grid-4';

  // Create a card for each book (now async)
  for (const book of results.docs) {
    const card = await createBookCard(book);
    grid.appendChild(card);
  }

  searchResults.appendChild(grid);

  // Add pagination if needed
  if (results.numFound > RESULTS_PER_PAGE) {
    createPagination(results);
  }
}

/**
 * Handle adding a book to the shelf from search results
 * @param {HTMLElement} button - The button that was clicked
 * @param {Object} bookData - Book data to add
 */
async function handleAddToShelf(button, bookData) {
  // Show loading state
  button.disabled = true;
  button.textContent = 'Adding...';

  try {
    // Add book with default status 'to-read'
    await addToShelf({
      ...bookData,
      status: 'to-read',
      rating: 0,
      notes: ''
    });

    // Update button to show success
    button.textContent = '✓ Added to Shelf';
    button.classList.remove('btn-outline');
    button.classList.add('btn-secondary');

    // After 1 second, change to "On Shelf"
    setTimeout(() => {
      button.textContent = '✓ On Shelf';
    }, 1000);

  } catch (error) {
    console.error('Error adding book to shelf:', error);

    // Show error state
    button.textContent = 'Failed';
    button.disabled = false;

    // Show error message
    alert(error.message || 'Failed to add book to shelf. Please try again.');

    // Reset button after 2 seconds
    setTimeout(() => {
      button.textContent = '+ Add to Shelf';
    }, 2000);
  }
}

/**
 * Check if any filters or sort are active
 * @returns {boolean}
 */
function hasActiveFilters() {
  return Object.keys(currentFilters).length > 0 || currentSort !== '';
}

/**
 * Get human-readable language name from code
 * @param {string} code - Language code
 * @returns {string}
 */
function getLanguageName(code) {
  const names = {
    'eng': 'English',
    'spa': 'Spanish',
    'fre': 'French',
    'ger': 'German',
    'ita': 'Italian',
    'por': 'Portuguese',
    'jpn': 'Japanese',
    'chi': 'Chinese'
  };
  return names[code] || code;
}

/**
 * Get human-readable sort name from value
 * @param {string} sort - Sort value
 * @returns {string}
 */
function getSortName(sort) {
  const names = {
    'new': 'Newest first',
    'old': 'Oldest first',
    'title': 'Title A-Z'
  };
  return names[sort] || 'Relevance';
}

/**
 * Create a card element for a single book
 * @param {Object} book - Book data from API
 * @returns {HTMLElement} Book card element
 */
async function createBookCard(book) {
  const card = document.createElement('article');
  card.className = 'card';

  // Get cover image URL or use placeholder
  const coverUrl = book.cover_i
    ? getCoverUrl(book.cover_i, 'M')
    : null;

  // Build author names (can be multiple authors)
  const authors = book.author_name
    ? book.author_name.join(', ')
    : 'Unknown Author';

  // Publication year
  const year = book.first_publish_year
    ? `(${book.first_publish_year})`
    : '';

  // Check if book is already on shelf
  const onShelf = await isBookOnShelf(book.key);

  // Create card HTML
  card.innerHTML = `
    <div class="book-cover mb-md">
      ${coverUrl
        ? `<img src="${coverUrl}" alt="Cover of ${book.title}" loading="lazy">`
        : `<div class="cover-placeholder">📖</div>`
      }
    </div>
    <h3 class="card-title">${escapeHtml(book.title)}</h3>
    <p class="card-text text-small">
      <strong>By:</strong> ${escapeHtml(authors)}<br>
      ${year ? `<strong>Year:</strong> ${year}` : ''}
    </p>
    <div class="flex gap-sm mt-md" style="flex-wrap: wrap;">
      <a href="book.html?key=${book.key}" class="btn btn-primary btn-small" style="flex: 1;">View Details</a>
      ${onShelf
        ? `<button class="btn btn-secondary btn-small" disabled style="flex: 1;">✓ On Shelf</button>`
        : `<button class="btn-add-to-shelf btn btn-outline btn-small" data-book='${JSON.stringify({
            workKey: book.key,
            title: book.title,
            author: authors,
            coverId: book.cover_i || null,
            firstPublishYear: book.first_publish_year || null
          })}' style="flex: 1;">+ Add to Shelf</button>`
      }
    </div>
  `;

  // Add event listener for "Add to Shelf" button
  const addButton = card.querySelector('.btn-add-to-shelf');
  if (addButton) {
    addButton.addEventListener('click', async (e) => {
      e.preventDefault();
      const bookData = JSON.parse(addButton.dataset.book);
      await handleAddToShelf(addButton, bookData);
    });
  }

  return card;
}

/**
 * Create pagination controls
 * @param {Object} results - Search results with pagination metadata
 */
function createPagination(results) {
  const totalPages = Math.ceil(results.numFound / results.limit);
  const currentPage = results.page;

  const paginationDiv = document.createElement('div');
  paginationDiv.className = 'flex-center gap-md flex-wrap';

  // Previous button
  if (currentPage > 1) {
    const prevButton = document.createElement('button');
    prevButton.className = 'btn btn-outline';
    prevButton.textContent = '← Previous';
    prevButton.addEventListener('click', () => {
      goToPage(currentPage - 1);
    });
    paginationDiv.appendChild(prevButton);
  }

  // Page info
  const pageInfo = document.createElement('span');
  pageInfo.className = 'text-muted';
  pageInfo.textContent = `Page ${currentPage} of ${totalPages.toLocaleString()}`;
  paginationDiv.appendChild(pageInfo);

  // Next button
  if (currentPage < totalPages) {
    const nextButton = document.createElement('button');
    nextButton.className = 'btn btn-outline';
    nextButton.textContent = 'Next →';
    nextButton.addEventListener('click', () => {
      goToPage(currentPage + 1);
    });
    paginationDiv.appendChild(nextButton);
  }

  paginationContainer.appendChild(paginationDiv);
}

/**
 * Navigate to a specific page of results
 * @param {number} page - Page number to navigate to
 */
function goToPage(page) {
  currentPage = page;

  // Scroll to top of results
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Perform search with new page
  performSearch(currentQuery, page);
}

/**
 * Show loading indicator
 */
function showLoading() {
  loadingIndicator.classList.remove('hidden');
  searchResults.innerHTML = '';
  paginationContainer.innerHTML = '';
}

/**
 * Hide loading indicator
 */
function hideLoading() {
  loadingIndicator.classList.add('hidden');
}

/**
 * Show error message with optional retry button
 * @param {string} message - Error message to display
 * @param {string} query - Query to retry (optional)
 * @param {number} page - Page to retry (optional)
 */
function showError(message, query = null, page = null) {
  searchResults.innerHTML = `
    <div class="card text-center">
      <p class="text-muted mb-md">${escapeHtml(message)}</p>
      ${query ? `
        <button id="retry-button" class="btn btn-primary">Retry Search</button>
      ` : ''}
    </div>
  `;

  // Add retry functionality if query provided
  if (query) {
    const retryButton = document.getElementById('retry-button');
    retryButton.addEventListener('click', () => {
      performSearch(query, page || 1);
    });
  }
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
