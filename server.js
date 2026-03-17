const express = require('express');
const app = express();
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

app.use(express.json());
app.use(express.static(__dirname));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'Shake0905';
const ADMIN_TOKEN = "MichiBaito_Secret_Session_Key_2026";

const postHistory = new Map();

const NG_WORDS = [
    // 攻撃的・誹謗中傷（ひらがな・カナ網羅）
    "死ね", "シネ", "殺す", "ころす", "コロス", "殺意", "バカ", "ばか", "馬鹿", "アホ", "あほ", "阿呆", 
    "ゴミ", "ごみ", "カス", "かす", "きがい", "キチガイ", "きちがい", "ガイジ", "がいじ", "ガイキチ", 
    "消えろ", "きえろ", "クズ", "くず", "屑", "しねよ", "タヒね", "死。ね",

    // 差別・特定の人物・不快語
    "ゆい", "ユイ",

    // 性的・卑猥・不適切（すり抜け対策込み）
    "セクハラ", "せくはら", "ヤらせて", "やらせて", "エロ", "えろ", "パパ活", "ぱぱかつ", "パパかつ", 
    "援交", "えんこう", "エンコウ", "援助交際", "ヌード", "ぬーど", "おっぱい", "オッパイ", "おぱい", 
    "マンコ", "まんこ", "満子", "チンコ", "ちんこ", "珍子", "チンポ", "ちんぽ", "セックス", "せっくす", 
    "クリトリス", "くりとりす", "フェラ", "ふぇら", "中出し", "なかだし", "バイブ", "ばいぶ", 
    "ヤリマン", "やりまん", "処女", "しょじょ", "ショジョ", "童貞", "どうてい", "ドウテイ", 
    "オナニー", "おなにー", "マ○コ", "チ○コ", "セッ○ス", "○",

    // その他、隠語的表現
    "裏アカ", "裏垢", "直メ", "カカオ", "ライン交換", "LINE交換"
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

// 🚀 カウントの取り方を修正して「(1)」になる問題を解決するぜッ！
app.get('/api/reviews', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('reviews')
            .select('*, comments(count)')
            .order('id', { ascending: false });
        if (error) return res.status(500).json(error);

        // 🛡️ フロントエンドが使いやすいようにカウントを数値に整形するッ！
        const formattedData = data.map(r => ({
            ...r,
            commentCount: r.comments[0]?.count || 0
        }));
        res.json(formattedData);
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
    const now = Date.now();
    const limitWindow = 60 * 60 * 1000;
    const maxPosts = 5;

    let userHistory = postHistory.get(ip) || [];
    userHistory = userHistory.filter(timestamp => now - timestamp < limitWindow);

    if (userHistory.length >= maxPosts) {
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

    const hasNGWord = NG_WORDS.some(word => shop.includes(word) || content.includes(word));
    if (hasNGWord) return res.status(400).send('不適切な言葉が含まれているぜッ！');

    try {
        const { data, error } = await supabase
            .from('reviews')
            .insert([{ area, city, shop, content, job_type, rating: rating || 3, likes: 0, is_reported: false, report_reason: '' }])
            .select();
        if (error) return res.status(500).json(error);
        userHistory.push(now);
        postHistory.set(ip, userHistory);
        res.status(201).json(data[0]);
    } catch (err) { res.status(500).send("内部エラー"); }
});

app.get('/api/reviews/:id/comments', async (req, res) => {
    const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('review_id', req.params.id)
        .order('id', { ascending: true });
    if (error) return res.status(500).json(error);
    res.json(data || []);
});

app.post('/api/reviews/:id/comments', async (req, res) => {
    const content = sanitize(req.body.content);
    if (!content) return res.status(400).send('中身が空だぜッ！');

    const hasNGWord = NG_WORDS.some(word => content.includes(word));
    if (hasNGWord) return res.status(400).send('不適切な言葉が含まれているぜッ！');

    try {
        const { data, error } = await supabase
            .from('comments')
            .insert([{ review_id: req.params.id, content: content }])
            .select();
        if (error) return res.status(500).json(error);
        res.status(201).json(data[0]);
    } catch (err) { res.status(500).send("返信失敗だッ！"); }
});

// 🚀 管理パネル用：通報された返信を取得
app.get('/api/admin/reported-comments', async (req, res) => {
    const { data, error } = await supabase
        .from('comments')
        .select('*, reviews(shop)')
        .eq('is_reported', true);
    if (error) return res.status(500).json(error);
    res.json(data || []);
});

// 🚀 返信の管理（削除・却下）API
app.delete('/api/comments/:id', async (req, res) => {
    const { error } = await supabase.from('comments').delete().eq('id', req.params.id);
    if (error) return res.status(500).json(error);
    res.sendStatus(200);
});

app.post('/api/comments/:id/dismiss', async (req, res) => {
    const { error } = await supabase.from('comments').update({ is_reported: false, report_reason: '' }).eq('id', req.params.id);
    if (error) return res.status(500).json(error);
    res.sendStatus(200);
});

// 🚀 返信への通報API（これも忘れずに実装だッ！）
app.post('/api/comments/:id/report', async (req, res) => {
    const reason = sanitize(req.body.reason);
    const { error } = await supabase.from('comments').update({ is_reported: true, report_reason: reason }).eq('id', req.params.id);
    if (error) return res.status(500).json(error);
    res.sendStatus(200);
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
    if (!path.extname(req.path)) incrementPV();
    if (path.extname(req.path).length > 0) return next();
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🏔️ 起動ッ！ Port: ${PORT}`));