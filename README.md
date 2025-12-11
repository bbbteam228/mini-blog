# Mini-blog (Express + SQLite, vanilla frontend)

## How to run

1. Install dependencies:

```
npm install
```

2. Start server:

```
node server.js
```

3. Open browser: http://localhost:3000

## API

- `GET /api/articles` - list articles
- `POST /api/articles` - create article `{ title, content, author }`
- `GET /api/articles/:id` - get article with comments
- `POST /api/articles/:id/comments` - add comment `{ author, content }`
- `POST /api/comments/:id/replies` - add reply to comment `{ author, content }`

`data.db` (SQLite) will be created automatically.
