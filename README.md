# 📚 BookNest

BookNest is a book search and reading-tracker web application that lets users search millions of books from the Open Library collection and maintain a personal reading list. Built with vanilla HTML, CSS, and JavaScript on the frontend and Node.js/Express on the backend, it stores user data in JSON files with client-specific separation using localStorage-based IDs. Users can search for books with filters and sorting, view detailed book information, and manage their shelf with reading statuses, star ratings, and personal notes.

---

## 🌟 Features

- **Search Books**: Search millions of books by title, author, or ISBN from Open Library
- **Advanced Filtering**: Filter by language, publication year range, and books with cover images
- **Sorting Options**: Sort results by relevance, newest/oldest, or title A-Z
- **Book Details**: View comprehensive book information including description, authors, publication year, and subject tags
- **Personal Shelf**: Add books to your reading list with three status categories:
  - Want to Read
  - Currently Reading
  - Finished
- **Rating System**: Rate books with 1-5 stars
- **Personal Notes**: Add up to 500 characters of notes per book
- **Responsive Design**: Works seamlessly on mobile (360px), tablet (768px), and desktop (1280px+)
- **Accessible**: WCAG AA compliant with keyboard navigation, ARIA labels, and proper color contrast
- **No Login Required**: Each browser gets a unique ID stored in localStorage

---

## 🛠️ Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Custom design system with CSS variables
- **Vanilla JavaScript** - ES6 modules, no frameworks

### Backend
- **Node.js** - Runtime environment
- **Express** - Web server framework
- **JSON File Storage** - Simple file-based data persistence

### External API
- **Open Library API** - Book search and metadata

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js (v14 or higher)

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd BookNest
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

The server will:
- Serve the frontend from `/client`
- Provide API endpoints at `/api/*`
- Create a `server/data/shelves.json` file automatically on first use
- Run on port 3000 by default (configurable via `PORT` environment variable)

---

## 📁 Project Structure

```
BookNest/
├── client/                  # Frontend files
│   ├── css/
│   │   └── styles.css      # Shared stylesheet with design system
│   ├── js/
│   │   ├── api.js          # Open Library API integration
│   │   ├── shelfApi.js     # Backend API wrapper with client ID management
│   │   ├── search.js       # Search page functionality
│   │   ├── book.js         # Book detail page functionality
│   │   └── shelf.js        # Shelf management functionality
│   ├── index.html          # Home page
│   ├── search.html         # Book search page
│   ├── book.html           # Book detail page
│   ├── shelf.html          # Personal shelf page
│   ├── about.html          # About page
│   └── favicon.svg         # Site favicon
├── server/
│   ├── server.js           # Express server
│   ├── storage.js          # JSON file storage module
│   └── data/
│       └── shelves.json    # User data (auto-created, gitignored)
├── package.json            # Dependencies and scripts
├── .gitignore
└── README.md
```

---

## 🔌 API Endpoints

All `/api/shelf` endpoints require an `X-Client-Id` header (automatically handled by the frontend).

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| `GET` | `/api/health` | Health check | None | `{ status, timestamp, uptime }` |
| `GET` | `/api/shelf` | Get all books on shelf | None | `{ books: [...], count: n }` |
| `GET` | `/api/shelf?status=to-read` | Filter by status | None | `{ books: [...], count: n }` |
| `POST` | `/api/shelf` | Add book to shelf | `{ workKey, title, author, coverId?, firstPublishYear?, status?, rating?, notes? }` | `{ message, book }` |
| `PUT` | `/api/shelf/:workKey` | Update book | `{ status?, rating?, notes? }` | `{ message, book }` |
| `DELETE` | `/api/shelf/:workKey` | Remove book | None | `{ message }` |

### Book Object Schema
```json
{
  "workKey": "/works/OL45804W",
  "title": "Fantastic Mr. Fox",
  "author": "Roald Dahl",
  "coverId": 6498519,
  "firstPublishYear": 1970,
  "status": "to-read",       // "to-read" | "reading" | "finished"
  "rating": 4,               // 0-5
  "notes": "Looks interesting!",
  "addedAt": "2026-10-20T07:30:00.000Z"
}
```

---

## 📊 Data Source

Book data is provided by **[Open Library](https://openlibrary.org/)**, an open, editable library catalog building towards a web page for every book ever published. Open Library is a project of the Internet Archive.

### API Endpoints Used
- **Search**: `https://openlibrary.org/search.json`
- **Work Details**: `https://openlibrary.org/works/{id}.json`
- **Author Details**: `https://openlibrary.org/authors/{id}.json`
- **Cover Images**: `https://covers.openlibrary.org/b/id/{id}-{size}.jpg`

---

## ⚠️ Known Limitations

1. **No Authentication**: The app uses a random client ID stored in browser localStorage. Clearing browser data will reset your shelf.

2. **Local Storage Only**: Each browser/device has its own separate shelf. Data is not synced across devices.

3. **Client-Side Filters**: Year range and "has cover" filters only apply to the current page of results (20 books), not the entire search. Language and sort filters are applied server-side by Open Library.

4. **Shared Hosting**: If deployed to shared hosting, the JSON file may be reset during deployments or server restarts. For production use, consider adding a database.

5. **Search Rate Limiting**: Open Library API has rate limits. Excessive searching may result in temporary blocks.

6. **Cache Behavior**: Search results are cached in memory per session. Refresh the page to clear the cache.

---

## 🎯 Future Ideas

- [ ] User authentication and cloud storage
- [ ] Book recommendations based on shelf
- [ ] Reading statistics and charts
- [ ] Import/export shelf data (CSV, JSON)
- [ ] Book clubs and shared shelves
- [ ] Reading challenges and goals
- [ ] Goodreads import
- [ ] Dark mode toggle
- [ ] Advanced search with more filters
- [ ] Book reviews and public ratings
- [ ] Mobile app (React Native/PWA)
- [ ] Integration with library systems (availability checking)

---

## 🚀 Deployment

### Prerequisites for Deployment
- Node.js 14.0.0 or higher
- npm (comes with Node.js)

### Deployment Checklist
✅ **Port Configuration**: Server reads from `process.env.PORT` (defaults to 3000)  
✅ **No Build Step**: Plain HTML/CSS/JS - no compilation needed  
✅ **Static Files**: Server serves `/client` folder automatically  
✅ **Data Directory**: `server/data/` is auto-created on first run  
✅ **No Secrets**: Open Library API requires no authentication  
✅ **Single Command**: `npm start` launches everything  

### Generic Node Hosting Services

Works with **Heroku, Render, Railway, Fly.io, Vercel, Netlify Functions, DigitalOcean App Platform, AWS Elastic Beanstalk, Google Cloud Run, Azure App Service**, and similar platforms.

#### Required Settings

| Setting | Value |
|---------|-------|
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Port** | Auto-detected from `PORT` environment variable |
| **Node Version** | 14.0.0 or higher (specified in `package.json`) |
| **Root Directory** | `.` (project root) |

#### Environment Variables
No environment variables are required. Optional:
- `PORT` - Server port (auto-provided by most platforms)

#### Example: Deploying to Render

1. Connect your GitHub repository
2. Create new **Web Service**
3. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
4. Deploy

#### Example: Deploying to Heroku

```bash
# Install Heroku CLI and login
heroku login

# Create app
heroku create your-booknest-app

# Deploy
git push heroku main

# Open
heroku open
```

#### Example: Deploying to Railway

1. Connect GitHub repository
2. Railway auto-detects Node.js
3. Automatically uses `npm install` and `npm start`
4. Deploy

### Post-Deployment Notes

⚠️ **Data Persistence**: User data is stored in `server/data/shelves.json`. On platforms with ephemeral filesystems (Heroku, some serverless platforms), this file may be reset on restart. For production, consider:
- Using a managed database (PostgreSQL, MongoDB)
- Mounting a persistent volume
- Using cloud storage (S3, Google Cloud Storage)

⚠️ **Rate Limiting**: Open Library API has rate limits. For high-traffic deployments, consider implementing caching or a proxy.

---

## 📸 Screenshots

<!-- TODO: Add screenshots here -->
```
[Home Page]
[Search Results]
[Book Detail Page]
[My Shelf]
```

---

## 🌐 Live Demo

<!-- TODO: Add live demo link here -->
**Live Demo:** [Coming Soon]

---

## 📄 License

MIT

---

## 🙏 Acknowledgments

- [Open Library](https://openlibrary.org/) for providing free access to book data
- [Internet Archive](https://archive.org/) for hosting Open Library

---

**Built with ❤️ using vanilla web technologies**
