const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('.'));

// 🚀 ついに手に入れた IPv4対応・Pooler経由の接続文字列だ！
// ポートが 6543 になっているのがポイントだぜ。
const connectionString = "postgresql://postgres.sktxupbkynhlddgjxsvr:Shake0905-db@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres";

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
        console.log("✅ 【祝】Supabase PostgreSQL に接続成功！データは永遠に不滅だぜ！");
    } catch (err) {
        console.error("❌ 接続エラー。だがお前なら超えられる！:", err);
    }
})();

// API: 全レビューを取得
app.get('/api/reviews', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reviews ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "取得失敗" });
    }
});

// API: レビューを投稿
app.post('/api/reviews', async (req, res) => {
    const { area, shop, content } = req.body;
    try {
        await pool.query(
            'INSERT INTO reviews (area, shop, content) VALUES ($1, $2, $3)',
            [area, shop, content]
        );
        res.json({ message: 'Success' });
    } catch (err) {
        res.status(500).json({ error: "投稿失敗" });
    }
});

// 管理者ログイン
app.post('/api/admin/login', (req, res) => {
    if (req.body.password === 'Shake0905') return res.json({ success: true });
    res.status(401).json({ success: false });
});

// ログイン画面表示
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🏔️ 道バイト・リアル 稼働中！`);
});