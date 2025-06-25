const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

let auctions = [];
let auctionId = 1;

// Middleware pour vérifier le token JWT
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

// Création d’une enchère protégée par JWT
app.post('/auctions', authenticateToken, (req, res) => {
  const { title, description = '', starting_price, ends_at } = req.body;

  if (!title || !starting_price || !ends_at) {
    return res.status(400).json({ error: 'Missing required fields' });
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
  };
  auctions.push(auction);
  res.status(201).json(auction);
});

// Liste des enchères (pas besoin d’auth)
app.get('/auctions', (req, res) => {
  res.json(auctions);
});

// Détail enchère (pas besoin d’auth)
app.get('/auctions/:id', (req, res) => {
  const auction = auctions.find(a => a.id === parseInt(req.params.id));
  if (!auction) return res.status(404).json({ error: 'Auction not found' });
  res.json(auction);
});

// Suppression enchère, seulement propriétaire
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

// Fermer une enchère (statut "closed")
app.patch('/auctions/:id/close', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  const auction = auctions.find(a => a.id === id);
  if (!auction) return res.status(404).json({ error: 'Auction not found' });
  if (auction.owner_id !== req.user.userId) {
    return res.status(403).json({ error: 'Forbidden: not the owner' });
  }
  auction.status = 'closed';
  res.json(auction);
});

// Modifier la date de fin (ends_at)
app.patch('/auctions/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  const auction = auctions.find(a => a.id === id);
  if (!auction) return res.status(404).json({ error: 'Auction not found' });
  if (auction.owner_id !== req.user.userId) {
    return res.status(403).json({ error: 'Forbidden: not the owner' });
  }
  const { ends_at } = req.body;
  if (ends_at) {
    auction.ends_at = ends_at;
  }
  res.json(auction);
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Auction Service running on port ${PORT}`));
