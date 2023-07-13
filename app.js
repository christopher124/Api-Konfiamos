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
let sessionIsActive = false;

async function checkSessionStatus() {
  if (!client || !sessionIsActive) {
    try {
      client = await venom.create({
        session: "session-name",
        autoClose: false,
      });
      sessionIsActive = true;
      await start(client);
    } catch (error) {
      console.log(error);
      sessionIsActive = false;
    }
  }
}

function start(client) {
  client.onMessage(async (message) => {
    if (!message.isGroupMsg && message.body) {
      // Agregar verificación para message.body {
      if (
        message.body.toLowerCase().includes("hola") ||
        message.body.toLowerCase().includes("hey") ||
        message.body.toLowerCase().includes("buenos días") ||
        message.body.toLowerCase().includes("buenas tardes") ||
        message.body.toLowerCase().includes("buenas noches")
      ) {
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
        client.sendText(
          message.from,
          `Lo siento, no entendí tu mensaje. Por favor, elige una de las opciones disponibles.
          
          ¡Hola! Soy Konfibot 👋 ¿En qué puedo hacer por ti hoy? 😊
    
          Por favor, elige una de las opciones a continuación para que pueda ayudarte:
          1️⃣ Consultar saldo: Obtener información sobre tu préstamo y saldo.
          2️⃣ ¿Dónde puedo realizar el pago?: Obtener información sobre opciones de pago.
          3️⃣ Renovar préstamo: Verificar la posibilidad de renovar tu préstamo.
          📞 Contacto: Obtén información de contacto para comunicarte con nosotros. Escribe la palabra 'Contacto' para obtener los detalles de contacto.
          
          ¡Estoy aquí para ayudarte en lo que necesites! 😉
          `
        );
      }
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

//funcion para recordar si hay pagos pendientes
async function sendPaymentReminderToOwner() {
  try {
    const loanRequests = await LoanRequest.find()
      .populate({
        path: "payments",
        select: "paymentAmount status dueDate",
      })
      .populate("customer");

    for (const loanRequest of loanRequests) {
      const payments = loanRequest.payments;
      const customer = loanRequest.customer;

      // Verificar si hay algún pago con el estado "Atrazado"
      const anyPaymentDelayed = payments.some(
        (payment) => payment.status === "Atrazado"
      );

      if (anyPaymentDelayed) {
        // Obtener la información relevante del préstamo
        const { firstname } = customer;
        const { totalAmount } = loanRequest;

        // Obtener el pago atrasado
        const delayedPayment = payments.find(
          (payment) => payment.status === "Atrazado"
        );

        // Obtener la fecha límite de pago
        const dueDate = delayedPayment ? delayedPayment.dueDate : null;
        const formattedDueDate = dueDate
          ? moment(dueDate).format("LL")
          : "Fecha desconocida";

        // Construir el mensaje de recordatorio
        const message = `Recordatorio de pago:\nPréstamo atrasado para ${firstname} por un monto de ${totalAmount}. Monto pendiente: ${delayedPayment.paymentAmount}. Fecha límite de pago: ${formattedDueDate}. Por favor, recuerda contactar al cliente y solicitarle el pago lo antes posible.`;

        // Enviar el mensaje utilizando Venom Bot
        await client.sendText("523323326196@c.us", message);
      }
    }

    console.log(
      "Notificación de préstamos atrasados enviada al propietario del bot."
    );
  } catch (error) {
    console.error(
      "Error al enviar la notificación de préstamos atrasados al propietario del bot:",
      error
    );
  }
}

setInterval(sendPaymentReminderToOwner, 21600000); // Ejemplo: cada 6 horas

// Llamar a la función para iniciar Venom Bot
checkSessionStatus();

app.get("/session", async (req, res) => {
  if (!sessionIsActive) {
    await checkSessionStatus();
  }
  res.json({ sessionIsActive });
});

app.get("/session/restart", async (req, res) => {
  if (!sessionIsActive) {
    sessionIsActive = false;
    await checkSessionStatus();
    res.send("Sesión reiniciada");
  } else {
    res.send("La sesión ya está activa");
  }
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
