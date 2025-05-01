// routes/orders.js
const express = require('express');
const router = express.Router();
const orderModel = require('../models/orderModel');
const whatsappService = require('../services/whatsappService');

// Page principale listant les commandes
router.get('/', (req, res) => {
    orderModel.getAllOrders((err, orders) => {
        if (err) {
            return res.status(500).send("Erreur lors de la récupération des commandes.");
        }
        res.render('orders', { orders });  // Rend la vue 'orders.ejs' avec les données
    });
});

// Changement de statut d'une commande (prête ou livrée)
router.post('/status/:id', (req, res) => {
    const orderId = req.params.id;
    const newStatus = req.body.status;  // 'ready' ou 'delivered'
    orderModel.updateOrderStatus(orderId, newStatus, (err) => {
        if (err) {
            return res.status(500).send("Erreur mise à jour statut en base.");
        }
        // Si marqué "prêt", notifier le client que sa commande est prête
        if (newStatus === 'ready') {
            orderModel.getOrderById(orderId, (err2, order) => {
                if (!err2 && order) {
                    whatsappService.sendMessage(order.phone, "✅ Votre commande est prête ! Vous pouvez venir la récupérer.");
                }
            });
        }
        // Si marqué "livré", on pourrait aussi notifier, selon le cas d'usage:
        if (newStatus === 'delivered') {
            orderModel.getOrderById(orderId, (err2, order) => {
                if (!err2 && order) {
                    whatsappService.sendMessage(order.phone, "🚚 Votre commande a été livrée. Bon appétit !");
                }
            });
        }
        // Rediriger vers la page d'accueil (liste mise à jour)
        res.redirect('/');
    });
});

module.exports = router;
