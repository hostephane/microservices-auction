import React, { useState } from 'react';

function MainUI({
  token,
  user,
  message,
  setMessage,
  isRegister,
  form,
  auctions,
  notifications,
  showNotifications,
  myAuctions,
  setForm,
  setIsRegister,
  setSelectedAuctionId,
  register,
  login,
  logout,
  createAuction,
  updateAuction,
  placeBidOnAuction,
  setShowNotifications,
  onDeleteNotification,
  lastBids = {},
  acceptAuctionWinner,
}) {

  const [filterStatus, setFilterStatus] = useState('all');

  const filteredAuctions =
    filterStatus === 'all'
      ? auctions
      : auctions.filter((a) => a.status === filterStatus);



  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
      {/* TITRE + MESSAGE */}
      <h1 style={{ textAlign: 'center', marginBottom: 20 }}>Plateforme d'enchères</h1>

      {message && (
        <div
          style={{
            padding: '10px',
            marginBottom: '15px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '5px',
            color: '#721c24',
            maxWidth: 600,
            margin: '0 auto 20px',
            textAlign: 'center',
          }}
        >
          {message}
        </div>
      )}

      {!token ? (
        <div
          style={{
            maxWidth: 400,
            margin: '0 auto',
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          {isRegister ? (
            <>
              <h2>Inscription</h2>
              <input
                className="input"
                placeholder="Nom"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{ width: '100%', marginBottom: 10, padding: 8 }}
              />
              <input
                className="input"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={{ width: '100%', marginBottom: 10, padding: 8 }}
              />
              <input
                type="password"
                className="input"
                placeholder="Mot de passe"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                style={{ width: '100%', marginBottom: 15, padding: 8 }}
              />
              <button
                className="button button-green"
                onClick={register}
                style={{ width: '100%', padding: 10, fontWeight: 'bold' }}
              >
                S'inscrire
              </button>
              <p style={{ marginTop: 15, textAlign: 'center' }}>
                Déjà un compte ?{' '}
                <button
                  className="link-button"
                  onClick={() => setIsRegister(false)}
                  style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer' }}
                >
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
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={{ width: '100%', marginBottom: 10, padding: 8 }}
              />
              <input
                type="password"
                className="input"
                placeholder="Mot de passe"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                style={{ width: '100%', marginBottom: 15, padding: 8 }}
              />
              <button
                className="button button-blue"
                onClick={login}
                style={{ width: '100%', padding: 10, fontWeight: 'bold' }}
              >
                Se connecter
              </button>
              <p style={{ marginTop: 15, textAlign: 'center' }}>
                Pas de compte ?{' '}
                <button
                  className="link-button"
                  onClick={() => setIsRegister(true)}
                  style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer' }}
                >
                  S'inscrire
                </button>
              </p>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 30 }}>
          {/* Colonne Gauche */}
          <div style={{ flex: 1, maxWidth: '45%' }}>
            <div
              className="flex-between"
              style={{ marginBottom: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <h2 style={{ margin: 0 }}>Créer une enchère</h2>
              <div>
                {user && (
                  <span style={{ marginRight: 10, fontSize: 14, color: '#555' }}>
                    Connecté en tant que <strong>{user.email}</strong>
                  </span>
                )}
                <button className="button button-red" onClick={logout} style={{ padding: '6px 12px' }}>
                  Déconnexion
                </button>
              </div>
            </div>

            <input
              className="input"
              placeholder="Titre"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={{ width: '100%', marginBottom: 10, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
            />
            <input
              type="number"
              className="input"
              placeholder="Prix de départ"
              value={form.starting_price}
              onChange={(e) => setForm({ ...form, starting_price: e.target.value })}
              style={{ width: '100%', marginBottom: 10, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
            />
            <label style={{ marginBottom: 10, display: 'block', fontSize: 14 }}>
              Date de fin :
              <input
                type="date"
                value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                style={{ marginLeft: 10, padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
              />
            </label>
            <button
              className="button button-green"
              onClick={createAuction}
              style={{ marginBottom: 30, width: '100%', padding: 10, fontWeight: 'bold' }}
            >
              Créer
            </button>

            <h2>Mes enchères</h2>
            {myAuctions.length === 0 ? (
              <p>Aucune enchère créée par vous.</p>
            ) : (
              <ul
                className="auction-list"
                style={{
                  listStyle: 'none',
                  paddingLeft: 0,
                  maxHeight: 350,
                  overflowY: 'auto',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  padding: 10,
                }}
              >
                {myAuctions.map((a) => (
                  <li
                    key={a.id}
                    className="auction-item"
                    style={{
                      cursor: 'pointer',
                      borderBottom: '1px solid #eee',
                      padding: '8px 5px',
                      userSelect: 'none',
                    }}
                    onClick={() => setSelectedAuctionId(a.id)}
                  >
                    <strong>{a.title}</strong> <br />
                    Prix courant : {a.current_price} <br />
                    Statut : {a.status} <br />
                    Date de fin : {new Date(a.ends_at).toLocaleDateString()} <br />
                    Propriétaire : {a.owner_name || 'Inconnu'} <br />

                    <label style={{ fontSize: 13 }}>
                      Modifier date fin :
                      <input
                        type="date"
                        value={a.ends_at.slice(0, 10)}
                        onChange={(e) =>
                          updateAuction(a.id, {
                            ends_at: new Date(e.target.value + 'T00:00:00').toISOString(),
                          })
                        }
                        style={{ marginLeft: 10, padding: 4, borderRadius: 4, border: '1px solid #ccc' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </label>

                    {a.status !== 'ended' && (
                      <button
                        className="button button-red"
                        style={{ marginLeft: 10, marginTop: 8 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateAuction(a.id, {
                            ends_at: new Date(Date.now() - 1000).toISOString(),
                          });
                        }}
                      >
                        Fermer l'enchère
                      </button>
                    )}
                    
                    {/* Bouton accepter l'offre gagnante */}
                    {a.status === 'live' && lastBids[a.id] && (
                    <button
                        className="button button-green"
                        onClick={(e) => {
                        e.stopPropagation();
                        acceptAuctionWinner(a.id, lastBids[a.id]);
                        }}
                    >
                        Accepter l'offre gagnante
                    </button>
                    )}





                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Colonne Droite */}
          <div style={{ flex: 1, maxWidth: '55%', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Notifications */}
            {notifications.length > 0 && showNotifications && (
              <div
                style={{
                  border: '1px solid #ccc',
                  padding: 15,
                  maxHeight: 200,
                  overflowY: 'auto',
                  backgroundColor: '#f9f9f9',
                  borderRadius: 6,
                  position: 'relative',
                }}
              >
                <button
                  onClick={() => setShowNotifications(false)}
                  aria-label="Fermer notifications"
                  title="Fermer"
                  style={{
                    position: 'absolute',
                    top: 5,
                    right: 5,
                    background: 'transparent',
                    border: 'none',
                    fontSize: 20,
                    cursor: 'pointer',
                    color: '#999',
                  }}
                >
                  ×
                </button>
                <h3 style={{ marginTop: 0, marginBottom: 10 }}>Notifications</h3>
                <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      style={{
                        padding: '6px 0',
                        borderBottom: '1px solid #eee',
                        position: 'relative',
                        fontSize: 14,
                      }}
                    >
                      <button
                        onClick={() => onDeleteNotification(n.id)}
                        title="Supprimer"
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          fontSize: 14,
                          color: 'red',
                          cursor: 'pointer',
                        }}
                      >
                        ✖
                      </button>
                      <strong>{n.type || 'Info'}</strong> — {n.message}
                      <br />
                      <small style={{ color: '#555' }}>{new Date(n.timestamp).toLocaleString()}</small>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Toutes les enchères */}
            <div
              style={{
                border: '1px solid #ddd',
                borderRadius: 6,
                padding: 15,
                flexGrow: 1,
                overflowY: 'auto',
              }}
            >
              <h2 style={{ marginTop: 0 }}>Toutes les enchères</h2>
              <label style={{ display: 'block', marginBottom: 10 }}>
                Filtrer par statut:{' '}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    padding: 6,
                    borderRadius: 4,
                    border: '1px solid #ccc',
                    minWidth: 120,
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">Tous</option>
                  <option value="pending">Pending</option>
                  <option value="live">Live</option>
                  <option value="ended">Ended</option>
                </select>
              </label>

              {filteredAuctions.length === 0 ? (
                <p>Aucune enchère disponible pour ce filtre.</p>
              ) : (
                <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
                  {filteredAuctions.map((a) => {
                    const isLastBidder = lastBids[a.id] === user?.id;
                    return (
                      <li
                        key={a.id}
                        className="auction-item"
                        style={{
                          cursor: 'pointer',
                          borderBottom: '1px solid #eee',
                          padding: '10px 5px',
                          userSelect: 'none',
                          backgroundColor: isLastBidder ? '#e6ffe6' : 'transparent',
                        }}
                        onClick={() => setSelectedAuctionId(a.id)}
                      >
                        <strong>{a.title}</strong> <br />
                        Prix courant : {a.current_price} <br />
                        Statut : {a.status} <br />
                        Date de fin : {new Date(a.ends_at).toLocaleDateString()} <br />
                        Créée par : {a.owner_name || 'Inconnu'}

                        {a.status !== 'ended' && (
                          <div style={{ marginTop: 10 }}>
                            <input
                              type="number"
                              className="input"
                              placeholder="Montant de l'offre"
                              value={form.bid_amounts?.[a.id] || ''}
                              onChange={(e) =>
                                setForm((form) => ({
                                  ...form,
                                  bid_amounts: { ...(form.bid_amounts || {}), [a.id]: e.target.value },
                                }))
                              }
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: 120,
                                padding: 6,
                                borderRadius: 4,
                                border: '1px solid #ccc',
                              }}
                            />
                            <button
                              className="button button-blue"
                              onClick={(e) => {
                                e.stopPropagation();
                                const amount = Number(form.bid_amounts?.[a.id]);
                                if (!amount || amount <= 0) {
                                  setMessage('Entrez un montant valide');
                                  return;
                                }
                                placeBidOnAuction(a.id, amount);
                              }}
                              style={{ marginLeft: 10, padding: '6px 12px' }}
                            >
                              Placer offre
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MainUI;
