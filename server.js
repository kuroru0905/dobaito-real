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

// 1. 全レビュー取得
app.get('/api/reviews', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reviews ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "取得失敗" });
    }
});

// 2. レビュー投稿
app.post('/api/reviews', async (req, res) => {
    const { area, shop, content } = req.body;
    try {
        await pool.query('INSERT INTO reviews (area, shop, content) VALUES ($1, $2, $3)', [area, shop, content]);
        res.json({ message: 'Success' });
    } catch (err) {
        res.status(500).json({ error: "投稿失敗" });
    }
});

// 3. 「道！」ボタン（評価）
app.post('/api/reviews/:id/like', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'UPDATE reviews SET likes = likes + 1 WHERE id = $1 RETURNING likes',
            [parseInt(id)]
        );
        res.json({ likes: result.rows[0]?.likes || 0 });
    } catch (err) {
        res.status(500).json({ error: "評価失敗" });
    }
});

// 🚀 4. 削除依頼（通報）を受け付ける窓口だ！
app.post('/api/reviews/:id/report', async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    try {
        await pool.query(
            'UPDATE reviews SET is_reported = TRUE, report_reason = $1 WHERE id = $2',
            [reason, parseInt(id)]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "通報失敗" });
    }
});

// 5. 管理者ログイン
app.post('/api/admin/login', (req, res) => {
    if (req.body.password === 'Shake0905') {
        return res.json({ success: true, token: 'Shake0905' });
    }
    res.status(401).json({ success: false });
});

// 6. レビュー削除
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
app.listen(PORT, '0.0.0.0', () => console.log(`🏔️ 稼働中！`));