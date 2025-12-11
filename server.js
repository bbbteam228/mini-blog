// server.js — простой backend на Express + sqlite3
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const DB_PATH = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(DB_PATH);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Инициализация БД
function initDb() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL,
        parent_comment_id INTEGER,
        author TEXT,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(article_id) REFERENCES articles(id)
      )
    `);
  });
}

initDb();

// API
// GET /api/articles
app.get('/api/articles', (req, res) => {
  db.all('SELECT id, title, substr(content, 1, 200) as excerpt, author, created_at FROM articles ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/articles
app.post('/api/articles', (req, res) => {
  const { title, content, author } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'title and content required' });
  const stmt = db.prepare('INSERT INTO articles (title, content, author) VALUES (?, ?, ?)');
  stmt.run(title, content, author || 'Anonymous', function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// GET /api/articles/:id (with comments)
app.get('/api/articles/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT id, title, content, author, created_at FROM articles WHERE id = ?', [id], (err, article) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!article) return res.status(404).json({ error: 'Not found' });
    db.all('SELECT id, article_id, parent_comment_id, author, content, created_at FROM comments WHERE article_id = ? ORDER BY created_at ASC', [id], (err2, comments) => {
      if (err2) return res.status(500).json({ error: err2.message });
      // Build simple nested structure (parent -> replies)
      const map = {};
      comments.forEach(c => { c.replies = []; map[c.id] = c; });
      const roots = [];
      comments.forEach(c => {
        if (c.parent_comment_id) {
          const p = map[c.parent_comment_id];
          if (p) p.replies.push(c);
          else roots.push(c); // fallback
        } else {
          roots.push(c);
        }
      });
      res.json({ article, comments: roots });
    });
  });
});

// POST /api/articles/:id/comments (add comment to article)
app.post('/api/articles/:id/comments', (req, res) => {
  const article_id = req.params.id;
  const { author, content } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  const stmt = db.prepare('INSERT INTO comments (article_id, parent_comment_id, author, content) VALUES (?, NULL, ?, ?)');
  stmt.run(article_id, author || 'Anonymous', content, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// POST /api/comments/:id/replies (reply to a comment)
app.post('/api/comments/:id/replies', (req, res) => {
  const parentId = req.params.id;
  const { author, content } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  // find article_id for parent
  db.get('SELECT article_id FROM comments WHERE id = ?', [parentId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Parent comment not found' });
    const article_id = row.article_id;
    const stmt = db.prepare('INSERT INTO comments (article_id, parent_comment_id, author, content) VALUES (?, ?, ?, ?)');
    stmt.run(article_id, parentId, author || 'Anonymous', content, function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ id: this.lastID });
    });
  });
});

// Fallback
app.use((req, res) => {
  res.status(404).send('Not found');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port', PORT));
