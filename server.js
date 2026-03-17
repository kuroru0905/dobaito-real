const express = require('express');
const app = express();
const path = require('path');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let reviews = [];

app.get('/api/reviews', (req, res) => {
    const sortedReviews = [...reviews].sort((a, b) => b.id - a.id);
    res.json(sortedReviews);
});

app.post('/api/reviews', (req, res) => {
    const { area, city, shop, content } = req.body;
    if (!area || !city || !shop || !content) {
        return res.status(400).send('入力データ不足だぜッ！');
    }
    const jstDate = new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo'
    }).format(new Date());
    const newReview = { id: Date.now(), area, city, shop, content, date: jstDate, likes: 0 };
    reviews.push(newReview);
    res.status(201).json(newReview);
});

app.post('/api/reviews/:id/like', (req, res) => {
    const review = reviews.find(r => r.id === parseInt(req.params.id));
    if (review) { review.likes += 1; res.json(review); }
    else { res.status(404).send('見つからねえ！'); }
});

// 🚀 これが最新ライブラリの壁をブチ破る「正規表現ワイルドカード」だッ！
app.get('(.*)', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🏔️ 道バイト・リアル 起動ッ！ Port: ${PORT}`);
});