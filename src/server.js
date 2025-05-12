require('dotenv').config();
const sanitizeHtml = require('sanitize-html');
const fs = require('fs');
const path = require('path');
const https = require('https');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const bcrypt = require('bcrypt');
const morgan = require('morgan');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');

const app = express();

// 🔐 Certificat SSL local
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, '../config/ssl/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../config/ssl/cert.pem')),
};

// 📁 Fichier utilisateurs
const usersPath = path.join(__dirname, 'users.json');

// 🔧 Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true, // fonctionne uniquement avec HTTPS
    sameSite: 'strict'
  }
}));

app.use(morgan('combined', {
  stream: fs.createWriteStream(path.join(__dirname, '../logs/access.log'), { flags: 'a' })
}));

// ✅ Fonctions utilitaires
function loadUsers() {
  try {
    if (!fs.existsSync(usersPath)) return [];
    const data = fs.readFileSync(usersPath, 'utf-8').trim();
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Erreur lecture users.json :', err);
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  console.warn('Session utilisateur absente');
  res.redirect('/login.html');
}

// ✅ Routes GET publiques
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/register.html'));
});

// ✅ Page protégée : index.html à la racine
app.get('/', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ✅ Route déconnexion
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Erreur de déconnexion :', err);
    }
    res.redirect('/login.html');
  });
});

// ✅ INSCRIPTION
app.post('/register', async (req, res) => {
    const { username, email, password, 'g-recaptcha-response': captcha } = req.body;
  
    if (!captcha) return res.status(400).send('Captcha manquant');
  
    const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${captcha}`;
    try {
      const captchaRes = await fetch(verifyURL, { method: 'POST' });
      const data = await captchaRes.json();
      if (!data.success) return res.status(403).send('Captcha invalide');
    } catch (err) {
      return res.status(500).send('Erreur de vérification Captcha');
    }
  
    const users = loadUsers();
    const existingUser = users.find(u => u.email === email);
    if (existingUser) return res.status(400).send('Email déjà utilisé');
  
    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ username, email, password: hashedPassword });
    saveUsers(users);
  
    res.send('Inscription réussie ! <a href="/login.html">Connectez-vous</a>');
  });
  

// ✅ CONNEXION
app.post('/login', async (req, res) => {
    const { email, password, 'g-recaptcha-response': captcha } = req.body;
  
    if (!captcha) return res.status(400).send('Captcha manquant');
  
    const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${captcha}`;
    try {
      const captchaRes = await fetch(verifyURL, { method: 'POST' });
      const data = await captchaRes.json();
      if (!data.success) return res.status(403).send('Captcha invalide');
    } catch (err) {
      return res.status(500).send('Erreur de vérification Captcha');
    }
  
    const users = loadUsers();
    const user = users.find(u => u.email === email);
    if (!user) return res.status(401).send('Email inconnu');
  
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).send('Mot de passe incorrect');
  
    req.session.user = { username: user.username, email: user.email };
    res.redirect('/');
  });
  

// ✅ TRAITEMENT FORMULAIRE CONTACT
// ✅ TRAITEMENT FORMULAIRE CONTACT
app.post('/contact', isAuthenticated, async (req, res) => {
    console.log('Données reçues du formulaire :', req.body);
    const { name, email, message, 'g-recaptcha-response': captcha } = req.body;
  
    if (!captcha) {
      return res.status(400).send('Captcha manquant');
    }
  
    const captchaVerifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${captcha}`;
    try {
      const response = await fetch(captchaVerifyURL, { method: 'POST' });
      const data = await response.json();
      if (!data.success) {
        return res.status(403).send('Captcha invalide');
      }
    } catch (err) {
      console.error('Erreur de vérification reCAPTCHA:', err);
      return res.status(500).send('Erreur de vérification');
    }
  
    // 🔐 Enregistrement dans messages.json
    const messagesPath = path.join(__dirname, 'messages.json');
    const newMessage = {
        name: sanitizeHtml(name, { allowedTags: [], allowedAttributes: {} }),
        email: sanitizeHtml(email, { allowedTags: [], allowedAttributes: {} }),
        message: sanitizeHtml(message, { allowedTags: [], allowedAttributes: {} }),
        date: new Date().toISOString()
      };
      
    let existingMessages = [];
    try {
      if (fs.existsSync(messagesPath)) {
        const fileData = fs.readFileSync(messagesPath, 'utf-8').trim();
        existingMessages = fileData ? JSON.parse(fileData) : [];
      }
    } catch (error) {
      console.error('Erreur lecture messages.json :', error);
    }
  
    existingMessages.push(newMessage);
  
    try {
      fs.writeFileSync(messagesPath, JSON.stringify(existingMessages, null, 2));
    } catch (err) {
      console.error('Erreur écriture messages.json :', err);
      return res.status(500).send('Erreur d\'enregistrement');
    }
  
    res.status(200).send('OK');
  });
  

// ✅ Lancer le serveur HTTPS
https.createServer(sslOptions, app).listen(3000, () => {
  console.log('✅ Serveur HTTPS en écoute sur https://localhost:3000');
});
