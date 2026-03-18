const express = require('express');
const app = express();
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

app.use(express.json());
// 🚀 静的ファイルの公開範囲を明確にするぜッ！
app.use(express.static(__dirname));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'Shake0905';
const ADMIN_TOKEN = "MichiBaito_Secret_Session_Key_2026";

const postHistory = new Map();
// 🚀 ログイン失敗履歴を管理するスタンドだッ！
const loginAttempts = new Map();

const NG_WORDS = [
    "死ね", "シネ", "殺す", "ころす", "コロス", "殺意", "バカ", "ばか", "馬鹿", "アホ", "あほ", "阿呆", 
    "ゴミ", "ごみ", "カス", "かす", "きがい", "キチガイ", "きちがい", "ガイジ", "がいじ", "ガイキチ", 
    "消えろ", "きえろ", "クズ", "くず", "屑", "しねよ", "タヒね", "死。ね",
    "ゆい", "ユイ",
    "セクハラ", "せくはら", "ヤらせて", "やらせて", "エロ", "えろ", "パパ活", "ぱぱかつ", "パパかつ", 
    "援交", "えんこう", "エンコウ", "援助交際", "ヌード", "ぬーど", "おっぱい", "オッパイ", "おぱい", 
    "マンコ", "まんこ", "満子", "チンコ", "ちんこ", "珍子", "チンポ", "ちんぽ", "セックス", "せっくす", 
    "クリトリス", "くりとりす", "フェラ", "ふぇら", "中出し", "なかだし", "バイブ", "ばいぶ", 
    "ヤリマン", "やりまん", "処女", "しょじょ", "ショジョ", "童貞", "どうてい", "ドウテイ", 
    "オナニー", "おなにー", "マ○コ", "チ○コ", "セッ○ス", "○",
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

// 🚀 画像ファイルを確実に表示させるための専用ルートだッ！
app.get('/profile.jpg', (req, res) => {
    res.sendFile(path.join(__dirname, 'profile.jpg'));
});

// 🚀 特定の投稿を検索エンジンにインデックスさせるための専用ページルートだッ！
app.get('/review/:id', async (req, res) => {
    try {
        const { data: review, error } = await supabase
            .from('reviews')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error || !review) return res.status(404).send('その記憶（投稿）は存在しねえ…');

        res.send(`
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>【${review.shop}】のバイト評判・口コミ（${review.city}） | 道バイト・リアル</title>
    <meta name="description" content="${review.area}${review.city}にある${review.shop}のバイト現場のリアルな口コミ。総合評価：星${review.rating}個ッ！">
    <style>
        body { font-family: sans-serif; background: #f0f4f8; color: #333; padding: 2rem; line-height: 1.6; }
        .card { max-width: 600px; margin: auto; background: white; padding: 2rem; border-radius: 12px; border-left: 10px solid #0056b3; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        h1 { color: #0056b3; font-size: 1.5rem; margin-top: 0; }
        .tag { display: inline-block; background: #eee; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; margin-right: 5px; }
        .content { background: #f9f9f9; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0; white-space: pre-wrap; font-weight: bold; }
        .back-btn { display: block; text-align: center; text-decoration: none; color: white; background: #0056b3; padding: 10px; border-radius: 50px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="card">
        <div style="margin-bottom:10px;">
            <span class="tag">${review.area}</span><span class="tag">${review.city}</span><span class="tag">${review.job_type}</span>
        </div>
        <h1>${review.shop} のリアル</h1>
        <div style="color: #f1c40f; font-size: 1.2rem;">評価: ${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</div>
        <div class="content">${review.content}</div>
        <a href="/" class="back-btn">← 他の現場のリアルも見に行く</a>
    </div>
</body>
</html>
        `);
    } catch (err) { res.status(500).send("内部エラーだッ！"); }
});

// 🚀 管理者コラム（ひとりごと）を検索エンジンにインデックスさせるための専用ルートだッ！
app.get('/column/:id', async (req, res) => {
    try {
        const { data: column, error } = await supabase
            .from('columns')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error || !column) return res.status(404).send('その知恵（コラム）は存在しねえ…');

        res.send(`
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${column.title} | 管理者KURORUのひとりごと（道バイト・リアル）</title>
    <meta name="description" content="北海道のバイト事情を知り尽くす管理者KURORUによるコラム：${column.title}。現場のリアルな視点をお届けするぜッ！">
    <style>
        body { font-family: sans-serif; background: #1a1a1a; color: #eee; padding: 2rem; line-height: 1.8; }
        .column-container { max-width: 800px; margin: auto; background: #222; padding: 2.5rem; border-radius: 12px; border: 3px solid #ffcf00; }
        h1 { color: #ffcf00; font-size: 1.8rem; margin-top: 0; border-bottom: 2px solid #ffcf00; padding-bottom: 10px; }
        .meta-info { font-size: 0.8rem; color: #888; margin-bottom: 20px; }
        .content { white-space: pre-wrap; font-size: 1.05rem; }
        .profile-box { display: flex; align-items: center; gap: 15px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #444; }
        .profile-img { width: 60px; height: 60px; border-radius: 50%; border: 2px solid #ffcf00; object-fit: cover; }
        .back-btn { display: inline-block; margin-top: 30px; text-decoration: none; color: #ffcf00; font-weight: bold; border: 1px solid #ffcf00; padding: 8px 20px; border-radius: 50px; }
    </style>
</head>
<body>
    <div class="column-container">
        <div class="meta-info">🗓️ 掲載日: ${new Date(column.created_at).toLocaleDateString()}</div>
        <h1>${column.title}</h1>
        <div class="content">${column.content}</div>
        <div class="profile-box">
            <img src="/profile.jpg" alt="管理者KURORU" class="profile-img" onerror="this.style.display='none'">
            <div>
                <strong>管理者：KURORU</strong><br>
                <small>新ひだか町出身・BEATBOXER。現場のリアルを愛する男だッ！</small>
            </div>
        </div>
        <a href="/" class="back-btn">← TOPへ戻って口コミを見る</a>
    </div>
</body>
</html>
        `);
    } catch (err) { res.status(500).send("内部エラーだッ！"); }
});

// 🚀 Renderのヘルスチェックを確実に通すための明示的ルート
app.get('/', (req, res) => {
    incrementPV();
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/reviews', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('reviews')
            .select('*, comments(count)')
            .order('id', { ascending: false });
        if (error) return res.status(500).json(error);
        const formattedData = data.map(r => ({
            ...r,
            commentCount: r.comments[0]?.count || 0
        }));
        res.json(formattedData);
    } catch (err) { res.status(500).send("サーバーエラー"); }
});

// 🚀 コラム取得用API
app.get('/api/columns', async (req, res) => {
    try {
        const { data, error } = await supabase.from('columns').select('*').order('id', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (err) { res.status(500).send("コラム取得失敗"); }
});

// 🚀 管理者専用：コラム投稿用API
app.post('/api/admin/columns', async (req, res) => {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).send('タイトルと内容が必要だッ！');
    try {
        const { data, error } = await supabase
            .from('columns')
            .insert([{ title: sanitize(title), content: sanitize(content) }])
            .select();
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) { res.status(500).send("コラム投稿失敗"); }
});

// 🚀 管理者専用：コラム削除用API
app.delete('/api/admin/columns/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('columns').delete().eq('id', req.params.id);
        if (error) throw error;
        res.sendStatus(200);
    } catch (err) { res.status(500).send("コラム削除失敗"); }
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
    const captchaResponse = req.body['g-recaptcha-response'];
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!captchaResponse) {
        return res.status(400).send('ロボットはお断りだぜッ！');
    }

    try {
        const verifyRes = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${secretKey}&response=${captchaResponse}`
        });
        const verifyData = await verifyRes.json();

        if (!verifyData.success) {
            return res.status(400).send('チェックの有効期限が切れたか、不正なリクエストだッ！');
        }
    } catch (e) {
        return res.status(500).send('検証エラーだッ！');
    }

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

app.get('/api/admin/reported-comments', async (req, res) => {
    const { data, error } = await supabase
        .from('comments')
        .select('*, reviews(shop)')
        .eq('is_reported', true);
    if (error) return res.status(500).json(error);
    res.json(data || []);
});

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

// 🚀 ここがブルートフォース攻撃への「鉄壁の守り」だッ！
app.post('/api/admin/login', (req, res) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress;
    const now = Date.now();
    
    // 10分間ログインを制限する設定だッ！
    const lockDuration = 10 * 60 * 1000; 
    const maxAttempts = 5;

    let attemptData = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };

    // ロック中かチェックするぜ
    if (attemptData.count >= maxAttempts && now - attemptData.lastAttempt < lockDuration) {
        const remaining = Math.ceil((lockDuration - (now - attemptData.lastAttempt)) / 60000);
        return res.status(403).send(`「“終わりのないのが終わり”」……ログイン制限中だ。あと ${remaining} 分待てッ！`);
    }

    if (req.body.password === ADMIN_PASS) {
        // 成功したらカウントをリセットしろッ！
        loginAttempts.delete(ip);
        res.json({ token: ADMIN_TOKEN });
    } else {
        // 失敗したらカウントを刻めッ！
        attemptData.count++;
        attemptData.lastAttempt = now;
        loginAttempts.set(ip, attemptData);
        
        const remainingAttempts = maxAttempts - attemptData.count;
        if (remainingAttempts <= 0) {
            res.status(401).send("再起不能（リタイア）だ。しばらくアクセスを禁ずるッ！");
        } else {
            res.status(401).send(`パスワードが違うぜ。あと ${remainingAttempts} 回でロックされる。覚悟しろッ！`);
        }
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

// 🚀 万が一の予備ルーティング
app.use((req, res, next) => {
    if (path.extname(req.path).length > 0) return next();
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🏔️ 起動ッ！ Port: ${PORT}`));