// services/printService.js
const escpos = require('escpos');
// Adapter pour imprimante USB
escpos.USB = require('escpos-usb');
// (Si imprimante réseau, on utiliserait : escpos.Network = require('escpos-network'); plus tard)

// Configuration de l'imprimante
// Pour USB : si une seule imprimante est connectée, new escpos.USB() suffit.
// Sinon, précisez les identifiants USB : new escpos.USB(vendorId, productId).
const device = new escpos.USB();
const options = { encoding: "GB18030" /* support caractères spéciaux, par ex. € */ };
const printer = new escpos.Printer(device, options);

/**
 * Imprime un ticket de commande sur l'imprimante thermique locale.
 * @param {Object} order - Objet commande (avec au moins id, customer, items).
 */
function printOrder(order) {
    device.open((error) => {
        if (error) {
            return console.error("❌ Impossible d'ouvrir l'imprimante :", error);
        }
        // Composer le ticket
        printer
            .align('ct')                                   // centrer le texte
            .style('b')                                    // texte en gras
            .size(1, 1)                                    // taille normale
            .text('*** COMMANDE RESTAURANT ***')            // titre
            .feed()                                        // ligne vide
            .align('lt')                                   // aligner à gauche
            .style('normal')                               // style normal
            .text(`No Commande : ${order.id}`)             
            .text(`Client : ${order.customer}`)            
            .text(`Téléphone : ${order.phone}`)            
            .text('---------------------------')
            .text(`Détails : ${order.items}`)              
            .text('---------------------------')
            .text(`Statut : ${order.status}`)              
            .feed(1)                                       // sauter une ligne
            .align('ct')
            .text('Merci pour votre commande!')
            .cut()                                         // couper le papier
            .close();                                      // fermer la connexion (flush)
    });
}

module.exports = { printOrder };
