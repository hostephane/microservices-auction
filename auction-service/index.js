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
  const now = new Date();
  const input = new Date(dateStr);
  return input > now;
}

function updateAuctionStatusIfNeeded(auction) {
  if (auction.status === 'open' && new Date(auction.ends_at) < new Date()) {
    auction.status = 'closed';
  }
  return auction;
}

async function enrichAuction(auction) {
  const updatedAuction = updateAuctionStatusIfNeeded(auction);

  try {
    const res = await fetch(`${USER_SERVICE_URL}/users/${auction.owner_id}`);
    if (!res.ok) {
      return { ...updatedAuction, owner_name: 'Inconnu' };
    }
    const user = await res.json();
    return { ...updatedAuction, owner_name: user.name };
  } catch (error) {
    return { ...updatedAuction, owner_name: 'Erreur' };
  }
}

// POST /auctions
app.post('/auctions', authenticateToken, async (req, res) => {
  const { title, description = '', starting_price, ends_at } = req.body;
  if (!title || !starting_price || !ends_at) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!isFutureDate(ends_at)) {
    return res.status(400).json({ error: 'La date de fin doit être dans le futur.' });
  }

  let owner_email = 'Inconnu';
  try {
    const resUser = await fetch(`${USER_SERVICE_URL}/users/${req.user.userId}`);
    const user = await resUser.json();
    if (resUser.ok) {
      owner_email = user.email;
    }
  } catch (err) {
    console.error('Erreur récupération email', err);
  }

  const auction = {
    id: auctionId++,
    title,
    description,
    starting_price,
    current_price: starting_price,
    status: 'open',
    ends_at,
    owner_id: req.user.userId,
    owner_email
  };

  auctions.push(auction);
  res.status(201).json(auction);
});

// GET /auctions
app.get('/auctions', async (req, res) => {
  const enriched = await Promise.all(auctions.map(enrichAuction));
  res.json(enriched);
});

// GET /auctions/:id
app.get('/auctions/:id', (req, res) => {
  const auction = auctions.find(a => a.id === parseInt(req.params.id));
  if (!auction) return res.status(404).json({ error: 'Auction not found' });

  // Mise à jour éventuelle du statut
  updateAuctionStatusIfNeeded(auction);

  res.json(auction);
});

// PUT /auctions/:id
app.put('/auctions/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  const auction = auctions.find(a => a.id === id);
  if (!auction) return res.status(404).json({ error: 'Auction not found' });

  if (req.body.current_price !== undefined) {
    if (typeof req.body.current_price !== 'number' || req.body.current_price <= 0) {
      return res.status(400).json({ error: 'Invalid current_price' });
    }
    auction.current_price = req.body.current_price;
  }

  if (auction.owner_id !== req.user.userId) {
    if ('status' in req.body || 'ends_at' in req.body) {
      return res.status(403).json({ error: 'Forbidden: not the owner' });
    }
  } else {
    if (req.body.ends_at && !isFutureDate(req.body.ends_at)) {
      return res.status(400).json({ error: 'La date de fin doit être dans le futur.' });
    }
    if (req.body.status) auction.status = req.body.status;
    if (req.body.ends_at) auction.ends_at = req.body.ends_at;
  }

  res.json(auction);
});

// DELETE /auctions/:id
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

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Auction Service running on port ${PORT}`));
