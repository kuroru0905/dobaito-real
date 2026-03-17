const express = require('express');
const app = express();
const path = require('path');
const { createClient } = require('@supabase/supabase-js'); // 🚀 Supabase導入

app.use(express.json());
app.use(express.static(__dirname));

// 🔑 Supabase接続設定（Secret Key をここに貼り付けろッ！）
const SUPABASE_URL = 'https://sktxupbkynhlddgjxsvr.supabase.co';
const SUPABASE_KEY = 'ここにお前のSecret Keyを貼り付けろ'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 📡 レビュー取得（Supabaseから読み出す）
app.get('/api/reviews', async (req, res) => {
    const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('id', { ascending: false });
    
    if (error) return res.status(500).json(error);
    res.json(data);
});

// 📡 レビュー投稿（Supabaseに書き込む）
app.post('/api/reviews', async (req, res) => {
    const { area, city, shop, content } = req.body;
    const jstDate = new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo'
    }).format(new Date());

    const { data, error } = await supabase
        .from('reviews')
        .insert([{ area, city, shop, content, date: jstDate, likes: 0 }]);

    if (error) return res.status(500).json(error);
    res.status(201).json(data);
});

// 📡 いいね（Supabaseのデータを更新）
app.post('/api/reviews/:id/like', async (req, res) => {
    const { data: current } = await supabase.from('reviews').select('likes').eq('id', req.params.id).single();
    if (current) {
        const { data, error } = await supabase.from('reviews').update({ likes: current.likes + 1 }).eq('id', req.params.id);
        res.json(data);
    } else res.status(404).send('なし');
});

// 🔑 管理者ログイン
app.post('/api/admin/login', (req, res) => {
    if (req.body.password === 'Shake0905') res.sendStatus(200);
    else res.sendStatus(401);
});

// 🗑️ 管理者：削除（Supabaseから消す）
app.delete('/api/reviews/:id', async (req, res) => {
    await supabase.from('reviews').delete().eq('id', req.params.id);
    res.sendStatus(200);
});

// 🏠 SPA対応
app.use((req, res, next) => {
    if (path.extname(req.path).length > 0) return next();
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🏔️ 起動ッ！ Supabase接続中... Port: ${PORT}`));