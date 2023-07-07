const venom = require("venom-bot");
const qrcode = require("qrcode");

let botClient = null;
let qrCodeData = "";

async function initVenomBot() {
  if (!botClient) {
    try {
      botClient = await venom.create({
        session: "session-name", //name of session
      });
      start(botClient);
    } catch (error) {
      console.error("Error al iniciar Venom Bot:", error);
    }
  }
}

function start(client) {
  // Aquí puedes agregar la lógica y los eventos del bot Venom
  // según tus necesidades y funcionalidad requerida
}

async function generateQRCode() {
  if (!qrCodeData) {
    const sessionToken = await botClient.getSessionTokenBrowser();
    qrCodeData = await qrcode.toDataURL(sessionToken);
  }
  return qrCodeData;
}

module.exports = { initVenomBot, generateQRCode };
