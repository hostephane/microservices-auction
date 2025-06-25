const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const AUCTION_SERVICE_URL = 'http://localhost:3002';
const PORT = process.env.PORT || 3003;

let bids = [];
let bidId = 1;

// Middleware d'authentification
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, 'SECRET_KEY', (err, payload) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = payload;
    next();
  });
}

// POST /bids — faire une offre
app.post('/bids', authenticateToken, async (req, res) => {
  try {
    console.log('Requête POST /bids avec body:', req.body);
    const { auctionId, amount } = req.body;

    if (auctionId === undefined || amount === undefined) {
      return res.status(400).json({ error: 'Missing auctionId or amount' });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const auctionRes = await fetch(`${AUCTION_SERVICE_URL}/auctions/${auctionId}`);
    if (!auctionRes.ok) return res.status(404).json({ error: 'Auction not found' });
    const auction = await auctionRes.json();

    if (auction.status !== 'open') {
      return res.status(400).json({ error: 'Auction is closed' });
    }

    // Empêcher le propriétaire de l'enchère de placer une offre
    if (auction.owner_id === req.user.userId) {
      return res.status(400).json({ error: 'Le propriétaire ne peut pas placer d\'offre sur sa propre enchère' });
    }

    if (amount <= auction.current_price) {
      return res.status(400).json({ error: 'Bid must be higher than current price' });
    }

    const bid = {
      id: bidId++,
      auctionId,
      bidderId: req.user.userId,
      bidderName: req.user.name || req.user.email || 'Anonyme',
      amount,
      timestamp: new Date().toISOString(),
    };
    bids.push(bid);

    const updateRes = await fetch(`${AUCTION_SERVICE_URL}/auctions/${auctionId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: req.headers.authorization,
        },
        body: JSON.stringify({ current_price: amount }),
        });

    if (!updateRes.ok) {
    console.error('Erreur mise à jour prix courant dans auction-service');
    return res.status(500).json({ error: 'Erreur mise à jour prix courant dans auction-service' });
    }

    res.status(201).json(bid);
  } catch (err) {
    console.error('Bid error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /bids/:auctionId — récupérer toutes les offres d'une enchère
app.get('/bids/:auctionId', (req, res) => {
  const auctionId = parseInt(req.params.auctionId);
  const auctionBids = bids.filter(b => b.auctionId === auctionId);
  res.json(auctionBids);
});

app.listen(PORT, () => console.log(`Bid Service running on port ${PORT}`));
