/* ============================================
   BookNest Express Server
   Serves the frontend and provides shelf API endpoints
   ============================================ */

const express = require('express');
const path = require('path');
const storage = require('./storage');

// Create Express app
const app = express();

// Get port from environment or use default
const PORT = process.env.PORT || 3000;

// Middleware: Parse JSON request bodies
app.use(express.json());

// Middleware: Log all requests (helpful for debugging)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Middleware: Validate client ID for API routes
function validateClientId(req, res, next) {
  const clientId = req.headers['x-client-id'];

  if (!clientId || clientId.trim() === '') {
    return res.status(400).json({
      error: 'Missing or invalid X-Client-Id header'
    });
  }

  // Store client ID in request for use in handlers
  req.clientId = clientId;
  next();
}

// ============================================
// API Routes
// ============================================

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * GET /api/shelf - List all books on the client's shelf
 * Optional query parameter: ?status=to-read|reading|finished
 */
app.get('/api/shelf', validateClientId, (req, res) => {
  try {
    const { status } = req.query;

    // Get the client's shelf
    let shelf = storage.getClientShelf(req.clientId);

    // Filter by status if provided
    if (status) {
      const validStatuses = ['to-read', 'reading', 'finished'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Invalid status filter. Must be one of: to-read, reading, finished'
        });
      }
      shelf = shelf.filter(book => book.status === status);
    }

    res.json({
      books: shelf,
      count: shelf.length
    });

  } catch (error) {
    console.error('Error getting shelf:', error);
    res.status(500).json({
      error: 'Failed to retrieve shelf'
    });
  }
});

/**
 * POST /api/shelf - Add a book to the client's shelf
 * Body: { workKey, title, author, coverId, firstPublishYear, status, rating, notes }
 */
app.post('/api/shelf', validateClientId, (req, res) => {
  try {
    const { workKey, title, author, coverId, firstPublishYear, status, rating, notes } = req.body;

    // Validate required fields
    if (!workKey || typeof workKey !== 'string' || workKey.trim() === '') {
      return res.status(400).json({
        error: 'Missing or invalid required field: workKey'
      });
    }

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({
        error: 'Missing or invalid required field: title'
      });
    }

    // Validate status (optional, defaults to 'to-read')
    const validStatuses = ['to-read', 'reading', 'finished'];
    const bookStatus = status || 'to-read';
    if (!validStatuses.includes(bookStatus)) {
      return res.status(400).json({
        error: 'Invalid status. Must be one of: to-read, reading, finished'
      });
    }

    // Validate rating (optional, must be 0-5)
    let bookRating = rating !== undefined ? rating : 0;
    if (typeof bookRating !== 'number' || bookRating < 0 || bookRating > 5) {
      return res.status(400).json({
        error: 'Invalid rating. Must be a number between 0 and 5'
      });
    }

    // Validate notes (optional, max 500 characters)
    let bookNotes = notes || '';
    if (typeof bookNotes !== 'string') {
      return res.status(400).json({
        error: 'Invalid notes. Must be a string'
      });
    }
    if (bookNotes.length > 500) {
      return res.status(400).json({
        error: 'Notes too long. Maximum 500 characters'
      });
    }

    // Create book object
    const book = {
      workKey: workKey.trim(),
      title: title.trim(),
      author: author || 'Unknown Author',
      coverId: coverId || null,
      firstPublishYear: firstPublishYear || null,
      status: bookStatus,
      rating: bookRating,
      notes: bookNotes.trim()
    };

    // Add book to shelf
    const addedBook = storage.addBook(req.clientId, book);

    res.status(201).json({
      message: 'Book added to shelf',
      book: addedBook
    });

  } catch (error) {
    console.error('Error adding book:', error);

    // Check for duplicate error
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to add book to shelf'
    });
  }
});

/**
 * PUT /api/shelf/:workKey - Update a book on the client's shelf
 * Body: { status, rating, notes } (all optional, but at least one required)
 */
app.put('/api/shelf/:workKey', validateClientId, (req, res) => {
  try {
    const { workKey } = req.params;
    const { status, rating, notes } = req.body;

    // Validate at least one field to update
    if (status === undefined && rating === undefined && notes === undefined) {
      return res.status(400).json({
        error: 'No fields to update. Provide at least one of: status, rating, notes'
      });
    }

    const updates = {};

    // Validate status if provided
    if (status !== undefined) {
      const validStatuses = ['to-read', 'reading', 'finished'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Invalid status. Must be one of: to-read, reading, finished'
        });
      }
      updates.status = status;
    }

    // Validate rating if provided
    if (rating !== undefined) {
      if (typeof rating !== 'number' || rating < 0 || rating > 5) {
        return res.status(400).json({
          error: 'Invalid rating. Must be a number between 0 and 5'
        });
      }
      updates.rating = rating;
    }

    // Validate notes if provided
    if (notes !== undefined) {
      if (typeof notes !== 'string') {
        return res.status(400).json({
          error: 'Invalid notes. Must be a string'
        });
      }
      if (notes.length > 500) {
        return res.status(400).json({
          error: 'Notes too long. Maximum 500 characters'
        });
      }
      updates.notes = notes.trim();
    }

    // Update the book
    const updatedBook = storage.updateBook(req.clientId, workKey, updates);

    res.json({
      message: 'Book updated',
      book: updatedBook
    });

  } catch (error) {
    console.error('Error updating book:', error);

    // Check for not found error
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to update book'
    });
  }
});

/**
 * DELETE /api/shelf/:workKey - Remove a book from the client's shelf
 */
app.delete('/api/shelf/:workKey', validateClientId, (req, res) => {
  try {
    const { workKey } = req.params;

    // Remove the book
    storage.removeBook(req.clientId, workKey);

    res.json({
      message: 'Book removed from shelf'
    });

  } catch (error) {
    console.error('Error removing book:', error);

    // Check for not found error
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to remove book from shelf'
    });
  }
});

// ============================================
// Serve Static Frontend Files
// ============================================

// Serve all files from the /client directory
const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath));

// Fallback: serve index.html for any unmatched routes (SPA-like behavior)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// ============================================
// Start Server
// ============================================

app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  BookNest Server Started');
  console.log('========================================');
  console.log(`  Local:    http://localhost:${PORT}`);
  console.log(`  Time:     ${new Date().toISOString()}`);
  console.log('========================================');
  console.log('');
});
