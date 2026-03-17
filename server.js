const express = require('express');
const app = express();
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

app.use(express.json());
app.use(express.static(__dirname));

// 🔑 Supabase接続
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
        
        const formattedData = (data || []).map(r => ({
            ...r,
            date: r.date || r.created_at
        }));
        res.json(formattedData);
    } catch (err) {
        console.error("🔥 取得中にシステムエラー:", err);
        res.status(500).send("取得失敗");
    }
});

/**
 * 📡 POST /api/reviews (デバッグ強化版)
 */
app.post('/api/reviews', async (req, res) => {
    console.log("🚀 投稿リクエスト受信:", req.body);
    const { area, city, shop, content } = req.body;
    
    if (!area || !city || !shop || !content) {
        console.warn("⚠️ データが空だぜッ！");
        return res.status(400).send('データ不足');
    }

    const jstDate = new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo'
    }).format(new Date());

    try {
        console.log("📡 Supabaseへ書き込み中...");
        const { data, error } = await supabase
            .from('reviews')
            .insert([{ 
                area: area, 
                city: city, 
                shop: shop, 
                content: content, 
                date: jstDate, 
                likes: 0 
            }])
            .select();

        if (error) {
            console.error("❌ Supabase書き込みエラー発生ッ！:", error);
            // ここで出たエラーの内容（messageやcode）をフロントに返す
            return res.status(500).json({ 
                message: "Supabase側で拒絶されたぜ！", 
                details: error 
            });
        }

        console.log("✅ 投稿成功:", data[0]);
        res.status(201).json(data[0]);
    } catch (err) {
        console.error("🔥 致命的なシステムエラー:", err);
        res.status(500).json({ message: "サーバーが爆発したぜ！", error: err.message });
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
            res.status(404).send('投稿が見つからねえ');
        }
    } catch (err) {
        res.status(500).send("いいね失敗");
    }
});

// 管理者系
app.post('/api/admin/login', (req, res) => {
    if (req.body.password === 'Shake0905') res.sendStatus(200);
    else res.sendStatus(401);
});

app.delete('/api/reviews/:id', async (req, res) => {
    await supabase.from('reviews').delete().eq('id', req.params.id);
    res.sendStatus(200);
});

// SPA対応
app.use((req, res, next) => {
    if (path.extname(req.path).length > 0) return next();
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🏔️ 起動ッ！ログ監視開始。 Port: ${PORT}`));