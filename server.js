const express = require('express');
const app = express();
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

app.use(express.json());
app.use(express.static(__dirname));

const SUPABASE_URL = 'https://sktxupbkynhlddgjxsvr.supabase.co';
const SUPABASE_KEY = 'sb_secret_2NlBA2WJXTLmSkkjuvddgA_88yOWPW5'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 🚀 パスワードをコードから追放！環境変数 ADMIN_PASSWORD を参照するぜ（未設定なら暫定 Shake0905）
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'Shake0905';
// 🚀 セッション用の合言葉（本来はランダム生成が望ましいが、まずは固定トークンで要塞化）
const ADMIN_TOKEN = "MichiBaito_Secret_Session_Key_2026";

// 🛡️ 入力データを無害化する「精密動作」関数だッ！
function sanitize(text) {
    if (typeof text !== 'string') return text;
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 📈 PVをカウントアップする「精密動作」関数だッ！
async function incrementPV() {
    try {
        const { data: current } = await supabase.from('stats').select('count').eq('id', 'total_pv').single();
        if (current) {
            await supabase.from('stats').update({ count: current.count + 1 }).eq('id', 'total_pv');
        } else {
            // テーブルが空なら初期化するぜ
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
    const area = sanitize(req.body.area);
    const city = sanitize(req.body.city);
    const shop = sanitize(req.body.shop);
    const content = sanitize(req.body.content);
    const job_type = sanitize(req.body.job_type);
    const rating = parseInt(req.body.rating);
    
    if (!area || !city || !shop || !content || !job_type) {
        return res.status(400).send('データ不足だッ！');
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

// 🛡️ ログイン処理の要塞化ッ！
app.post('/api/admin/login', (req, res) => {
    // 🚀 ここで ADMIN_PASS と合致するか「精密動作性」でチェックッ！
    if (req.body.password === ADMIN_PASS) {
        // 🚀 必ず「JSON」で返す。これが「真実」への鍵だッ！
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