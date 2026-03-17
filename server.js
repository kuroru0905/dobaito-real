const express = require('express');
const app = express();
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

app.use(express.json());
// ルートディレクトリを静的配信（index.html等がある場所）
app.use(express.static(__dirname));

// 🔑 Supabase接続：Jemi-niisan専用の不滅の鍵だッ！
const SUPABASE_URL = 'https://sktxupbkynhlddgjxsvr.supabase.co';
const SUPABASE_KEY = 'sb_secret_2NlBA2WJXTLmSkkjuvddgA_88yOWPW5'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * 📡 GET /api/reviews
 * Supabaseから全てのレビューを取得する
 */
app.get('/api/reviews', async (req, res) => {
    const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('id', { ascending: false });
    
    if (error) return res.status(500).json(error);
    
    // Supabaseのデータ構造をフロントエンドの期待する形に微調整
    const formattedData = (data || []).map(r => ({
        ...r,
        date: r.date || r.created_at
    }));
    
    res.json(formattedData);
});

/**
 * 📡 POST /api/reviews
 * 新しいレビューをSupabaseに永続保存する
 */
app.post('/api/reviews', async (req, res) => {
    const { area, city, shop, content } = req.body;
    if (!area || !city || !shop || !content) {
        return res.status(400).send('データが足りねえぜッ！');
    }

    const jstDate = new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo'
    }).format(new Date());

    const { data, error } = await supabase
        .from('reviews')
        .insert([{ area, city, shop, content, date: jstDate, likes: 0 }])
        .select();

    if (error) return res.status(500).json(error);
    res.status(201).json(data[0]);
});

/**
 * 📡 POST /api/reviews/:id/like
 * いいね数を更新
 */
app.post('/api/reviews/:id/like', async (req, res) => {
    const id = req.params.id;
    const { data: current } = await supabase.from('reviews').select('likes').eq('id', id).single();
    if (current) {
        const { data, error } = await supabase
            .from('reviews')
            .update({ likes: (current.likes || 0) + 1 })
            .eq('id', id)
            .select();
        res.json(data ? data[0] : {});
    } else res.status(404).send('なし');
});

/**
 * 📡 POST /api/reviews/:id/report
 * 削除依頼（通報）
 */
app.post('/api/reviews/:id/report', async (req, res) => {
    const { reason } = req.body;
    const { error } = await supabase
        .from('reviews')
        .update({ is_reported: true, report_reason: reason })
        .eq('id', req.params.id);
    
    if (error) res.status(500).send(error);
    else res.sendStatus(200);
});

/**
 * 🔑 管理者ログイン
 */
app.post('/api/admin/login', (req, res) => {
    if (req.body.password === 'Shake0905') res.sendStatus(200);
    else res.sendStatus(401);
});

/**
 * 🗑️ 管理者：削除
 */
app.delete('/api/reviews/:id', async (req, res) => {
    const { error } = await supabase.from('reviews').delete().eq('id', req.params.id);
    if (error) res.status(500).send(error);
    else res.sendStatus(200);
});

/**
 * ✅ 管理者：通報却下
 */
app.post('/api/reviews/:id/dismiss', async (req, res) => {
    const { error } = await supabase
        .from('reviews')
        .update({ is_reported: false, report_reason: '' })
        .eq('id', req.params.id);
    
    if (error) res.status(500).send(error);
    else res.sendStatus(200);
});

/**
 * 🏠 SPA対応（エラー回避ミドルウェア方式）
 */
app.use((req, res, next) => {
    if (path.extname(req.path).length > 0) return next();
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🏔️ 起動ッ！ Supabase永続化完了 Port: ${PORT}`));