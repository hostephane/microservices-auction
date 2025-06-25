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

// Middleware d’authentification
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

// Fonction pour enrichir une enchère avec l'email du propriétaire
async function enrichAuction(auction) {
  try {
    console.log(`🔄 Tentative de récupération du user ${auction.owner_id}`);
    const res = await fetch(`${USER_SERVICE_URL}/users/${auction.owner_id}`);
    if (!res.ok) {
      console.warn('❌ Utilisateur non trouvé');
      return { ...auction, owner_name: 'Inconnu' };
    }
    const user = await res.json();
    console.log('✅ Utilisateur récupéré :', user);
    return { ...auction, owner_name: user.name };
  } catch (error) {
    console.error('❌ Erreur enrichAuction:', error);
    return { ...auction, owner_name: 'Erreur' };
  }
}



// POST /auctions
app.post('/auctions', authenticateToken, async (req, res) => {
  const { title, description = '', starting_price, ends_at } = req.body;
  if (!title || !starting_price || !ends_at) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Enrichir avec email
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
    owner_email // Ajout immédiat
  };

  auctions.push(auction);
  res.status(201).json(auction); // renvoyer avec owner_email
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
  res.json(auction);
});

// PUT /auctions/:id
app.put('/auctions/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  const auction = auctions.find(a => a.id === id);

  if (!auction) return res.status(404).json({ error: 'Auction not found' });

  // Si tentative mise à jour current_price
  if (req.body.current_price !== undefined) {
    if (typeof req.body.current_price !== 'number' || req.body.current_price <= 0) {
      return res.status(400).json({ error: 'Invalid current_price' });
    }
    auction.current_price = req.body.current_price;
  }

  // Propriétaire peut modifier status et ends_at uniquement
  if (auction.owner_id !== req.user.userId) {
    if ('status' in req.body || 'ends_at' in req.body) {
      return res.status(403).json({ error: 'Forbidden: not the owner' });
    }
  } else {
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
