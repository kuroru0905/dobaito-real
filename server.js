const express = require('express');
const app = express();
const path = require('path');

// JSONリクエストを解析するためのミドルウェア
app.use(express.json());

// publicフォルダ内の静的ファイル（index.html, contact.html等）を配信
app.use(express.static(path.join(__dirname, 'public')));

/**
 * 🏔️ データ管理（メモリ保持）
 * Renderの無料プランでは、サーバーがスリープするとリセットされるが、
 * 今のプロトタイプ段階ではこのスピード感が重要だッ！
 */
let reviews = [];

/**
 * 📡 GET /api/reviews
 * 全てのレビューを取得する
 */
app.get('/api/reviews', (req, res) => {
    // 投稿が新しい順に並び替えて返す（最新の圧を上に！）
    const sortedReviews = [...reviews].sort((a, b) => b.id - a.id);
    res.json(sortedReviews);
});

/**
 * 📡 POST /api/reviews
 * 新しいレビューを投稿する（日本時間修正済み）
 */
app.post('/api/reviews', (req, res) => {
    const { area, city, shop, content } = req.body;

    // バリデーション（不備は許さねえ！）
    if (!area || !city || !shop || !content) {
        return res.status(400).send('入力データが足りねえぜ！全部埋めてくれッ！');
    }

    /**
     * 🚀 タイムゾーンを日本（Asia/Tokyo）に固定
     * Renderのサーバーがどこにあろうと、北海道の時間を刻む！
     */
    const now = new Date();
    const jstDate = new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Tokyo'
    }).format(now);

    const newReview = {
        id: Date.now(), // 一意のIDとしてタイムスタンプを使用
        area,
        city,
        shop,
        content,
        date: jstDate, // ここが「真実の時間」だ
        likes: 0
    };

    reviews.push(newReview);
    console.log(`[新着投稿] ${shop} (${area}) - ${jstDate}`);
    res.status(201).json(newReview);
});

/**
 * 📡 POST /api/reviews/:id/like
 * 指定した投稿に「道！」（いいね）を送る
 */
app.post('/api/reviews/:id/like', (req, res) => {
    const targetId = parseInt(req.params.id);
    const review = reviews.find(r => r.id === targetId);

    if (review) {
        review.likes += 1;
        res.json(review);
    } else {
        res.status(404).send('その投稿は見つからねえ！');
    }
});

/**
 * 📡 POST /api/reviews/:id/report
 * 削除依頼（報告）を受け取る（ログ出力のみ）
 */
app.post('/api/reviews/:id/report', (req, res) => {
    const targetId = parseInt(req.params.id);
    const { reason } = req.body;
    console.warn(`🚨 【削除依頼】 ID: ${targetId} | 理由: ${reason}`);
    res.status(200).send('報告を受理したぜ。管理人が確認する。');
});

/**
 * 🏠 SPA対応
 * ルート以外の直リンクアクセスでも index.html を返す
 */
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * 🚀 サーバー起動
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`-------------------------------------------`);
    console.log(`🏔️ 道バイト・リアル Server Is Ready!`);
    console.log(`🚀 Port: ${PORT}`);
    console.log(`🕒 Timezone: Asia/Tokyo (Fixed)`);
    console.log(`-------------------------------------------`);
});