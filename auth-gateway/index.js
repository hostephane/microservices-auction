const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use(cors());
app.use(express.json());

// Middleware pour vérifier le JWT et passer la requête
app.use((req, res, next) => {
  if (req.path === '/login' || req.path === '/register') return next();
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, 'SECRET_KEY', (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.userId = decoded.userId;
    next();
  });
});

// Proxy vers user-service
app.use('/register', createProxyMiddleware({ target: 'http://localhost:3001', changeOrigin: true }));
app.use('/login', createProxyMiddleware({ target: 'http://localhost:3001', changeOrigin: true }));
// Proxy vers auction-service
app.use('/auctions', createProxyMiddleware({ target: 'http://localhost:3002', changeOrigin: true }));
// Proxy vers bid-service
app.use('/bids', createProxyMiddleware({ target: 'http://localhost:3003', changeOrigin: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Auth Gateway running on port ${PORT}`));
