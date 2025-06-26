# Plateforme d’Enchères Microservices

## Description

Ce projet est une plateforme d’enchères en temps réel, conçue en architecture microservices.  
Chaque service est indépendant, communiquant via API REST sur des ports distincts.

Fonctionnalités principales :  
- Authentification JWT  
- Gestion utilisateurs  
- Création et gestion des enchères  
- Gestion des offres (bids)  
- Notifications en temps réel  
- Frontend React simple

---

## Structure des dossiers et ports

| Service                | Description                   | Port  |
|------------------------|-------------------------------|-------|
| `auth-gateway`         | Authentification JWT           | 3000  |
| `user-service`         | Gestion utilisateurs           | 3001  |
| `auction-service`      | Gestion des enchères           | 3002  |
| `bid-service`          | Gestion des offres (bids)      | 3003  |
| `notification-service` | Gestion des notifications      | 3004  |
| `ui`                   | Frontend React                 | 3005  |

---

## Installation & lancement

### Prérequis

- Node.js (version 16+ recommandée)  
- npm (gestionnaire de paquets)

---

### Étapes

Pour chaque dossier de service (`auth-gateway`, `user-service`, `auction-service`, `bid-service`, `notification-service`, `ui`), exécute :

```bash
cd nom_du_service
npm install
npm start
```

Fonctionnalités & vérifications
Tu peux vérifier et tester les fonctionnalités suivantes dans l’application :

Authentification & utilisateurs
Inscription d’un nouveau compte utilisateur.

Connexion / Déconnexion avec JWT.

Gestion des données utilisateur via API (CRUD basique).

Enchères
Création d’une enchère (titre, prix de départ, date de fin).

Affichage des enchères (toutes, mes enchères).

Modification de la date de fin d’une enchère créée par soi-même.

Fermeture manuelle d’une enchère (bouton “Fermer l’enchère”).

Offres (bids)
Placer une offre supérieure sur une enchère “live”.

Ne pas pouvoir enchérir sur sa propre enchère.

Notification au créateur de l’enchère à chaque nouvelle offre.

Notification à l’ancien meilleur enchérisseur quand il est surenchéri.

Notification de confirmation à l’enchérisseur actuel.

Notifications
Affichage des notifications dans l’interface.

Suppression individuelle d’une notification.

Notification spécifique “Victoire” quand une offre est acceptée par le propriétaire.

Acceptation de l’offre gagnante
Bouton “Accepter l’offre” dans la liste “Mes enchères” pour l’enchère fermée.

Envoi d’une notification “Victoire” au dernier enchérisseur lorsque le propriétaire accepte l’offre.

L’enchère ne désigne pas de gagnant si elle est simplement fermée sans acceptation.

Notes
Les services communiquent entre eux via HTTP sur localhost et les ports indiqués.

Les données sont stockées en mémoire (pas de persistance).

JWT utilise une clé secrète simple (SECRET_KEY).

Le frontend utilise React avec fetch API.