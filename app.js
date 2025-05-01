// app.js
require('dotenv').config();             // Charge les variables .env

const express = require('express');
const path = require('path');
const app = express();

// Configurer le port du serveur
const PORT = process.env.PORT || 3000;

// Middleware pour parser les requêtes entrantes (JSON et formulaires HTML)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurer le moteur de template EJS pour les vues HTML
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Servir les fichiers statiques (ex: CSS de Bootstrap si nécessaire)
// (Ici non utilisé car on chargera Bootstrap via CDN, mais en cas de fichiers locaux :)
// app.use(express.static(path.join(__dirname, 'public')));

// Initialiser la base de données SQLite
const db = require('./models/orderModel');  // Va exécuter la connexion et création de table

// Définir les routes de l’application
const whatsappRoutes = require('./routes/whatsapp');
const ordersRoutes = require('./routes/orders');
app.use('/webhook', whatsappRoutes);   // Webhook WhatsApp API (doit correspondre à l’URL configurée chez Meta)
app.use('/', ordersRoutes);            // Interface web (page principale à la racine)

// Lancer le serveur
app.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});
