const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Pour recevoir des notifications (exemple webhook)
app.post('/notify-winner', (req, res) => {
  const { auction_id, user_id, amount } = req.body;
  console.log(`Notification: User ${user_id} won auction ${auction_id} with amount ${amount}`);
  res.json({ message: 'Notification received' });
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`Notification Service running on port ${PORT}`));
