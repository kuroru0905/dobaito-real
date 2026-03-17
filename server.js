const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('.'));

// 🚀 IPv4対応・Pooler経由の接続文字列（しゅうちゃんの認証情報）
const connectionString = "postgresql://postgres.sktxupbkynhlddgjxsvr:Shake0905-db@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres";

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

// データベース初期化：cityカラムがあるか確認し、なければ追加する処理も入れておくぜ！
(async () => {
    try {
        // reviewsテーブルの作成
        await pool.query(`CREATE TABLE IF NOT EXISTS reviews (
            id SERIAL PRIMARY KEY,
            area TEXT NOT NULL,
            city TEXT,
            shop TEXT NOT NULL,
            content TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            is_reported BOOLEAN DEFAULT FALSE,
            report_reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // 🚀 cityカラムが存在しない場合、自動で追加する「精密動作」だ
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='city') THEN
                    ALTER TABLE reviews ADD COLUMN city TEXT;
                END IF;
            END $$;
        `);

        console.log("✅ Supabase PostgreSQL 接続成功！ city対応完了だぜ。");
    } catch (err) {
        console.error("❌ 接続エラー:", err);
    }
})();

// 1. 全レビュー取得（日時のフォーマットもバッチリだ）
app.get('/api/reviews', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT *, TO_CHAR(created_at, 'YYYY/MM/DD HH24:MI') as date 
            FROM reviews 
            ORDER BY id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "取得失敗" });
    }
});

// 2. レビュー投稿（cityを確実に保存するぜッ！）
app.post('/api/reviews', async (req, res) => {
    const { area, city, shop, content } = req.body;
    try {
        await pool.query(
            'INSERT INTO reviews (area, city, shop, content) VALUES ($1, $2, $3, $4)',
            [area, city, shop, content]
        );
        res.json({ message: 'Success' });
    } catch (err) {
        console.error("投稿エラー:", err);
        res.status(500).json({ error: "投稿失敗" });
    }
});

// 3. 「道！」ボタン（評価カウントアップ）
app.post('/api/reviews/:id/like', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'UPDATE reviews SET likes = likes + 1 WHERE id = $1 RETURNING likes',
            [parseInt(id)]
        );
        res.json({ likes: result.rows[0]?.likes || 0 });
    } catch (err) {
        res.status(500).json({ error: "評価に失敗したぜ" });
    }
});

// 4. 削除依頼（通報）
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
        res.status(500).json({ error: "通報に失敗したぜ" });
    }
});

// 5. 削除依頼を却下（管理者の盾）
app.post('/api/reviews/:id/dismiss', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query(
            'UPDATE reviews SET is_reported = FALSE, report_reason = NULL WHERE id = $1',
            [parseInt(id)]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "却下に失敗したぜ" });
    }
});

// 6. 管理者ログイン
app.post('/api/admin/login', (req, res) => {
    if (req.body.password === 'Shake0905') {
        return res.json({ success: true, token: 'Shake0905' });
    }
    res.status(401).json({ success: false });
});

// 7. レビュー削除
app.delete('/api/reviews/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM reviews WHERE id = $1', [parseInt(id)]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: "削除失敗" });
    }
});

// ログインページへのルーティング
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🏔️ 道バイト・リアル 稼働中！`));