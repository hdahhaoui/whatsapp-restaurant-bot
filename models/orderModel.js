// models/orderModel.js
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Ouvrir la base de données SQLite (fichier local)
const DB_PATH = path.join(__dirname, '..', 'data', 'orders.db');
// Remarque: on stockera le fichier de base dans un dossier "data". Assurez-vous qu'il existe.
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("❌ Erreur d'ouverture de la DB:", err.message);
    } else {
        console.log("📦 Base SQLite ouverte:", DB_PATH);
        // Créer la table des commandes si elle n'existe pas
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT,
            customer TEXT,
            items TEXT,
            status TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// Fonction pour créer une nouvelle commande
function addOrder(phone, customer, items, status = 'pending', callback) {
    const sql = `INSERT INTO orders (phone, customer, items, status) VALUES (?, ?, ?, ?)`;
    db.run(sql, [phone, customer, items, status], function(err) {
        if (err) {
            console.error("Erreur lors de l'insertion:", err);
            if (callback) callback(err);
        } else {
            console.log("✅ Nouvelle commande insérée, ID:", this.lastID);
            if (callback) callback(null, this.lastID);
        }
    });
}

// Fonction pour récupérer toutes les commandes
function getAllOrders(callback) {
    const sql = `SELECT * FROM orders ORDER BY id DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Erreur lors de la lecture des commandes:", err);
            return callback(err);
        }
        callback(null, rows);
    });
}

// Fonction pour mettre à jour le statut d'une commande
function updateOrderStatus(id, newStatus, callback) {
    const sql = `UPDATE orders SET status = ? WHERE id = ?`;
    db.run(sql, [newStatus, id], function(err) {
        if (err) {
            console.error("Erreur mise à jour statut:", err);
            if (callback) callback(err);
        } else {
            console.log(`↗️ Commande ${id} mise à jour au statut '${newStatus}'`);
            if (callback) callback(null);
        }
    });
}

// Fonction pour récupérer une commande par ID
function getOrderById(id, callback) {
    const sql = `SELECT * FROM orders WHERE id = ?`;
    db.get(sql, [id], (err, row) => {
        if (err) {
            console.error("Erreur select commande:", err);
            return callback(err);
        }
        callback(null, row);
    });
}

// Exporter les fonctions utiles
module.exports = {
    addOrder,
    getAllOrders,
    updateOrderStatus,
    getOrderById
};
