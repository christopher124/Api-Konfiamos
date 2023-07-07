const moment = require("moment");
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
let waitingForEmail = false;

async function initVenomBot() {
  if (!client) {
    client = await venom
      .create(
        {
          session: "session-name", //name of session
          autoClose: false, // Evitar el cierre automático del cliente
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
        undefined,
        { logQR: false }
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
      if (message.body === "Hola") {
        client.sendText(
          message.from,
          `¡Hola! 👋 ¿En qué puedo hacer por ti hoy? 😊
            Por favor, elige una de las opciones a continuación para que pueda ayudarte:
            1️⃣ Consultar saldo
            2️⃣ ¿Dónde puedo realizar el pago?
            3️⃣ Renovar préstamo
            
            ¡Estoy aquí para ayudarte en lo que necesites! 😉`
        );
      } else if (message.body === "1") {
        waitingForPaymentDate = true;
        client.sendText(
          message.from,
          "Por favor, proporciona el código de tu préstamo:"
        );
      } else if (message.body === "3") {
        // Información sobre dónde pagar
        const paymentInformation =
          "Información de pago:\n- Banco: Banco ABC\n- Número de cuenta: 123456789\n- CLABE interbancaria: 987654321";
        client.sendText(message.from, paymentInformation);
      } else if (message.body === "4") {
        waitingForEmail = true;
        client.sendText(
          message.from,
          "Por favor, proporciona tu correo electrónico:"
        );
      } else {
        if (waitingForEmail) {
          waitingForEmail = false;
          const codeLoanRequest = message.body;

          // Buscar el préstamo asociado al correo electrónico del cliente
          const loanRequest = await LoanRequest.findOne({
            code: codeLoanRequest,
          }).populate("payments");

          if (!loanRequest) {
            client.sendText(
              message.from,
              "No se encontró ningún préstamo asociado al codigo."
            );
          } else {
            // Resto de la lógica para mostrar la información del préstamo y verificar la renovación
            const payments = loanRequest.payments;
            const totalPayments = payments.length;

            if (totalPayments >= 8) {
              const lastPaymentDate = payments[totalPayments - 1].paymentDate;
              const nextRenewalDate = moment(nextPaymentDate)
                .format("LL")
                .add(30, "days")
                .format("LL");
              const response = `Puedes renovar tu préstamo. La próxima fecha disponible para renovación es el ${nextRenewalDate}.`;
              client.sendText(message.from, response);
            } else {
              client.sendText(
                message.from,
                "No cumples con los requisitos para renovar tu préstamo."
              );
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
