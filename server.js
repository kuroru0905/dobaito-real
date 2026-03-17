const express = require('express');
const app = express();
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

app.use(express.json());
app.use(express.static(__dirname));

// 🚀 指定箇所の書き換え：生のURLと鍵を消し去り、環境変数から読み込むッ！
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'Shake0905';
const ADMIN_TOKEN = "MichiBaito_Secret_Session_Key_2026";

// 🛡️ 連投防止用のメモリキャッシュだッ！
const postHistory = new Map();

// 🛡️ 禁断の「NGワードリスト」だッ！ここに含まれる単語は投稿を許さねえ。
const NG_WORDS = [
    "死ね", "殺す", "バカ", "アホ", "ゴミ", "カス", 
    "キチガイ", "ガイジ", "消えろ", "クズ", "ゆい", "セクハラ", "ヤらせて", "エロ", "パパ活", "援交", 
    "ヌード", "おっぱい", "マンコ", "チンコ", "セックス",
    "クリトリス", "フェラ", "中出し", "バイブ", "ヤリマン",
    "処女", "童貞", "欲情", "変態", "露出"
    // 必要に応じて単語をここに追加しろッ！
];

function sanitize(text) {
    if (typeof text !== 'string') return text;
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function incrementPV() {
    try {
        const { data: current } = await supabase.from('stats').select('count').eq('id', 'total_pv').single();
        if (current) {
            await supabase.from('stats').update({ count: current.count + 1 }).eq('id', 'total_pv');
        } else {
            await supabase.from('stats').insert([{ id: 'total_pv', count: 1 }]);
        }
    } catch (e) { console.error("PV更新失敗だぜッ！", e); }
}

app.get('/api/reviews', async (req, res) => {
    try {
        const { data, error } = await supabase.from('reviews').select('*').order('id', { ascending: false });
        if (error) return res.status(500).json(error);
        res.json(data || []);
    } catch (err) { res.status(500).send("サーバーエラー"); }
});

app.get('/api/admin/stats', async (req, res) => {
    try {
        const { data } = await supabase.from('stats').select('count').eq('id', 'total_pv').single();
        const { data: reviews } = await supabase.from('reviews').select('area');
        const areaStats = (reviews || []).reduce((acc, r) => {
            acc[r.area] = (acc[r.area] || 0) + 1;
            return acc;
        }, {});
        res.json({ pv: data ? data.count : 0, areas: areaStats });
    } catch (err) { res.status(500).send("統計取得エラー"); }
});

app.post('/api/reviews', async (req, res) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress;
    
    console.log(`📡 投稿リクエスト受信ッ！ IP: ${ip}`);

    const now = Date.now();
    const limitWindow = 60 * 60 * 1000; // 1時間
    const maxPosts = 5; // 最大投稿数

    let userHistory = postHistory.get(ip) || [];
    userHistory = userHistory.filter(timestamp => now - timestamp < limitWindow);

    if (userHistory.length >= maxPosts) {
        console.log(`🚫 荒らし検出ッ！ IP: ${ip}`);
        return res.status(429).send('連投しすぎだぜッ！1時間待ってから投稿してくれ。');
    }

    const area = sanitize(req.body.area);
    const city = sanitize(req.body.city);
    const shop = sanitize(req.body.shop);
    const content = sanitize(req.body.content);
    const job_type = sanitize(req.body.job_type);
    const rating = parseInt(req.body.rating);
    
    if (!area || !city || !shop || !content || !job_type) {
        return res.status(400).send('データ不足だッ！');
    }

    // 🛡️ NGワードチェックの結界ッ！
    const hasNGWord = NG_WORDS.some(word => 
        shop.includes(word) || content.includes(word)
    );

    if (hasNGWord) {
        console.log(`🚫 NGワード検出ッ！ IP: ${ip}`);
        return res.status(400).send('不適切な言葉が含まれているぜッ！言葉遣いには気をつけな。');
    }

    try {
        const { data, error } = await supabase
            .from('reviews')
            .insert([{ 
                area, city, shop, content, job_type, 
                rating: rating || 3,
                likes: 0,
                is_reported: false,
                report_reason: ''
            }])
            .select();
        
        if (error) return res.status(500).json(error);

        userHistory.push(now);
        postHistory.set(ip, userHistory);

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
    const reason = sanitize(req.body.reason);
    try {
        await supabase.from('reviews').update({ is_reported: true, report_reason: reason }).eq('id', req.params.id);
        res.sendStatus(200);
    } catch (err) { res.status(500).send("通報エラー"); }
});

app.post('/api/admin/login', (req, res) => {
    if (req.body.password === ADMIN_PASS) {
        res.json({ token: ADMIN_TOKEN });
    } else {
        res.sendStatus(401);
    }
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
    if (!path.extname(req.path)) {
        incrementPV();
    }
    
    if (path.extname(req.path).length > 0) return next();
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🏔️ 起動ッ！ Port: ${PORT}`));