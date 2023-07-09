const moment = require("moment");
require("moment/locale/es");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const venom = require("venom-bot");
const fs = require("fs");
const LoanRequest = require("./models/loanRequest");

const { API_VERSION } = require("./constants");

const app = express();

let client = null;
let waitingForPaymentDate = false;
let waitingForCode = false;

async function initVenomBot() {
  if (!client) {
    client = await venom
      .create(
        {
          session: "session-name", //name of session
          autoClose: false, // Evitar el cierre automático del cliente
          browserArgs: ["--no-sandbox"],
        },
        (base64Qr, asciiQR, attempts, urlCode) => {
          console.log(asciiQR); // Optional to log the QR in the terminal
          var matches = base64Qr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
            response = {};

          if (matches.length !== 3) {
            return new Error("Invalid input string");
          }
          response.type = matches[1];
          response.data = new Buffer.from(matches[2], "base64");

          var imageBuffer = response;
          require("fs").writeFile(
            "out.png",
            imageBuffer["data"],
            "binary",
            function (err) {
              if (err != null) {
                console.log(err);
              }
            }
          );
        },
        undefined
      )
      .then((client) => start(client))
      .catch((erro) => {
        console.log(erro);
      });
  }
}

function start(client) {
  client.onMessage(async (message) => {
    if (!message.isGroupMsg) {
      if (
        (message.body =
          "Hola" || "hola" || "." || "Quiero prestamo" || "quiero prestamo")
      )
        client.sendText(
          message.from,
          `¡Hola! Soy Kofibot👋 ¿En qué puedo hacer por ti hoy? 😊

          Por favor, elige una de las opciones a continuación para que pueda ayudarte:
          1️⃣ Consultar saldo: Obtener información sobre tu préstamo y saldo.
          2️⃣ ¿Dónde puedo realizar el pago?: Obtener información sobre opciones de pago.
          3️⃣ Renovar préstamo: Verificar la posibilidad de renovar tu préstamo.
          📞 Contacto: Obtén información de contacto para comunicarte con nosotros. Escribe la palabra 'Contacto' para obtener los detalles de contacto.
          
          ¡Estoy aquí para ayudarte en lo que necesites! 😉
          `
        );
    } else if (message.body === "Contacto") {
      const contactInformation =
        "Puedes contactarnos en los siguientes canales:\n" +
        "📞 Teléfono: 3319883933\n" +
        "📧 Correo electrónico: info@konfiamos.com\n" +
        "🌐 Sitio web: www.konfiamos.com";
      client.sendText(message.from, contactInformation);
    } else if (message.body === "1") {
      waitingForPaymentDate = true;
      client.sendText(
        message.from,
        "Por favor, proporciona el código de tu préstamo:"
      );
    } else if (message.body === "2") {
      const paymentInformation = `🏦 Opción (1) Información de pago:
      - Banco: Banco ABC
      - Número de cuenta: 123456789
      - CLABE interbancaria: 987654321
   ----------------------------------
   🏦 Opción (2) Información de pago:
      - Banco: Banco ABC
      - Número de cuenta: 123456789
      - CLABE interbancaria: 987654321
   `;
      client.sendText(message.from, paymentInformation);
    } else if (message.body === "3") {
      waitingForCode = true;
      client.sendText(
        message.from,
        "Por favor, proporciona tu código de préstamo:"
      );
    } else {
      if (waitingForCode) {
        waitingForCode = false;
        const loanCode = message.body;

        // Consultar el préstamo asociado al código
        const loanRequest = await LoanRequest.findOne({
          code: loanCode,
        }).populate("payments");

        if (!loanRequest) {
          client.sendText(
            message.from,
            "No se encontró ningún préstamo con ese código."
          );
        } else {
          const payments = loanRequest.payments;
          const paidPayments = payments.filter((payment) => payment.paid);

          if (paidPayments.length >= 8) {
            const response =
              "Eres candidato para renovar tu préstamo. En breve uno de nuestros asesores se comunicará contigo para que puedas renovar.";
            client.sendText(message.from, response);
          } else {
            const response =
              "No eres candidato para renovar tu préstamo en este momento.";
            client.sendText(message.from, response);
          }
        }
      } else if (waitingForPaymentDate) {
        waitingForPaymentDate = false;
        const loanCode = message.body;

        // Consultar el saldo y la información del préstamo
        const loanRequest = await LoanRequest.findOne({
          code: loanCode,
        }).populate("payments");

        if (!loanRequest) {
          client.sendText(
            message.from,
            "No se encontró ningún préstamo con ese código."
          );
        } else {
          const payments = loanRequest.payments;
          const periodPaid = loanRequest.periodPaid;
          const totalPaid = payments.filter((payment) => payment.paid).length;
          const status = loanRequest.status;
          const amountRequested = loanRequest.amountRequested;
          const totalAmount = loanRequest.totalAmount;

          // Lógica para determinar la siguiente fecha de pago
          const today = moment().startOf("day");
          let nextPaymentDate = null;

          for (let i = 0; i < payments.length; i++) {
            const payment = payments[i];

            if (!payment.paid) {
              const paymentDate = moment(payment.paymentDate);

              if (!nextPaymentDate || paymentDate.isBefore(nextPaymentDate)) {
                nextPaymentDate = paymentDate;
              }
            }
          }

          if (nextPaymentDate === null) {
            client.sendText(
              message.from,
              "Ya has realizado todos los pagos para este préstamo."
            );
          } else {
            const formattedNextPaymentDate =
              moment(nextPaymentDate).format("LL");
            const periodsPaid = periodPaid;
            const periodsRemaining = payments.length - periodsPaid;
            const remainingAmount =
              (payments.length - totalPaid) * payments[0].paymentAmount;

            let response = "Información de pagos:\n";
            response += `Estatus del préstamo: ${
              status ? "Al corriente" : "Pendiente"
            }\n`;
            response += `Monto solicitado: ${amountRequested}\n`;
            response += `Monto con interes: ${totalAmount}\n`;
            response += `Próxima fecha de pago: ${formattedNextPaymentDate}\n`;
            response += `Pagos abonados: ${periodsPaid}\n`;
            response += `Pagos restantes: ${periodsRemaining}\n`;
            response += `Cantidad restante para pagar: ${remainingAmount}\n`;

            client.sendText(message.from, response);
          }
        }
      }
    }
  });
}

// Llamar a la función para iniciar Venom Bot
initVenomBot();

// Ruta para mostrar el código QR
app.get("/", (req, res) => {
  const qrImagePath = "out.png";
  res.sendFile(qrImagePath, { root: __dirname });
});

/// Import Routings
const authRoutes = require("./router/auth");
const roleRoutes = require("./router/role");
const userRoutes = require("./router/user");
const customerRoutes = require("./router/customer");
const menuRoutes = require("./router/menu");
const loanRequestRoutes = require("./router/loanRequest");
const paymentRoutes = require("./router/payment");
const groupLoanRequest = require("./router/groupLoanRequest");

// Configure Body Parse
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configure static folder
app.use(express.static("uploads"));

// Configure Header HTTP - CORS
app.use(cors());

// Configure routings
app.use(`/api/${API_VERSION}`, authRoutes);
app.use(`/api/${API_VERSION}`, roleRoutes);
app.use(`/api/${API_VERSION}`, userRoutes);
app.use(`/api/${API_VERSION}`, menuRoutes);
app.use(`/api/${API_VERSION}`, loanRequestRoutes);
app.use(`/api/${API_VERSION}`, customerRoutes);
app.use(`/api/${API_VERSION}`, paymentRoutes);
app.use(`/api/${API_VERSION}`, groupLoanRequest);

module.exports = app;
