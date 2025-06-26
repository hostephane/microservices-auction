const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

let auctions = [];
let auctionId = 1;

const USER_SERVICE_URL = 'http://localhost:3001';
const NOTIF_SERVICE_URL = 'http://localhost:3004';

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

function isFutureDate(dateStr) {
  return new Date(dateStr) > new Date();
}

function computeStatus(starts_at, ends_at) {
  const now = new Date();
  const start = new Date(starts_at);
  const end = new Date(ends_at);
  if (now < start) return 'pending';
  if (now >= start && now < end) return 'live';
  return 'ended';
}

async function enrichAuction(auction) {
  const status = computeStatus(auction.starts_at, auction.ends_at);
  try {
    const res = await fetch(`${USER_SERVICE_URL}/users/${auction.owner_id}`);
    if (!res.ok) {
      return { ...auction, status, owner_name: 'Inconnu' };
    }
    const user = await res.json();
    return { ...auction, status, owner_name: user.name };
  } catch (error) {
    return { ...auction, status, owner_name: 'Erreur' };
  }
}

app.post('/auctions', authenticateToken, async (req, res) => {
  const { title, description = '', starting_price, starts_at, ends_at } = req.body;
  if (!title || !starting_price || !starts_at || !ends_at) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const start = new Date(starts_at);
  const end = new Date(ends_at);
  if (isNaN(start) || isNaN(end) || start >= end || end <= new Date()) {
    return res.status(400).json({ error: 'Invalid starts_at or ends_at' });
  }

  let owner_email = 'Inconnu';
  try {
    const resUser = await fetch(`${USER_SERVICE_URL}/users/${req.user.userId}`);
    const user = await resUser.json();
    if (resUser.ok) owner_email = user.email;
  } catch {}

  const auction = {
    id: auctionId++,
    title,
    description,
    starting_price,
    current_price: starting_price,
    starts_at,
    ends_at,
    owner_id: req.user.userId,
    owner_email,
    winner_id: null,
  };

  auctions.push(auction);
  res.status(201).json({ ...auction, status: computeStatus(starts_at, ends_at) });
});

app.get('/auctions', async (req, res) => {
  const enriched = await Promise.all(auctions.map(enrichAuction));
  res.json(enriched);
});

app.get('/auctions/:id', (req, res) => {
  const auction = auctions.find(a => a.id === parseInt(req.params.id));
  if (!auction) return res.status(404).json({ error: 'Auction not found' });
  res.json({ ...auction, status: computeStatus(auction.starts_at, auction.ends_at) });
});

app.put('/auctions/:id', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id);
  const auction = auctions.find(a => a.id === id);
  if (!auction) return res.status(404).json({ error: 'Auction not found' });

  if (req.body.starts_at || req.body.ends_at) {
    if (auction.owner_id !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden: not the owner' });
    }
  }

  if (req.body.ends_at) {
    const end = new Date(req.body.ends_at);
    const start = new Date(auction.starts_at);
    if (isNaN(end) || end <= start) {
      return res.status(400).json({ error: 'Invalid ends_at: must be after starts_at' });
    }
    auction.ends_at = req.body.ends_at;
  }

  if (req.body.starts_at) {
    const start = new Date(req.body.starts_at);
    if (isNaN(start) || start >= new Date(auction.ends_at)) {
      return res.status(400).json({ error: 'Invalid starts_at' });
    }
    auction.starts_at = req.body.starts_at;
  }

  if (req.body.current_price !== undefined) {
    if (typeof req.body.current_price !== 'number' || req.body.current_price <= auction.current_price) {
      return res.status(400).json({ error: 'Invalid current_price' });
    }
    auction.current_price = req.body.current_price;
  }

  const enrichedAuction = await enrichAuction(auction);
  res.json(enrichedAuction);
});

app.delete('/auctions/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  const auction = auctions.find(a => a.id === id);
  if (!auction) return res.status(404).json({ error: 'Auction not found' });
  if (auction.owner_id !== req.user.userId) {
    return res.status(403).json({ error: 'Forbidden: not the owner' });
  }
  auctions = auctions.filter(a => a.id !== id);
  res.status(204).send();
});

// Route pour accepter le gagnant et envoyer la notif
app.post('/auctions/:id/accept', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id);

  const auction = auctions.find(a => a.id === id);
  if (!auction) return res.status(404).json({ error: 'Auction not found' });

  if (auction.owner_id !== req.user.userId) {
    return res.status(403).json({ error: 'You are not the owner of this auction' });
  }

  // On met fin à l'enchère en mettant ends_at à maintenant si elle n'est pas finie
  if (computeStatus(auction.starts_at, auction.ends_at) !== 'ended') {
    auction.ends_at = new Date().toISOString();
  }

  // Récupérer les offres (il faudrait que tu gères ça dans ton service bids)
  // Pour l'exemple, supposons que winner_id est passé dans le corps, sinon on prend winner_id actuel
  let winner_id = req.body.winner_id || auction.winner_id;

  if (!winner_id) {
    return res.status(400).json({ error: 'Winner id is required' });
  }

  auction.winner_id = winner_id;

  // Envoi notification au gagnant
  try {
    const notifRes = await fetch(`${NOTIF_SERVICE_URL}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: winner_id,
        message: `Vous avez gagné l'enchère "${auction.title}" !`,
        auction_id: auction.id,
        type: 'Gagnant',
      }),
    });

    if (!notifRes.ok) {
      console.error('Erreur envoi notif gagnant');
    }
  } catch (e) {
    console.error('Erreur envoi notif gagnant', e);
  }

  const enrichedAuction = await enrichAuction(auction);
  res.json({ message: 'Winner accepted and notified', auction: enrichedAuction });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Auction Service running on port ${PORT}`));
