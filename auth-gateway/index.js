const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const SERVICES = {
  users: 'http://localhost:3001',
  auctions: 'http://localhost:3002',
  bids: 'http://localhost:3003',
  // notifications: 'http://localhost:3004', // si tu en as un
};

const SECRET_KEY = 'SECRET_KEY'; // même clé que dans user & auction services

// Middleware pour vérifier JWT sauf sur certaines routes publiques (ex: /register, /login)
function authenticateToken(req, res, next) {
  if (req.path === '/register' || req.path === '/login') {
    return next();
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, SECRET_KEY, (err, payload) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = payload;
    next();
  });
}

app.use(authenticateToken);

// Proxy simple : redirige la requête vers le service adéquat selon le chemin
app.use(async (req, res) => {
  try {
    let targetUrl;

    // On redirige explicitement /register et /login vers user service
    if (req.path === '/register' || req.path === '/login' || req.path.startsWith('/users')) {
      targetUrl = SERVICES.users + req.originalUrl;
    } else if (req.path.startsWith('/auctions')) {
      targetUrl = SERVICES.auctions + req.originalUrl;
    } else if (req.path.startsWith('/bids')) {
      targetUrl = SERVICES.bids + req.originalUrl;
    } else {
      return res.status(404).json({ error: 'Unknown route' });
    }

    // Construction des options fetch (méthode, headers, body)
    const options = {
      method: req.method,
      headers: {
        ...req.headers,
        host: new URL(targetUrl).host,  // Evite les conflits
      },
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      options.body = JSON.stringify(req.body);
      options.headers['content-type'] = 'application/json';
    }

    const response = await fetch(targetUrl, options);
    const data = await response.text();

    res.status(response.status);

    // Tenter d'envoyer du JSON sinon du texte brut
    try {
      res.json(JSON.parse(data));
    } catch {
      res.send(data);
    }
  } catch (error) {
    console.error('Gateway error:', error);
    res.status(500).json({ error: 'Gateway internal error' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Auth Gateway running on port ${PORT}`);
});
