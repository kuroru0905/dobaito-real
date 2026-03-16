const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('.'));

// 🚀 IPv4対応・Pooler経由の接続文字列
const connectionString = "postgresql://postgres.sktxupbkynhlddgjxsvr:Shake0905-db@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres";

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

// データベース初期化
(async () => {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS reviews (
            id SERIAL PRIMARY KEY,
            area TEXT NOT NULL,
            shop TEXT NOT NULL,
            content TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log("✅ Supabase PostgreSQL 接続成功！");
    } catch (err) {
        console.error("❌ 接続エラー:", err);
    }
})();

// API: 全レビュー取得
app.get('/api/reviews', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reviews ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "取得失敗" });
    }
});

// API: レビュー投稿
app.post('/api/reviews', async (req, res) => {
    const { area, shop, content } = req.body;
    try {
        await pool.query('INSERT INTO reviews (area, shop, content) VALUES ($1, $2, $3)', [area, shop, content]);
        res.json({ message: 'Success' });
    } catch (err) {
        res.status(500).json({ error: "投稿失敗" });
    }
});

// 🚀 API: 「道！」ボタン（評価カウントアップ）
app.post('/api/reviews/:id/like', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'UPDATE reviews SET likes = likes + 1 WHERE id = $1 RETURNING likes',
            [parseInt(id)]
        );
        res.json({ likes: result.rows[0]?.likes || 0 });
    } catch (err) {
        console.error("評価エラー:", err);
        res.status(500).json({ error: "評価失敗" });
    }
});

// API: 管理者ログイン
app.post('/api/admin/login', (req, res) => {
    if (req.body.password === 'Shake0905') {
        return res.json({ success: true, token: 'Shake0905' });
    }
    res.status(401).json({ success: false });
});

// API: レビュー削除
app.delete('/api/reviews/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM reviews WHERE id = $1', [parseInt(id)]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: "削除失敗" });
    }
});

app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🏔️ 道バイト・リアル 稼働中！`));