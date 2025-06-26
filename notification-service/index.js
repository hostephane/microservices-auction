const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Stockage en mémoire des notifications
let notifications = [];

// POST /notify
app.post('/notify', (req, res) => {
  const { user_id, auction_id, message } = req.body;

  if (!user_id || !auction_id || !message) {
    return res.status(400).json({ error: 'Missing fields in notification' });
  }

  const notif = {
    id: notifications.length + 1,
    timestamp: new Date().toISOString(),
    user_id,
    auction_id,
    message
  };

  notifications.push(notif);
  console.log('📢 Nouvelle notification :', notif);
  res.status(201).json({ message: 'Notification enregistrée', notif });
});

// GET /notifications
app.get('/notifications', (req, res) => {
  res.json(notifications);
});

// GET /notifications/user/:userId
app.get('/notifications/user/:userId', (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ error: 'userId manquant' });
  }

  const userNotifications = notifications
    .filter(n => String(n.user_id) === String(userId))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json(userNotifications);
});

// DELETE /notifications/:id - supprimer une notification
app.delete('/notifications/:id', (req, res) => {
  const { id } = req.params;
  const index = notifications.findIndex(n => String(n.id) === String(id));

  if (index === -1) {
    return res.status(404).json({ error: 'Notification non trouvée' });
  }

  notifications.splice(index, 1);
  res.json({ message: 'Notification supprimée' });
});


const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
});


