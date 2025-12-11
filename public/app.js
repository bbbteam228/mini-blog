const api = {
  list: () => fetch('/api/articles').then(r => r.json()),
  create: (data) => fetch('/api/articles', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r => r.json()),
  get: (id) => fetch('/api/articles/' + id).then(r => r.json()),
  addComment: (articleId, data) => fetch(`/api/articles/${articleId}/comments`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r=>r.json()),
  reply: (commentId, data) => fetch(`/api/comments/${commentId}/replies`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r=>r.json()),
};

function renderArticles() {
  api.list().then(list => {
    const container = document.getElementById('articles');
    container.innerHTML = '';
    list.forEach(a => {
      const el = document.createElement('div'); el.className = 'article';
      el.innerHTML = `<strong>${escape(a.title)}</strong> <em>by ${escape(a.author||'')}</em><p>${escape(a.excerpt)}</p><button data-id="${a.id}">Open</button>`;
      el.querySelector('button').addEventListener('click', () => openArticle(a.id));
      container.appendChild(el);
    });
  });
}

function openArticle(id) {
  api.get(id).then(payload => {
    const v = document.getElementById('article-view');
    v.innerHTML = '';
    const art = payload.article;
    const h = document.createElement('div');
    h.innerHTML = `<h2>${escape(art.title)}</h2><p><em>by ${escape(art.author)}</em></p><p>${escape(art.content)}</p><hr/>`;
    v.appendChild(h);

    // comment form
    const form = document.createElement('div');
    form.innerHTML = `
      <h3>Add comment</h3>
      <input id="c-author" placeholder="Author" /> <br/>
      <textarea id="c-content" rows="3" style="width:70%"></textarea><br/>
      <button id="c-add">Add Comment</button>
    `;
    v.appendChild(form);
    form.querySelector('#c-add').addEventListener('click', () => {
      const author = form.querySelector('#c-author').value;
      const content = form.querySelector('#c-content').value;
      api.addComment(id, { author, content }).then(() => openArticle(id));
    });

    // comments
    const comWrap = document.createElement('div');
    comWrap.innerHTML = '<h3>Comments</h3>';
    payload.comments.forEach(c => {
      const ce = renderComment(c, id);
      comWrap.appendChild(ce);
    });
    v.appendChild(comWrap);
  }).catch(err => { console.error(err); alert('Failed to load article'); });
}

function renderComment(c, articleId) {
  const el = document.createElement('div');
  el.className = 'comment';
  el.innerHTML = `<strong>${escape(c.author)}</strong> <div>${escape(c.content)}</div>`;
  // reply form (toggle)
  const btn = document.createElement('button'); btn.textContent = 'Reply';
  const replyBox = document.createElement('div');
  replyBox.style.display = 'none';
  replyBox.innerHTML = `
    <input class="r-author" placeholder="Author" /><br/>
    <textarea class="r-content" rows="2" style="width:60%"></textarea><br/>
    <button class="r-send">Send reply</button>
  `;
  btn.addEventListener('click', () => { replyBox.style.display = replyBox.style.display === 'none' ? 'block' : 'none'; });
  el.appendChild(btn);
  el.appendChild(replyBox);
  el.querySelector('.r-send').addEventListener('click', () => {
    const author = replyBox.querySelector('.r-author').value;
    const content = replyBox.querySelector('.r-content').value;
    fetch(`/api/comments/${c.id}/replies`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ author, content }) })
      .then(r => r.json()).then(() => openArticle(articleId));
  });

  // replies
  if (c.replies && c.replies.length) {
    c.replies.forEach(rp => {
      const rdiv = document.createElement('div'); rdiv.className = 'comment reply';
      rdiv.innerHTML = `<strong>${escape(rp.author)}</strong> <div>${escape(rp.content)}</div>`;
      el.appendChild(rdiv);
    });
  }
  return el;
}

function escape(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// add article
document.getElementById('add-article').addEventListener('click', () => {
  const title = document.getElementById('a-title').value;
  const author = document.getElementById('a-author').value;
  const content = document.getElementById('a-content').value;
  api.create({ title, author, content }).then(() => {
    document.getElementById('a-title').value=''; document.getElementById('a-content').value='';
    renderArticles();
  }).catch(e => { console.error(e); alert('Failed to create article') });
});

renderArticles();
