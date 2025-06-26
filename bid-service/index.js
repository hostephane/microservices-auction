const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const AUCTION_SERVICE_URL = 'http://localhost:3002';
const NOTIFICATION_SERVICE_URL = 'http://localhost:3004/notify';
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

    if (auction.status !== 'live') {
      return res.status(400).json({ error: 'Auction is not live' });
    }

    if (auction.owner_id === req.user.userId) {
      return res.status(400).json({ error: 'Le propriétaire ne peut pas enchérir sur sa propre enchère' });
    }

    if (amount <= auction.current_price) {
      return res.status(400).json({ error: 'Bid must be higher than current price' });
    }

    // Ancien meilleur enchérisseur (avant d'enregistrer le nouveau bid)
    const previousHighestBid = [...bids]
      .filter(b => b.auctionId === auctionId)
      .sort((a, b) => b.amount - a.amount)[0];

    // Enregistrement du bid
    const bid = {
      id: bidId++,
      auctionId,
      bidderId: req.user.userId,
      bidderName: req.user.name || req.user.email || 'Anonyme',
      amount,
      timestamp: new Date().toISOString(),
    };
    bids.push(bid);

    // Mise à jour du prix courant dans auction-service
    const updateRes = await fetch(`${AUCTION_SERVICE_URL}/auctions/${auctionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: req.headers.authorization,
      },
      body: JSON.stringify({ current_price: amount }),
    });

    if (!updateRes.ok) {
      return res.status(500).json({ error: 'Erreur mise à jour prix courant dans auction-service' });
    }

    // ⚡ Notifications :

    // 1. Notifier le créateur de l’enchère (si ce n’est pas lui-même qui a bid)
    if (auction.owner_id && auction.owner_id !== req.user.userId) {
      await sendNotification({
        user_id: auction.owner_id,
        auction_id: auctionId,
        message: `Nouvelle offre de ${amount} sur votre enchère "${auction.title}".`,
      });
    }

    // 2. Notifier l'ancien enchérisseur (si différent)
    if (
      previousHighestBid &&
      previousHighestBid.bidderId !== req.user.userId
    ) {
      await sendNotification({
        user_id: previousHighestBid.bidderId,
        auction_id: auctionId,
        message: `Vous avez été surenchéri sur "${auction.title}".`,
      });
    }

    // 3. Notifier l'utilisateur actuel (optionnel)
    await sendNotification({
      user_id: req.user.userId,
      auction_id: auctionId,
      message: `Votre offre de ${amount} a bien été placée sur "${auction.title}".`,
    });

    res.status(201).json(bid);
  } catch (err) {
    console.error('Bid error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Fonction générique d’envoi de notification
async function sendNotification({ user_id, auction_id, message }) {
  try {
    const res = await fetch(NOTIFICATION_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, auction_id, message }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Erreur notification :', err);
    }
  } catch (err) {
    console.error('Erreur réseau notification :', err.message);
  }
}

// GET /bids/:auctionId — récupérer les offres pour une enchère
app.get('/bids/:auctionId', (req, res) => {
  const auctionId = parseInt(req.params.auctionId);
  const auctionBids = bids.filter(b => b.auctionId === auctionId);
  res.json(auctionBids);
});

// GET /bids/user/:userId — récupérer les offres d’un utilisateur
app.get('/bids/user/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const userBids = bids.filter(b => b.bidderId === userId);
  res.json(userBids);
});

// ✅ GET /bids/last/:auctionId — dernier enchérisseur
app.get('/bids/last/:auctionId', (req, res) => {
  const auctionId = parseInt(req.params.auctionId);
  const auctionBids = bids.filter(b => b.auctionId === auctionId);
  if (auctionBids.length === 0) return res.status(404).json({ error: 'No bids found' });
  const last = [...auctionBids].sort((a, b) => b.amount - a.amount)[0];
  res.json(last);
});

// ✅ POST /winner/:auctionId — accepter l'offre gagnante
app.post('/winner/:auctionId', authenticateToken, async (req, res) => {
  const auctionId = parseInt(req.params.auctionId);
  const auctionBids = bids.filter(b => b.auctionId === auctionId);
  if (auctionBids.length === 0) {
    return res.status(404).json({ error: 'No bids found for this auction' });
  }

  const bestBid = [...auctionBids].sort((a, b) => b.amount - a.amount)[0];

  try {
    const update = await fetch(`${AUCTION_SERVICE_URL}/auctions/${auctionId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: req.headers.authorization,
      },
      body: JSON.stringify({ winner_id: bestBid.bidderId }),
    });

    if (!update.ok) {
      const errText = await update.text();
      return res.status(update.status).send(errText);
    }

    // Notifier le gagnant
    await sendNotification({
      user_id: bestBid.bidderId,
      auction_id: auctionId,
      message: `Félicitations ! Votre offre de ${bestBid.amount} a été acceptée.`,
    });

    res.json({ message: 'Gagnant accepté avec succès', winner: bestBid });
  } catch (err) {
    console.error('Erreur acceptation gagnant:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.listen(PORT, () => console.log(`Bid Service running on port ${PORT}`));
