/* ============================================
   BookNest API Module
   Handles all Open Library API requests
   ============================================ */

// Base URLs for Open Library API
const API_BASE_URL = 'https://openlibrary.org';
const COVERS_BASE_URL = 'https://covers.openlibrary.org/b/id';

// In-memory cache for search results
const searchCache = new Map();

/**
 * Search for books using the Open Library Search API
 * @param {string} query - Search query (title, author, ISBN, etc.)
 * @param {number} page - Page number (starts at 1)
 * @param {number} limit - Number of results per page
 * @param {Object} filters - Filter options (language, yearFrom, yearTo, hasCover)
 * @param {string} sort - Sort order (empty/'', 'new', 'old', 'title')
 * @returns {Promise<Object>} Search results with docs array and metadata
 */
async function searchBooks(query, page = 1, limit = 20, filters = {}, sort = '') {
  // Create cache key from all parameters
  const cacheKey = `${query}|${page}|${limit}|${JSON.stringify(filters)}|${sort}`;

  // Return cached result if available
  if (searchCache.has(cacheKey)) {
    console.log('Returning cached results for:', query);
    return searchCache.get(cacheKey);
  }

  // Build the search query with filters
  let searchQuery = query;

  // Add language filter (server-side - applied to entire search)
  if (filters.language) {
    searchQuery += ` language:${filters.language}`;
  }

  // Build URL with query parameters
  const params = new URLSearchParams({
    q: searchQuery,
    // Request only the fields we need
    fields: 'key,title,author_name,first_publish_year,cover_i,language,subject',
    limit: limit,
    page: page
  });

  // Add sort parameter if specified (server-side - applied to entire search)
  if (sort) {
    params.append('sort', sort);
  }

  const url = `${API_BASE_URL}/search.json?${params}`;

  try {
    console.log('Fetching from Open Library:', url);

    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Check if request was successful
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();

    // Get the full result set before client-side filtering
    let docs = data.docs || [];
    let numFound = data.num_found || 0;

    // Track if any client-side filtering was applied
    const clientSideFilters = [];

    // Apply year range filter (client-side - only affects current page)
    if (filters.yearFrom || filters.yearTo) {
      const yearFrom = filters.yearFrom ? parseInt(filters.yearFrom) : 0;
      const yearTo = filters.yearTo ? parseInt(filters.yearTo) : 9999;

      docs = docs.filter(book => {
        if (!book.first_publish_year) return false;
        return book.first_publish_year >= yearFrom && book.first_publish_year <= yearTo;
      });

      clientSideFilters.push('year range');
    }

    // Apply "has cover" filter (client-side - only affects current page)
    if (filters.hasCover) {
      docs = docs.filter(book => book.cover_i);
      clientSideFilters.push('cover images');
    }

    // Normalize the response
    const result = {
      numFound: numFound, // Original count from server
      filteredCount: docs.length, // Count after client-side filtering
      start: data.start || 0,
      docs: docs,
      query: query,
      page: page,
      limit: limit,
      filters: filters,
      sort: sort,
      clientSideFilters: clientSideFilters // Track which filters are client-side
    };

    // Cache the result
    searchCache.set(cacheKey, result);

    return result;

  } catch (error) {
    // Handle timeout error
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Get the URL for a book cover image
 * @param {number} coverId - The cover_i value from search results
 * @param {string} size - Size: 'S' (small), 'M' (medium), or 'L' (large)
 * @returns {string} Cover image URL
 */
function getCoverUrl(coverId, size = 'M') {
  if (!coverId) {
    return null;
  }
  return `${COVERS_BASE_URL}/${coverId}-${size}.jpg`;
}

/**
 * Clear the search cache (useful for debugging or memory management)
 */
function clearCache() {
  searchCache.clear();
  console.log('Search cache cleared');
}

/**
 * Get detailed information about a work (book)
 * @param {string} workKey - The work key (e.g., "/works/OL45804W" or "OL45804W")
 * @returns {Promise<Object>} Work details including title, authors, description, subjects
 */
async function getWorkDetails(workKey) {
  // Normalize the work key (add /works/ prefix if not present)
  let normalizedKey = workKey;
  if (!workKey.startsWith('/works/')) {
    normalizedKey = `/works/${workKey}`;
  }

  // Build the URL
  const url = `${API_BASE_URL}${normalizedKey}.json`;

  try {
    console.log('Fetching work details from Open Library:', url);

    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Check if request was successful
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Book not found (404)');
      }
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();

    // Parse description (can be string or object with 'value' field)
    let description = null;
    if (data.description) {
      if (typeof data.description === 'string') {
        description = data.description;
      } else if (data.description.value) {
        description = data.description.value;
      }
    }

    // Get the first cover ID if available
    const cover_id = data.covers && data.covers.length > 0
      ? data.covers[0]
      : null;

    // Fetch author names (authors are stored as references)
    let authorNames = [];
    if (data.authors && data.authors.length > 0) {
      // Fetch all author details in parallel
      const authorPromises = data.authors.map(authorRef => {
        const authorKey = authorRef.author.key;
        return getAuthorName(authorKey);
      });

      try {
        authorNames = await Promise.all(authorPromises);
      } catch (error) {
        console.warn('Failed to fetch some author names:', error);
        // Continue with whatever author names we got
        authorNames = authorNames.filter(name => name);
      }
    }

    // Normalize and return the work data
    return {
      key: data.key,
      title: data.title,
      description: description,
      authors: authorNames,
      subjects: data.subjects || [],
      first_publish_year: data.first_publish_date
        ? new Date(data.first_publish_date).getFullYear()
        : null,
      cover_id: cover_id
    };

  } catch (error) {
    // Handle timeout error
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Get an author's name from their author key
 * @param {string} authorKey - The author key (e.g., "/authors/OL23919A")
 * @returns {Promise<string>} Author name
 */
async function getAuthorName(authorKey) {
  const url = `${API_BASE_URL}${authorKey}.json`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch author: ${response.status}`);
    }

    const data = await response.json();
    return data.name || 'Unknown Author';

  } catch (error) {
    console.warn('Failed to fetch author name:', error);
    return 'Unknown Author';
  }
}

// Export functions for use in other modules
export { searchBooks, getCoverUrl, clearCache, getWorkDetails };
