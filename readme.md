# 🔐 Formulaire de Contact Sécurisé – Security by Design

Ce projet a été réalisé dans le cadre d’un exercice pratique visant à développer un formulaire de contact en local en appliquant les principes de **Security by Design**. L'objectif principal est de sécuriser les données utilisateurs tout en respectant les meilleures pratiques de développement web sécurisé.

---

## 🚀 Fonctionnalités

- Authentification des utilisateurs avec sessions sécurisées
- Hachage des mots de passe avec `bcrypt`
- Formulaire protégé par reCAPTCHA v2
- Transmission des données via HTTPS (certificat SSL local)
- Stockage local des messages utilisateur (JSON)
- Protection XSS avec `sanitize-html`
- Cookies sécurisés (`HttpOnly`, `Secure`, `SameSite`)
- Journalisation des accès avec `morgan`
- Tests de sécurité 

---

## 📁 Arborescence du projet
formulaire_securise/
├── public/ → Pages HTML (login, register, formulaire)
├── src/ → Serveur Node.js (server.js, fichiers JSON)
├── config/ssl/ → Certificats SSL locaux (key.pem, cert.pem)
├── logs/ → Fichier access.log
├── .env → Variables d'environnement (non versionné)
├── package.json → Dépendances


---

## 🛠️ Technologies utilisées

- **Node.js** / **Express.js**
- **HTTPS (SSL)** avec `https.createServer`
- **bcrypt** pour le hachage
- **express-session** pour les sessions
- **helmet** pour sécuriser les headers HTTP
- **sanitize-html** pour contrer les attaques XSS
- **Google reCAPTCHA v2**
- **morgan** pour les logs
- **OWASP ZAP**, **Postman**, **Chrome DevTools** pour les tests

---

## ⚙️ Installation & exécution

### 1. Cloner le dépôt

```bash
git clone https://github.com/ton-utilisateur/formulaire_securise.git
cd formulaire_securise

