const express = require('express');
const app = express();
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

app.use(express.json());
app.use(express.static(__dirname));

const SUPABASE_URL = 'https://sktxupbkynhlddgjxsvr.supabase.co';
const SUPABASE_KEY = 'sb_secret_2NlBA2WJXTLmSkkjuvddgA_88yOWPW5'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.get('/api/reviews', async (req, res) => {
    try {
        const { data, error } = await supabase.from('reviews').select('*').order('id', { ascending: false });
        if (error) return res.status(500).json(error);
        res.json(data || []);
    } catch (err) { res.status(500).send("サーバーエラー"); }
});

app.post('/api/reviews', async (req, res) => {
    // 🚀 ratingを追加で受け取るッ！
    const { area, city, shop, content, job_type, rating } = req.body;
    
    if (!area || !city || !shop || !content || !job_type) {
        return res.status(400).send('データ不足だッ！');
    }

    try {
        const { data, error } = await supabase
            .from('reviews')
            .insert([{ 
                area, city, shop, content, job_type, 
                rating: rating || 3, // 🚀 星を保存
                likes: 0,
                is_reported: false,
                report_reason: ''
            }])
            .select();
        if (error) return res.status(500).json(error);
        res.status(201).json(data[0]);
    } catch (err) { res.status(500).send("内部エラー"); }
});

app.post('/api/reviews/:id/like', async (req, res) => {
    const id = req.params.id;
    try {
        const { data: current } = await supabase.from('reviews').select('likes').eq('id', id).single();
        if (current) {
            const { data } = await supabase.from('reviews').update({ likes: (current.likes || 0) + 1 }).eq('id', id).select();
            res.json(data ? data[0] : {});
        } else res.status(404).send('見つからねえ');
    } catch (err) { res.status(500).send("いいね失敗"); }
});

app.post('/api/reviews/:id/report', async (req, res) => {
    const { reason } = req.body;
    try {
        await supabase.from('reviews').update({ is_reported: true, report_reason: reason }).eq('id', req.params.id);
        res.sendStatus(200);
    } catch (err) { res.status(500).send("通報エラー"); }
});

app.post('/api/admin/login', (req, res) => {
    if (req.body.password === 'Shake0905') res.sendStatus(200);
    else res.sendStatus(401);
});

app.delete('/api/reviews/:id', async (req, res) => {
    await supabase.from('reviews').delete().eq('id', req.params.id);
    res.sendStatus(200);
});

app.post('/api/reviews/:id/dismiss', async (req, res) => {
    try {
        await supabase.from('reviews').update({ is_reported: false, report_reason: '' }).eq('id', req.params.id);
        res.sendStatus(200);
    } catch (err) { res.status(500).send("却下失敗"); }
});

app.use((req, res, next) => {
    if (path.extname(req.path).length > 0) return next();
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🏔️ 起動ッ！ Port: ${PORT}`));