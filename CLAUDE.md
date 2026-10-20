# BookNest

A book search and reading-tracker website.

## Project Overview

BookNest lets users search for books and keep a personal reading list. It is built with beginner-friendly, vanilla web technologies.

## Stack & Architecture

- **Frontend**: Plain HTML, CSS, and vanilla JavaScript (no frameworks, no build step)
  - Location: `/client`
  - One shared stylesheet: `client/css/styles.css`
  - Scripts in `client/js/`
- **Backend**: Node.js + Express
  - Location: `/server`
  - Data storage: JSON file in `server/data/` (no database). This folder is gitignored.
  - `package.json` lives in the project root
  - Express also serves the `/client` folder as static files from the same server
- **External API**: Open Library (no API key required)

## Pages

All in `/client`: `index.html` (home), `search.html` (book search), `book.html` (book detail), `shelf.html` (my reading list), `about.html` (about).

## Development Rules

### Code Quality
- Keep code simple and well commented for a beginner
- Make small, focused changes
- For small fixes, edit only the affected lines. Do not rewrite whole files.
- List all files changed after each modification
- Never add libraries without my explicit approval
- Ask me before big decisions (new folders, new dependencies, changing the stack)
- Before writing code that calls Open Library, check the official Open Library API docs. Do not guess endpoints or field names.

### Design Principles
- Responsive: works on mobile and desktop (mobile first)
- Accessible: semantic HTML, labels on inputs, alt text, keyboard friendly, ARIA where needed
- One shared stylesheet for consistency, no duplicated CSS

### Security
- Never hardcode secrets or API keys
- Use environment variables for anything sensitive

### Git Workflow
- Never run `git add`, `git commit`, or `git push`. I do all git steps manually.

### Change Process
After each change:
1. List which files were modified
2. Explain how to run the application
3. Explain how to test the changes

## Running the Project

(To be documented once the server is built.)

## Project Status

Created: 2026-10-20

## Notes for AI Assistant

- This is a learning project for a beginner developer
- Prioritize clarity and educational value over optimization
- Explain technical decisions when making changes
- Keep the stack simple: no frameworks, bundlers, or complex tooling