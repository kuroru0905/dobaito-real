const express = require('express');
const app = express();
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

app.use(express.json());
app.use(express.static(__dirname));

// 🔑 Supabase接続設定
const SUPABASE_URL = 'https://sktxupbkynhlddgjxsvr.supabase.co';
const SUPABASE_KEY = 'sb_secret_2NlBA2WJXTLmSkkjuvddgA_88yOWPW5'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * 📡 GET /api/reviews
 */
app.get('/api/reviews', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .order('id', { ascending: false });
        
        if (error) {
            console.error("❌ 取得エラー:", error);
            return res.status(500).json(error);
        }
        res.json(data || []);
    } catch (err) {
        res.status(500).send("サーバーエラー");
    }
});

/**
 * 📡 POST /api/reviews
 */
app.post('/api/reviews', async (req, res) => {
    const { area, city, shop, content } = req.body;
    
    if (!area || !city || !shop || !content) {
        return res.status(400).send('データが足りねえぜッ！');
    }

    try {
        const { data, error } = await supabase
            .from('reviews')
            .insert([{ 
                area: area, 
                city: city, 
                shop: shop, 
                content: content, 
                likes: 0,
                is_reported: false,
                report_reason: ''
            }])
            .select();

        if (error) {
            console.error("❌ Supabase書き込み失敗:", error);
            return res.status(500).json(error);
        }

        res.status(201).json(data[0]);
    } catch (err) {
        res.status(500).send("内部エラー");
    }
});

/**
 * 📡 POST /api/reviews/:id/like
 */
app.post('/api/reviews/:id/like', async (req, res) => {
    const id = req.params.id;
    try {
        const { data: current } = await supabase.from('reviews').select('likes').eq('id', id).single();
        if (current) {
            const { data, error } = await supabase
                .from('reviews')
                .update({ likes: (current.likes || 0) + 1 })
                .eq('id', id)
                .select();
            res.json(data ? data[0] : {});
        } else {
            res.status(404).send('見つからねえ');
        }
    } catch (err) {
        res.status(500).send("いいね失敗");
    }
});

/**
 * 🚩 POST /api/reviews/:id/report
 */
app.post('/api/reviews/:id/report', async (req, res) => {
    const id = req.params.id;
    const { reason } = req.body;

    try {
        const { data, error } = await supabase
            .from('reviews')
            .update({ 
                is_reported: true, 
                report_reason: reason 
            })
            .eq('id', id)
            .select();

        if (error) {
            console.error("❌ 通報処理失敗:", error);
            return res.status(500).json(error);
        }

        console.log(`✅ 通報受理: ID ${id}`);
        res.json(data[0]);
    } catch (err) {
        res.status(500).send("通報エラーだぜッ！");
    }
});

// 🔑 管理者用：ログイン
app.post('/api/admin/login', (req, res) => {
    if (req.body.password === 'Shake0905') res.sendStatus(200);
    else res.sendStatus(401);
});

// 🗑️ 管理者用：削除
app.delete('/api/reviews/:id', async (req, res) => {
    await supabase.from('reviews').delete().eq('id', req.params.id);
    res.sendStatus(200);
});

// ✅ 管理者用：通報の却下
app.post('/api/reviews/:id/dismiss', async (req, res) => {
    try {
        await supabase
            .from('reviews')
            .update({ is_reported: false, report_reason: '' })
            .eq('id', req.params.id);
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send("却下失敗");
    }
});

// 🏠 SPA対応
app.use((req, res, next) => {
    if (path.extname(req.path).length > 0) return next();
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- ここからが Render 対策の「真実」だッ！ ---

const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🏔️ 起動ッ！ Supabase完全同期モード Port: ${PORT}`);
    console.log("Renderからの外部接続を 0.0.0.0 で完全待機中だぜッ！！");
});