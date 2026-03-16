const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('.'));

// データベース初期化（同期的に書けるからシンプルだぜ）
const db = new Database('./database.db');

db.exec(`CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    area TEXT,
    shop TEXT,
    content TEXT
)`);

// ログイン画面
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

// API一覧
app.get('/api/reviews', (req, res) => {
    const reviews = db.prepare('SELECT * FROM reviews ORDER BY id DESC').all();
    res.json(reviews);
});

app.post('/api/reviews', (req, res) => {
    const { area, shop, content } = req.body;
    db.prepare('INSERT INTO reviews (area, shop, content) VALUES (?, ?, ?)').run(area, shop, content);
    res.json({ message: 'Success' });
});

app.post('/api/admin/login', (req, res) => {
    if (req.body.password === 'Shake0905') return res.json({ success: true });
    res.status(401).json({ success: false });
});

app.delete('/api/reviews/:id', (req, res) => {
    db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`道バイト・リアル 稼働中！`));