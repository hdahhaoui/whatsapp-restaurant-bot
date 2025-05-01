// services/whatsappService.js
const axios = require('axios');
const orderModel = require('../models/orderModel');

const token = process.env.WHATSAPP_TOKEN;               // Jeton d’accès API
const phoneId = process.env.WHATSAPP_PHONE_ID;         // ID du numéro WhatsApp Business
const apiUrl = `https://graph.facebook.com/v17.0/${phoneId}/messages`;

// Structure en mémoire pour suivre l'état des conversations des utilisateurs
const sessions = {};  // ex: sessions[phone] = { stage: 'await_name', orderData: {...} }

/**
 * Envoi d’un message texte WhatsApp à un utilisateur.
 * @param {string} to - numéro WhatsApp du destinataire (format international, ex: "212612345678").
 * @param {string} message - texte du message à envoyer.
 */
async function sendMessage(to, message) {
    try {
        await axios.post(apiUrl, {
            messaging_product: 'whatsapp',
            to: to,
            text: { body: message }
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        console.log("↪️ WhatsApp message envoyé à", to, "->", message);
    } catch (err) {
        console.error("❌ Erreur envoi message WhatsApp:", err.response?.data || err.message);
    }
}

/**
 * Traite un message entrant et envoie la réponse appropriée.
 * Peut créer une commande si le client finalise sa commande.
 * @param {string} from - numéro WhatsApp de l'expéditeur.
 * @param {string} msgText - contenu du message reçu.
 * @param {function(Object)} [orderFinalizedCallback] - fonction appelée avec l'objet commande quand une nouvelle commande est créée.
 */
async function processIncomingMessage(from, msgText, orderFinalizedCallback) {
    const message = msgText.trim().toLowerCase();  // on normalise le message en minuscule
    // Si on n'a pas encore de session pour cet utilisateur, initier une conversation
    if (!sessions[from]) {
        sessions[from] = { stage: 'INIT' };
    }

    const session = sessions[from];

    // ÉTAPE 1 : Le client commence la conversation (ou envoie un message hors commande)
    if (session.stage === 'INIT') {
        // Si le message contient un mot-clé pour démarrer la commande
        if (message.includes('bonjour') || message.includes('salut') || message.includes('menu') || message.includes('commande')) {
            // Par exemple, le client dit "Bonjour, je voudrais commander" -> on envoie le menu
            const menuMessage = 
                "*Menu du jour :*\n" +
                "1. Pizza Margherita - 8€\n" +
                "2. Burger Classique - 7€\n" +
                "3. Salade César - 6€\n\n" +
                "_Répondez avec le numéro ou le nom du plat que vous souhaitez._";
            await sendMessage(from, "Bonjour ! 👋\nBienvenue au restaurant. Vous pouvez passer votre commande ici.\n" + menuMessage);
            session.stage = 'AWAIT_ITEM';  // on attend maintenant le choix du plat
        } else {
            // Message non reconnu dans ce contexte, on invite à commencer par demander le menu
            await sendMessage(from, "Bonjour ! Pour passer une commande, répondez par 'menu' pour voir les options disponibles.");
            // (On ne change pas le stage, on reste en INIT en attendant un mot-clé pertinent)
        }
        return;
    }

    // ÉTAPE 2 : Le client a le menu, attendons son choix de plat
    if (session.stage === 'AWAIT_ITEM') {
        let choice = null;
        if (message.startsWith('1')) choice = 'Pizza Margherita';
        else if (message.startsWith('2')) choice = 'Burger Classique';
        else if (message.startsWith('3')) choice = 'Salade César';
        else if (message.includes('pizza')) choice = 'Pizza Margherita';
        else if (message.includes('burger')) choice = 'Burger Classique';
        else if (message.includes('salade')) choice = 'Salade César';

        if (choice) {
            // Enregistrer le choix du plat dans la session
            session.orderData = { item: choice };
            // Demander la quantité souhaitée
            await sendMessage(from, `Combien de *${choice}* souhaitez-vous ?`);
            session.stage = 'AWAIT_QUANTITY';
        } else {
            // Choix non reconnu
            await sendMessage(from, "😕 Désolé, je n'ai pas compris votre choix. Répondez par le numéro ou le nom du plat.");
            // (Le stage reste AWAIT_ITEM pour retenter)
        }
        return;
    }

    // ÉTAPE 3 : Le client a choisi un plat, attendons la quantité
    if (session.stage === 'AWAIT_QUANTITY') {
        const qty = parseInt(message);
        if (!isNaN(qty) && qty > 0) {
            session.orderData.quantity = qty;
            // Demander le nom du client pour enregistrer la commande
            await sendMessage(from, "Parfait. Sous quel nom dois-je enregistrer la commande ?");
            session.stage = 'AWAIT_NAME';
        } else {
            await sendMessage(from, "Veuillez indiquer un nombre valide pour la quantité.");
            // (On reste en AWAIT_QUANTITY)
        }
        return;
    }

    // ÉTAPE 4 : Le client a donné la quantité, on attend son nom
    if (session.stage === 'AWAIT_NAME') {
        const customerName = msgText.trim();  // garder la casse originale du nom éventuellement
        session.orderData.name = customerName || 'Client';
        // Créer la commande dans la base de données
        const item = session.orderData.item;
        const qty = session.orderData.quantity || 1;
        const orderText = `${qty} x ${item}`;
        orderModel.addOrder(from, session.orderData.name, orderText, 'pending', (err, orderId) => {
            if (!err) {
                // Récupérer la commande insérée pour retour
                orderModel.getOrderById(orderId, (err2, order) => {
                    if (!err2 && order) {
                        console.log("🗃️ Commande enregistrée en DB:", order);
                        // Optionnel: exécuter un callback pour imprimer, etc.
                        if (orderFinalizedCallback) orderFinalizedCallback(order);
                    }
                });
            }
        });
        // Envoyer le message de confirmation au client
        await sendMessage(from, `Merci *${session.orderData.name}* 🙏\nVotre commande (${qty} x ${item}) a été prise en compte. Nous vous préviendrons lorsqu'elle sera prête.`);
        // Réinitialiser la session du client (conversation terminée pour cette commande)
        delete sessions[from];
        return;
    }

    // Si on atteint ici, on n'a pas géré ce cas, on réinitialise par prudence
    delete sessions[from];
    await sendMessage(from, "Une erreur est survenue, reprenons la commande depuis le début. Répondez 'menu' pour recommencer.");
}
