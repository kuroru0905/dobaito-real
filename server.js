const express = require('express');
const app = express();
const path = require('path');

app.use(express.json());
// 🚀 今のフォルダ構成に合わせて、ルートディレクトリを静的配信に設定！
app.use(express.static(__dirname));

let reviews = [];

// 📡 レビュー取得
app.get('/api/reviews', (req, res) => {
    res.json([...reviews].sort((a, b) => b.id - a.id));
});

// 📡 レビュー投稿（日本時間）
app.post('/api/reviews', (req, res) => {
    const { area, city, shop, content } = req.body;
    if (!area || !city || !shop || !content) return res.status(400).send('不足だぜッ！');
    
    const jstDate = new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo'
    }).format(new Date());

    const newReview = { 
        id: Date.now(), area, city, shop, content, date: jstDate, 
        likes: 0, is_reported: false, report_reason: '' 
    };
    reviews.push(newReview);
    res.status(201).json(newReview);
});

// 📡 いいね
app.post('/api/reviews/:id/like', (req, res) => {
    const review = reviews.find(r => r.id === parseInt(req.params.id));
    if (review) { review.likes += 1; res.json(review); }
    else res.status(404).send('なし');
});

// 📡 削除依頼
app.post('/api/reviews/:id/report', (req, res) => {
    const review = reviews.find(r => r.id === parseInt(req.params.id));
    if (review) {
        review.is_reported = true;
        review.report_reason = req.body.reason || '理由なし';
        res.json(review);
    } else res.status(404).send('なし');
});

// 🔑 管理者ログイン
app.post('/api/admin/login', (req, res) => {
    if (req.body.password === 'Shake0905') res.sendStatus(200);
    else res.sendStatus(401);
});

// 🗑️ 管理者：削除
app.delete('/api/reviews/:id', (req, res) => {
    reviews = reviews.filter(r => r.id !== parseInt(req.params.id));
    res.sendStatus(200);
});

// ✅ 管理者：通報却下
app.post('/api/reviews/:id/dismiss', (req, res) => {
    const review = reviews.find(r => r.id === parseInt(req.params.id));
    if (review) {
        review.is_reported = false;
        review.report_reason = '';
        res.json(review);
    } else res.status(404).send('なし');
});

// 🏠 SPA対応（ファイルをルートから探す！）
app.use((req, res, next) => {
    if (path.extname(req.path).length > 0) return next();
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🏔️ 起動ッ！ Port: ${PORT}`));