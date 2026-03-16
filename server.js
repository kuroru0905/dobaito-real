const express = require('express');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('.'));

let db;

// データベース初期化
(async () => {
    db = await open({
        filename: './database.db',
        driver: sqlite3.Database
    });
    // テーブル作成
    await db.exec(`CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        area TEXT,
        shop TEXT,
        content TEXT
    )`);

    // 初期データ投入（空の場合のみ）
    const count = await db.get('SELECT COUNT(*) as count FROM reviews');
    if (count.count === 0) {
        await db.run('INSERT INTO reviews (area, shop, content) VALUES (?, ?, ?)', 
            ['道央', 'プレビュー：札幌のカフェ', '地下鉄直結で冬でも余裕。まかないのパンが絶品だぜ。']);
        await db.run('INSERT INTO reviews (area, shop, content) VALUES (?, ?, ?)', 
            ['道南', 'プレビュー：登別のホテル', '雪かきはキツいが温泉に入れる。腰痛持ちは覚悟しろよ！']);
    }
})();

// ログイン画面を表示するルーティング
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// レビュー取得API
app.get('/api/reviews', async (req, res) => {
    const reviews = await db.all('SELECT * FROM reviews ORDER BY id DESC');
    res.json(reviews);
});

// レビュー投稿API
app.post('/api/reviews', async (req, res) => {
    const { area, shop, content } = req.body;
    await db.run('INSERT INTO reviews (area, shop, content) VALUES (?, ?, ?)', [area, shop, content]);
    res.json({ message: 'Success' });
});

// 管理者ログインAPI（パスワード：Shake0905）
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === 'Shake0905') {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid Password' });
    }
});

// レビュー削除API
app.delete('/api/reviews/:id', async (req, res) => {
    const { id } = req.params;
    await db.run('DELETE FROM reviews WHERE id = ?', [id]);
    res.json({ message: 'Deleted' });
});

app.listen(3000, () => {
    console.log('道バイト・リアル 稼働中！');
    console.log('一般画面: http://localhost:3000');
    console.log('管理用: http://localhost:3000/login');
});