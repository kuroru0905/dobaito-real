const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('.'));

// 🚀 IPv4対応版の接続文字列（pooler.supabase.com を使用）
// これならRenderの無料サーバーからでも確実に繋がるぜ！
const connectionString = "postgresql://postgres:Shake0905-db@db.sktxupbkynhlddgjxsvr.pooler.supabase.com:5432/postgres";

const pool = new Pool({
    connectionString: connectionString,
    ssl: { 
        rejectUnauthorized: false 
    }
});

// データベースのテーブル作成
(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                area TEXT NOT NULL,
                shop TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Supabase PostgreSQL に接続成功！IPv4通信で安定稼働中だぜ。");
    } catch (err) {
        console.error("❌ データベース接続エラーだ。通信設定を確認しろ！:", err);
    }
})();

// 1. ログイン画面を表示
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// 2. 全レビューを取得（新着順）
app.get('/api/reviews', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reviews ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error("データ取得エラー:", err);
        res.status(500).json({ error: "データ取得に失敗したぜ" });
    }
});

// 3. レビューを投稿
app.post('/api/reviews', async (req, res) => {
    const { area, shop, content } = req.body;
    try {
        await pool.query(
            'INSERT INTO reviews (area, shop, content) VALUES ($1, $2, $3)',
            [area, shop, content]
        );
        res.json({ message: 'Success' });
    } catch (err) {
        console.error("投稿エラー:", err);
        res.status(500).json({ error: "投稿に失敗したぜ" });
    }
});

// 4. 管理者ログイン（パスワード：Shake0905）
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === 'Shake0905') {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

// 5. レビューを削除（管理者専用）
app.delete('/api/reviews/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM reviews WHERE id = $1', [id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error("削除エラー:", err);
        res.status(500).json({ error: "削除に失敗したぜ" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🏔️ 道バイト・リアル 稼働中！`);
});