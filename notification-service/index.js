const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let notifications = [];
let notificationId = 1;

// POST /notify — enregistrer une notification
app.post('/notify', (req, res) => {
  const { user_id, auction_id, message, type = 'Info' } = req.body;

  if (!user_id || !message) {
    return res.status(400).json({ error: 'user_id et message requis' });
  }

  const notif = {
    id: notificationId++,
    user_id,
    auction_id,
    message,
    type,
    timestamp: new Date().toISOString(),
  };

  notifications.push(notif);
  res.status(201).json(notif);
});

// GET /notifications/:userId — récupérer les notifications d’un utilisateur
app.get('/notifications/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const userNotifications = notifications.filter(n => n.user_id === userId);
  res.json(userNotifications);
});

// DELETE /notifications/:id — supprimer une notification
app.delete('/notifications/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const exists = notifications.some(n => n.id === id);
  if (!exists) return res.status(404).json({ error: 'Notification introuvable' });

  notifications = notifications.filter(n => n.id !== id);
  res.status(204).send();
});

const PORT = 3004;
app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
});
