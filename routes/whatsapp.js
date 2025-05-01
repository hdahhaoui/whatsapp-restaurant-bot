// routes/whatsapp.js
const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');
const orderModel = require('../models/orderModel');
const printService = require('../services/printService');

// Route GET - Vérification du webhook par WhatsApp
router.get('/', (req, res) => {
    const verify_token = process.env.WHATSAPP_VERIFY_TOKEN;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode && token && mode === 'subscribe' && token === verify_token) {
        console.log("✅ Validation du webhook réussie !");
        return res.status(200).send(challenge);
    } else {
        return res.status(403).send('Erreur de vérification');
    }
});

// Route POST - Réception des notifications de messages WhatsApp
router.post('/', async (req, res) => {
    const body = req.body;
    // Vérifier qu'il s'agit bien d'un événement WhatsApp
    if (body.object === 'whatsapp_business_account') {
        const entry = body.entry && body.entry[0];
        const changes = entry && entry.changes && entry.changes[0];
        const value = changes && changes.value;
        const messageObj = value && value.messages && value.messages[0];
        if (messageObj) {
            // Récupérer le numéro de l'expéditeur et le texte du message
            const from = messageObj.from;              // ex: "212612345678" (numéro du client)
            const msgText = messageObj.text?.body || '';  // texte envoyé par le client

            console.log("📩 Message reçu de", from, ":", msgText);
            // Appeler la fonction de traitement du message entrant
            await whatsappService.processIncomingMessage(from, msgText, (order) => {
                // Ce callback (optionnel) s’exécute quand une commande est finalisée
                // On peut lancer l'impression du ticket ici
                if (order) {
                    printService.printOrder(order);
                }
            });
        }
        // Répondre 200 OK rapidement pour accuser réception à l'API WhatsApp
        res.sendStatus(200);
    } else {
        // Pas un événement WhatsApp attendu
        res.sendStatus(404);
    }
});

module.exports = router;
