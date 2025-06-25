import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const USER_API_URL = 'http://localhost:3001';
  const AUCTION_API_URL = 'http://localhost:3002';
  const BID_API_URL = 'http://localhost:3003'; // Nouveau service bids

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
    bid_amount: '', // montant enchère à placer (pour sélection)
    bid_amounts: {}, // montants enchères par id pour offres dans liste "Toutes les enchères"
  });
  const [isRegister, setIsRegister] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedAuctionId, setSelectedAuctionId] = useState(null);
  const [bids, setBids] = useState([]); // offres sur une enchère sélectionnée

  // Charger toutes les enchères (avec enrichissement côté serveur)
  useEffect(() => {
    if (token) {
      fetch(`${AUCTION_API_URL}/auctions`, {
        headers: { Authorization: 'Bearer ' + token },
      })
        .then(res => res.json())
        .then(setAuctions)
        .catch(() => setAuctions([]));
    }
  }, [token]);

  // Charger les offres pour enchère sélectionnée
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

  // Mettre à jour une enchère (statut ou ends_at)
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
        if (selectedAuctionId === updatedAuction.id) setSelectedAuctionId(updatedAuction.id); // rafraîchir bids si besoin
      })
      .catch(() => setMessage('Erreur mise à jour enchère'));
  };

  // Placer une nouvelle offre sur enchère sélectionnée (bouton général)
  const placeBid = () => {
    if (!selectedAuctionId) {
      setMessage("Sélectionnez d'abord une enchère");
      return;
    }
    if (!form.bid_amount || isNaN(form.bid_amount)) {
      setMessage('Entrez un montant valide');
      return;
    }

    placeBidOnAuction(selectedAuctionId, Number(form.bid_amount));
  };

  // Placer une offre sur une enchère donnée (utilisé aussi dans liste "Toutes les enchères")
  const placeBidOnAuction = (auctionId, amount) => {
    fetch(`${BID_API_URL}/bids`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({ auctionId, amount }),
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(data => {
            throw new Error(data.error || "Erreur lors de l'offre");
          });
        }
        return res.json();
      })
      .then(newBid => {
        setMessage(`Offre placée sur "${auctions.find(a => a.id === auctionId)?.title}" !`);
        // Clear le champ bid_amount pour cette enchère
        setForm(form => ({
          ...form,
          bid_amounts: { ...(form.bid_amounts || {}), [auctionId]: '' },
          bid_amount: auctionId === selectedAuctionId ? '' : form.bid_amount,
        }));
        // Recharge enchères et bids si enchère sélectionnée
        Promise.all([
          fetch(`${AUCTION_API_URL}/auctions`, { headers: { Authorization: 'Bearer ' + token } }).then(r => r.json()),
          auctionId === selectedAuctionId
            ? fetch(`${BID_API_URL}/bids/${selectedAuctionId}`, { headers: { Authorization: 'Bearer ' + token } }).then(r => r.json())
            : Promise.resolve(bids),
        ]).then(([updatedAuctions, updatedBids]) => {
          setAuctions(updatedAuctions);
          if (auctionId === selectedAuctionId) setBids(updatedBids);
        });
      })
      .catch(err => setMessage(err.message));
  };

  // Register, login, createAuction, logout = inchangés

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
        } else if (data.error) {
          setMessage(`Erreur inscription : ${data.error}`);
        } else {
          setMessage('Erreur inscription');
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
          setUser({ ...data.user, userId: data.user.id }); // 👈 userId explicite
          setMessage('Connexion réussie');
          setForm({ ...form, email: '', password: '' });
        } else if (data.error) {
          setMessage(`Erreur login : ${data.error}`);
        } else {
          setMessage('Erreur login : mauvais email ou mot de passe');
        }
      })
      .catch(() => setMessage('Erreur login'));
  };

  const createAuction = () => {
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
        title: form.title,
        starting_price: Number(form.starting_price),
        ends_at: endsAtIso,
      }),
    })
      .then(res => {
        if (res.ok) {
          setMessage('Enchère créée');
          setForm({ ...form, title: '', starting_price: '', ends_at: '' });
          return fetch(`${AUCTION_API_URL}/auctions`, {
            headers: { Authorization: 'Bearer ' + token },
          });
        } else {
          throw new Error('Erreur création enchère');
        }
      })
      .then(res => res.json())
      .then(setAuctions)
      .catch(() => setMessage('Erreur création enchère'));
  };

  const logout = () => {
    setToken('');
    setUser(null);
    setMessage('Déconnecté');
  };

  // Filtrer les enchères pour ne garder que celles du user connecté
  const myAuctions = auctions.filter(a => user && a.owner_id === user.userId);

  return (
    <div className="container">
      <h1 className="title">Plateforme d'enchères</h1>

      {message && (
        <div
          className="alert"
          style={{
            padding: '10px',
            marginBottom: '15px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            borderRadius: '5px',
            color: 'black',
          }}
        >
          {message}
        </div>
      )}

      {!token ? (
        <div className="card">
          {isRegister ? (
            <>
              <h2>Inscription</h2>
              <input
                className="input"
                placeholder="Nom"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
              <input
                className="input"
                placeholder="Email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
              <input
                type="password"
                className="input"
                placeholder="Mot de passe"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
              <button className="button button-green" onClick={register}>
                S'inscrire
              </button>
              <p style={{ marginTop: 10, textAlign: 'center' }}>
                Déjà un compte ?{' '}
                <button className="link-button" onClick={() => setIsRegister(false)}>
                  Se connecter
                </button>
              </p>
            </>
          ) : (
            <>
              <h2>Connexion</h2>
              <input
                className="input"
                placeholder="Email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
              <input
                type="password"
                className="input"
                placeholder="Mot de passe"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
              <button className="button button-blue" onClick={login}>
                Se connecter
              </button>
              <p style={{ marginTop: 10, textAlign: 'center' }}>
                Pas de compte ?{' '}
                <button className="link-button" onClick={() => setIsRegister(true)}>
                  S'inscrire
                </button>
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="flex-between">
            <h2>Créer une enchère</h2>
            <div>
              {user && (
                <span style={{ marginRight: 10 }}>
                  Connecté en tant que <strong>{user.email}</strong>
                </span>
              )}
              <button className="button button-red" onClick={logout}>
                Déconnexion
              </button>
            </div>
          </div>

          <input
            className="input"
            placeholder="Titre"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />
          <input
            type="number"
            className="input"
            placeholder="Prix de départ"
            value={form.starting_price}
            onChange={e => setForm({ ...form, starting_price: e.target.value })}
          />

          <label style={{ marginTop: 10, display: 'block' }}>
            Date de fin :
            <input
              type="date"
              value={form.ends_at}
              onChange={e => setForm({ ...form, ends_at: e.target.value })}
              style={{ marginLeft: 10 }}
            />
          </label>

          <button className="button button-green" onClick={createAuction}>
            Créer
          </button>

          <h2>Mes enchères</h2>
          {myAuctions.length === 0 ? (
            <p>Aucune enchère créée par vous.</p>
          ) : (
            <ul className="auction-list">
              {myAuctions.map(a => (
                <li
                  key={a.id}
                  className="auction-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedAuctionId(a.id)}
                >
                  <strong>{a.title}</strong> <br />
                  Prix courant : {a.current_price} <br />
                  Statut : {a.status} <br />
                  Date de fin : {new Date(a.ends_at).toLocaleDateString()} <br />
                  Propriétaire : {a.owner_name || 'Inconnu'} <br />

                  <label>
                    Modifier date fin :
                    <input
                      type="date"
                      value={a.ends_at.slice(0, 10)}
                      onChange={e =>
                        updateAuction(a.id, { ends_at: new Date(e.target.value + 'T00:00:00').toISOString() })
                      }
                      style={{ marginLeft: 10 }}
                    />
                  </label>

                  {a.status !== 'closed' && (
                    <button
                      className="button button-red"
                      style={{ marginLeft: 10 }}
                      onClick={() => updateAuction(a.id, { status: 'closed' })}
                    >
                      Fermer l'enchère
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <h2>Toutes les enchères</h2>
          {auctions.length === 0 ? (
            <p>Aucune enchère disponible.</p>
          ) : (
            <ul className="auction-list">
              {auctions.map(a => (
                <li
                  key={a.id}
                  className="auction-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedAuctionId(a.id)}
                >
                  <strong>{a.title}</strong> <br />
                  Prix courant : {a.current_price} <br />
                  Statut : {a.status} <br />
                  Date de fin : {new Date(a.ends_at).toLocaleDateString()} <br />
                  Créée par : {a.owner_name || 'Inconnu'}

                  {a.status !== 'closed' && (
                    <div style={{ marginTop: 10 }}>
                      <input
                        type="number"
                        className="input"
                        placeholder="Montant de l'offre"
                        value={form.bid_amounts?.[a.id] || ''}
                        onChange={e =>
                          setForm(form => ({
                            ...form,
                            bid_amounts: { ...(form.bid_amounts || {}), [a.id]: e.target.value },
                          }))
                        }
                        onClick={e => e.stopPropagation()} // empêcher sélection enchère au clic input
                        style={{ width: '120px' }}
                      />
                      <button
                        className="button button-blue"
                        onClick={e => {
                          e.stopPropagation(); // éviter sélection enchère au clic bouton
                          const amount = Number(form.bid_amounts?.[a.id]);
                          if (!amount || amount <= 0) {
                            setMessage('Entrez un montant valide');
                            return;
                          }
                          placeBidOnAuction(a.id, amount);
                        }}
                        style={{ marginLeft: 10 }}
                      >
                        Placer offre
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          
        </>
      )}
    </div>
  );
}

export default App;
