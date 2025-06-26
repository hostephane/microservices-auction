import React, { useState, useEffect } from 'react';
import './App.css';
import MainUI from './MainUI';

function App() {
  const USER_API_URL = 'http://localhost:3001';
  const AUCTION_API_URL = 'http://localhost:3002';
  const BID_API_URL = 'http://localhost:3003';
  const NOTIF_API_URL = 'http://localhost:3004';

  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [auctions, setAuctions] = useState([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    title: '',
    starting_price: '',
    ends_at: '',
    bid_amount: '',
    bid_amounts: {},
  });
  const [isRegister, setIsRegister] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedAuctionId, setSelectedAuctionId] = useState(null);
  const [bids, setBids] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(true);

  // Mes enchères
  const myAuctions = auctions.filter(a => user && a.owner_id === user.userId);

// Chargement des enchères à chaque changement de token (connexion/déconnexion)
useEffect(() => {
  if (!token) return;

  fetch(`${AUCTION_API_URL}/auctions`, {
    headers: { Authorization: 'Bearer ' + token },
  })
    .then(res => res.json())
    .then(setAuctions)
    .catch(() => setAuctions([]));
}, [token]);

// Chargement des offres pour l'enchère sélectionnée
useEffect(() => {
  if (selectedAuctionId && token) {
    fetch(`${BID_API_URL}/bids/${selectedAuctionId}`, {
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(res => res.json())
      .then(setBids)
      .catch(() => setBids([]));
  } else {
    setBids([]);
  }
}, [selectedAuctionId, token]);

// Chargement des notifications avec rafraîchissement toutes les 5 secondes
useEffect(() => {
  if (!token) return;

  const fetchNotifications = () => {
    fetch(`${NOTIF_API_URL}/notifications`, {
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(res => res.json())
      .then(setNotifications)
      .catch(() => setNotifications([]));
  };

  fetchNotifications(); // fetch initial

  const intervalId = setInterval(fetchNotifications, 5000); // toutes les 5s

  return () => clearInterval(intervalId); // nettoyage à la désactivation du composant ou changement token
}, [token]);


  // 📦 Auth
  const register = () => {
    fetch(`${USER_API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setMessage('Inscription réussie, vous pouvez maintenant vous connecter.');
          setIsRegister(false);
          setUser(null);
          setForm({ ...form, name: '', email: '', password: '' });
        } else {
          setMessage(`Erreur inscription : ${data.error || 'Erreur inconnue'}`);
        }
      })
      .catch(() => setMessage('Erreur inscription'));
  };

  const login = () => {
    fetch(`${USER_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, password: form.password }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          setToken(data.token);
          setUser({ ...data.user, userId: data.user.id });
          setMessage('Connexion réussie');
          setForm({ ...form, email: '', password: '' });
        } else {
          setMessage(`Erreur login : ${data.error || 'mauvais email ou mot de passe'}`);
        }
      })
      .catch(() => setMessage('Erreur login'));
  };

  const logout = () => {
    setToken('');
    setUser(null);
    setMessage('Déconnecté');
  };

  // 🎯 Enchères
  const createAuction = () => {
    if (!form.title.trim()) {
      setMessage('Le titre est obligatoire');
      return;
    }
    if (!form.starting_price || isNaN(form.starting_price) || Number(form.starting_price) <= 0) {
      setMessage('Le prix de départ doit être un nombre positif');
      return;
    }

    const startsAtIso = new Date().toISOString();
    const endsAtIso = form.ends_at
      ? new Date(form.ends_at + 'T00:00:00').toISOString()
      : new Date(Date.now() + 86400000).toISOString();

    fetch(`${AUCTION_API_URL}/auctions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({
        title: form.title.trim(),
        starting_price: Number(form.starting_price),
        starts_at: startsAtIso,
        ends_at: endsAtIso,
      }),
    })
      .then(async res => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Erreur création enchère');
        }
        const auctionsRes = await fetch(`${AUCTION_API_URL}/auctions`, {
          headers: { Authorization: 'Bearer ' + token },
        });
        return auctionsRes.json();
      })
      .then(data => {
        setMessage('Enchère créée');
        setForm({ ...form, title: '', starting_price: '', ends_at: '' });
        setAuctions(data);
      })
      .catch(err => setMessage(err.message));
  };

  const updateAuction = (id, updates) => {
    fetch(`${AUCTION_API_URL}/auctions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify(updates),
    })
      .then(res => {
        if (!res.ok) throw new Error('Erreur mise à jour');
        return res.json();
      })
      .then(updatedAuction => {
        setMessage('Enchère mise à jour');
        setAuctions(auctions.map(a => (a.id === updatedAuction.id ? updatedAuction : a)));
        if (selectedAuctionId === updatedAuction.id) setSelectedAuctionId(updatedAuction.id);
      })
      .catch(() => setMessage('Erreur mise à jour enchère'));
  };

  // 💸 Offres
  const placeBidOnAuction = (auctionId, amount) => {
    fetch(`${BID_API_URL}/bids`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({ auctionId, amount: Number(amount) }),
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(data => {
            throw new Error(data.error || "Erreur lors de l'offre");
          });
        }
        return res.json();
      })
      .then(() => {
        setMessage(`Offre placée sur "${auctions.find(a => a.id === auctionId)?.title}" !`);
        setForm(form => ({
          ...form,
          bid_amounts: { ...(form.bid_amounts || {}), [auctionId]: '' },
          bid_amount: auctionId === selectedAuctionId ? '' : form.bid_amount,
        }));
        return Promise.all([
          fetch(`${AUCTION_API_URL}/auctions`, { headers: { Authorization: 'Bearer ' + token } }).then(r => r.json()),
          auctionId === selectedAuctionId
            ? fetch(`${BID_API_URL}/bids/${selectedAuctionId}`, { headers: { Authorization: 'Bearer ' + token } }).then(r => r.json())
            : Promise.resolve(bids),
        ]);
      })
      .then(([updatedAuctions, updatedBids]) => {
        setAuctions(updatedAuctions);
        if (auctionId === selectedAuctionId) setBids(updatedBids);
      })
      .catch(err => setMessage(err.message));
  };

  const onDeleteNotification = (id) => {
  fetch(`${NOTIF_API_URL}/notifications/${id}`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token }
  })
    .then(res => {
      if (!res.ok) throw new Error('Échec suppression notification');
      setNotifications(notifications => notifications.filter(n => n.id !== id));
    })
    .catch(() => setMessage("Erreur lors de la suppression de la notification"));
};


  return (
    <MainUI
      token={token}
      user={user}
      message={message}
      isRegister={isRegister}
      form={form}
      auctions={auctions}
      notifications={notifications}
      showNotifications={showNotifications}
      myAuctions={myAuctions}
      setForm={setForm}
      setIsRegister={setIsRegister}
      setSelectedAuctionId={setSelectedAuctionId}
      register={register}
      login={login}
      logout={logout}
      createAuction={createAuction}
      updateAuction={updateAuction}
      placeBidOnAuction={placeBidOnAuction}
      setShowNotifications={setShowNotifications}
      onDeleteNotification={onDeleteNotification}
    />
  );
}

export default App;
