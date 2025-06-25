const express = require('express');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

const USER_SERVICE_URL = 'http://localhost:3001';
const AUCTION_SERVICE_URL = 'http://localhost:3002';
const BID_SERVICE_URL = 'http://localhost:3003';

const SECRET_KEY = 'SECRET_KEY'; // même clé que dans tes microservices

// Middleware pour vérifier le JWT
function authenticateToken(req, res, next) {
  if (req.path === '/login' || req.path === '/register') {
    // Pas besoin de token pour ces routes
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  const token = authHeader.split(' ')[1];

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

app.use(authenticateToken);

// Proxy selon les routes
app.use('/users', createProxyMiddleware({ target: USER_SERVICE_URL, changeOrigin: true }));
app.use('/auctions', createProxyMiddleware({ target: AUCTION_SERVICE_URL, changeOrigin: true }));
app.use('/bids', createProxyMiddleware({ target: BID_SERVICE_URL, changeOrigin: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Auth Gateway running on port ${PORT}`));
