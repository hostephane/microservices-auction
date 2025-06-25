import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const AUCTION_API_URL = 'http://localhost:3002';
  const BID_API_URL = 'http://localhost:3003';
  const USER_API_URL = 'http://localhost:3001';

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
  });
  const [isRegister, setIsRegister] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedAuctionId, setSelectedAuctionId] = useState(null);
  const [bids, setBids] = useState([]);

  // Charger toutes les enchères
  useEffect(() => {
    if (token) {
      fetch(`${AUCTION_API_URL}/auctions`, {
        headers: { Authorization: 'Bearer ' + token },
      })
        .then(res => res.json())
        .then(setAuctions)
        .catch(() => setAuctions([]));
    } else {
      setAuctions([]);
      setSelectedAuctionId(null);
      setBids([]);
    }
  }, [token]);

  // Charger les offres de l'enchère sélectionnée
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

  const placeBid = () => {
    if (!selectedAuctionId) {
      setMessage("Sélectionnez d'abord une enchère");
      return;
    }
    if (!form.bid_amount || isNaN(form.bid_amount)) {
      setMessage('Entrez un montant valide');
      return;
    }

    fetch(`${BID_API_URL}/bids`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({
        auctionId: selectedAuctionId,
        amount: Number(form.bid_amount),
      }),
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
        setMessage('Offre placée !');
        setForm({ ...form, bid_amount: '' });
        // Forcer rafraîchissement des enchères et des offres
        fetch(`${AUCTION_API_URL}/auctions`, {
          headers: { Authorization: 'Bearer ' + token },
        })
          .then(res => res.json())
          .then(updatedAuctions => setAuctions(updatedAuctions));

        // Recharger les bids en rappelant setSelectedAuctionId
        setSelectedAuctionId(id => id); // déclenche useEffect
      })
      .catch(err => setMessage(err.message));
  };

  // Les fonctions register, login, createAuction, logout restent inchangées
  // Si besoin, je peux te les remettre, sinon je me concentre sur le front.

  // Filtrer les enchères du user connecté
  const myAuctions = auctions.filter(a => user && a.owner_id === user.userId);

  return (
    <div className="container">
      <h1 className="title">Plateforme d'enchères</h1>

      {message && (
        <div className="alert" style={{ padding: 10, marginBottom: 15, backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: 5, color: 'black' }}>
          {message}
        </div>
      )}

      {!token ? (
        /* Formulaire connexion / inscription ici, inchangé */
        <div className="card">
          {/* ... */}
        </div>
      ) : (
        <>
          {/* Création d'enchère et affichage utilisateur, inchangé */}

          <h2>Mes enchères</h2>
          {myAuctions.length === 0 ? (
            <p>Aucune enchère créée par vous.</p>
          ) : (
            <ul className="auction-list">
              {myAuctions.map(a => (
                <li
                  key={a.id}
                  className={`auction-item ${selectedAuctionId === a.id ? 'selected' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedAuctionId(a.id)}
                >
                  <strong>{a.title}</strong> <br />
                  Prix courant : {a.current_price} <br />
                  Statut : {a.status} <br />
                  Date de fin : {new Date(a.ends_at).toLocaleDateString()} <br />
                  Propriétaire : {a.owner_name || 'Inconnu'} <br />

                  {/* ... champs modification date fin + fermeture */}
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
                  className={`auction-item ${selectedAuctionId === a.id ? 'selected' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedAuctionId(a.id)}
                >
                  <strong>{a.title}</strong> <br />
                  Prix courant : {a.current_price} <br />
                  Statut : {a.status} <br />
                  Date de fin : {new Date(a.ends_at).toLocaleDateString()} <br />
                  Créée par : {a.owner_name || 'Inconnu'}
                </li>
              ))}
            </ul>
          )}

          {selectedAuctionId && (
            <>
              <h2>Offres pour l'enchère sélectionnée</h2>
              {bids.length === 0 ? (
                <p>Aucune offre pour cette enchère.</p>
              ) : (
                <ul className="auction-list">
                  {bids.map(b => (
                    <li key={b.id} className="auction-item">
                      Offreur : {b.bidderId} <br />
                      Montant : {b.amount} <br />
                      Date : {new Date(b.timestamp).toLocaleString()}
                    </li>
                  ))}
                </ul>
              )}

              {auctions.find(a => a.id === selectedAuctionId)?.status !== 'closed' && (
                <div>
                  <input
                    type="number"
                    className="input"
                    placeholder="Montant de l'offre"
                    value={form.bid_amount}
                    onChange={e => setForm({ ...form, bid_amount: e.target.value })}
                  />
                  <button className="button button-blue" onClick={placeBid}>
                    Placer une offre
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
