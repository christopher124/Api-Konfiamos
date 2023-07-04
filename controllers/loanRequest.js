const moment = require("moment");
require("moment/locale/es");
const Big = require("big.js");
const LoanRequest = require("../models/loanRequest");
const Payment = require("../models/payment");
const Customer = require("../models/customer");
const venom = require("venom-bot");
const puppeteer = require("puppeteer");

// Función para crear una solicitud de préstamo
async function createLoanRequest(req, res) {
  const { customerId, amountRequested, period, startDate, interestRate } =
    req.body;

  try {
    // Obtener el cliente
    const customer = await Customer.findById(customerId).populate(
      "loanRequests"
    );
    if (!customer) {
      return res.status(404).send({ msg: "Cliente no encontrado" });
    }

    // Verificar si el cliente tiene préstamos pendientes
    if (customer.loanRequests.length > 0) {
      const lastLoanRequest =
        customer.loanRequests[customer.loanRequests.length - 1];

      // Verificar si el período anterior al último préstamo está completamente pagado
      if (lastLoanRequest.periodPaid < lastLoanRequest.period - 1) {
        return res.status(400).send({
          msg: "Debe pagar el préstamo anterior antes de generar otro préstamo",
        });
      }
    }

    // Generar el código del préstamo usando las iniciales del cliente y los 4 últimos dígitos de su ID
    const initials = `${
      customer.firstname ? customer.firstname.charAt(0) : ""
    }${customer.lastname ? customer.lastname.charAt(0) : ""}`;

    const code =
      customer.loanRequests.length > 0
        ? `RVA-${customer.loanRequests.length + 1}-${initials}-${customer._id
            .toString()
            .slice(-4)}`
        : `${initials}-${customer._id.toString().slice(-4)}`;

    const endDate = moment(startDate).add(period * 15, "days");
    const amountRequestedBig = new Big(amountRequested);
    const interestRateBig = new Big(interestRate);
    const interestAmount = amountRequestedBig.times(interestRateBig);
    const totalAmount = amountRequestedBig.plus(interestAmount);

    // Cálculo de las fechas de pago
    const paymentDates = [];
    let paymentDate = moment(startDate);
    let dayOfMonth = paymentDate.date();

    if (dayOfMonth >= 1 && dayOfMonth <= 9) {
      paymentDate.date(15);
    } else {
      if (paymentDate.month() === 1) {
        // Verificar si es febrero (mes 2)
        const daysInFebruary = paymentDate.daysInMonth();
        paymentDate.date(daysInFebruary);
      } else {
        paymentDate.date(30);
      }
    }

    paymentDates.push(paymentDate.toDate()); // Agregar el primer pago

    for (let i = 1; i < period; i++) {
      if (paymentDate.date() === 15) {
        paymentDate.add(15, "days");
      } else {
        paymentDate.add(1, "month");
        paymentDate.date(15);
      }

      paymentDates.push(paymentDate.toDate());
    }

    // Crear los pagos asociados a la solicitud de préstamo
    const payments = [];

    let loanRequest = new LoanRequest({
      customer: customerId,
      code,
      amountRequested,
      period,
      startDate,
      endDate,
      interestAmount: interestAmount.toFixed(2).toString(),
      totalAmount: totalAmount.toFixed(2).toString(),
      interestRate,
      periodPaid: 0,
      totalPaid: 0,
    });

    for (const paymentDate of paymentDates) {
      const dueDate = moment(paymentDate).add(7, "days"); // Fecha límite de pago una semana después de la fecha de pago

      const payment = new Payment({
        paymentAmount: totalAmount.div(period).toFixed(2).toString(),
        paymentDate,
        dueDate,
        paid: false,
        loanRequest: loanRequest._id, // Asociar el ID del préstamo al campo loanRequestId del pago
      });

      await payment.save();
      payments.push(payment);
    }

    // Actualizar el campo status del cliente a "En préstamo"
    customer.status = true;

    // Asignar los pagos a la solicitud de préstamo
    loanRequest.payments = payments.map((payment) => payment._id);

    // Guardar la solicitud de préstamo y los pagos
    customer.loanRequests.push(loanRequest);
    const newLoanRequest = await Promise.all([
      customer.save(),
      loanRequest.save(),
    ]);

    res.status(201).send(newLoanRequest);
    console.log(newLoanRequest);
  } catch (error) {
    res.status(500).send({
      msg: "Error al crear la solicitud de préstamo",
    });
  }
}

// Función para recuperar todos prestamos
async function getLoanRequests(req, res) {
  try {
    const loanRequest = await LoanRequest.find().populate("payments customer");
    res.status(200).send(loanRequest);
  } catch (error) {
    res
      .status(500)
      .send({ msg: "Error al obtener los préstamos: " + error.message });
  }
}

// Función para recuperar un prestamos
async function getLoanRequest(req, res) {
  const { id } = req.params;
  try {
    const loanRequest = await LoanRequest.findById(id).populate(
      "payments customer"
    );
    if (!loanRequest) {
      return res.status(404).json({ msg: "No se encontró el préstamo" });
    }
    res.status(200).json(loanRequest);
  } catch (error) {
    res.status(500).json({
      msg: "Error al obtener el préstamo",
      error: error.message,
    });
  }
}

// Función para actualizar una solicitud de préstamo
async function updateLoanRequest(req, res) {
  const { id } = req.params;
  const { customerId, amountRequested, period, startDate, interestRate } =
    req.body;

  try {
    const loanRequest = await LoanRequest.findById(id).populate("customer");

    if (!loanRequest) {
      return res
        .status(404)
        .send({ msg: "Solicitud de préstamo no encontrada" });
    }

    // Obtener el cliente
    const customer = loanRequest.customer;

    // Verificar si el cliente tiene préstamos pendientes
    if (customer.loanRequests.length > 0) {
      const lastLoanRequest =
        customer.loanRequests[customer.loanRequests.length - 1];

      // Verificar si el período anterior al último préstamo está completamente pagado
      if (lastLoanRequest.periodPaid < lastLoanRequest.period - 1) {
        return res.status(400).send({
          msg: "Debe pagar el préstamo anterior antes de generar otro préstamo",
        });
      }
    }

    const endDate = moment(startDate).add(period * 15, "days");
    const amountRequestedBig = new Big(amountRequested);
    const interestRateBig = new Big(interestRate);
    const interestAmount = amountRequestedBig.times(interestRateBig);
    const totalAmount = amountRequestedBig.plus(interestAmount);

    // Cálculo de las fechas de pago
    const paymentDates = [];
    let paymentDate = moment(startDate);
    let dayOfMonth = paymentDate.date();

    if (dayOfMonth >= 1 && dayOfMonth <= 9) {
      paymentDate.date(15);
    } else {
      if (paymentDate.month() === 1) {
        // Verificar si es febrero (mes 2)
        const daysInFebruary = paymentDate.daysInMonth();
        paymentDate.date(daysInFebruary);
      } else {
        paymentDate.date(30);
      }
    }

    paymentDates.push(paymentDate.toDate()); // Agregar el primer pago

    for (let i = 1; i < period; i++) {
      if (paymentDate.date() === 15) {
        paymentDate.add(15, "days");
      } else {
        paymentDate.add(1, "month");
        paymentDate.date(15);
      }

      paymentDates.push(paymentDate.toDate());
    }

    // Actualizar los datos de la solicitud de préstamo
    loanRequest.customer = customerId;
    loanRequest.amountRequested = amountRequested;
    loanRequest.period = period;
    loanRequest.startDate = startDate;
    loanRequest.endDate = endDate;
    loanRequest.interestAmount = interestAmount.toFixed(2).toString();
    loanRequest.totalAmount = totalAmount.toFixed(2).toString();
    loanRequest.interestRate = interestRate;
    loanRequest.periodPaid = 0;
    loanRequest.totalPaid = 0;

    // Eliminar los pagos asociados a la solicitud de préstamo
    await Payment.deleteMany({ loanRequest: loanRequest._id });

    // Crear los nuevos pagos asociados a la solicitud de préstamo
    const payments = [];

    for (const paymentDate of paymentDates) {
      const dueDate = moment(paymentDate).add(7, "days"); // Fecha límite de pago una semana después de la fecha de pago

      const payment = new Payment({
        paymentAmount: totalAmount.div(period).toFixed(2).toString(),
        paymentDate,
        dueDate,
        paid: false,
        loanRequest: loanRequest._id, // Asociar el ID del préstamo al campo loanRequestId del pago
      });

      await payment.save();
      payments.push(payment);
    }

    // Actualizar los pagos asociados a la solicitud de préstamo
    loanRequest.payments = payments.map((payment) => payment._id);

    // Guardar los cambios en la solicitud de préstamo
    await loanRequest.save();

    res
      .status(200)
      .send({ msg: "Solicitud de préstamo actualizada correctamente" });
  } catch (error) {
    res
      .status(500)
      .send({ msg: "Error al actualizar la solicitud de préstamo" });
  }
}

// Función para eliminar una solicitud de préstamo y sus pagos
async function deleteLoanRequest(req, res) {
  const { id } = req.params;

  try {
    const loanRequest = await LoanRequest.findById(id);

    if (!loanRequest) {
      return res
        .status(404)
        .send({ msg: "Solicitud de préstamo no encontrada" });
    }

    // Realizar el borrado lógico de la solicitud de préstamo
    await loanRequest.delete();

    // Marcar los pagos asociados como eliminados
    await Payment.updateMany(
      { loanRequest: loanRequest._id },
      { deleted: true }
    );

    res
      .status(200)
      .send({ msg: "Solicitud de préstamo eliminada correctamente" });
  } catch (error) {
    res.status(500).send({ msg: "Error al eliminar la solicitud de préstamo" });
  }
}

// Función para recuperar una solicitud de préstamo y sus pagos
async function restoreLoanRequest(req, res) {
  const { id } = req.params;

  try {
    const loanRequest = await LoanRequest.findById(id);

    if (!loanRequest) {
      return res
        .status(404)
        .send({ msg: "Solicitud de préstamo no encontrada" });
    }

    // Restaurar la solicitud de préstamo borrada
    await loanRequest.restore();

    // Recuperar los pagos asociados al préstamo y restaurarlos
    const payments = await Payment.find({ loanRequest: loanRequest._id });

    for (const payment of payments) {
      await payment.restore();
    }

    res
      .status(200)
      .send({ msg: "Solicitud de préstamo restaurada correctamente" });
  } catch (error) {
    res
      .status(500)
      .send({ msg: "Error al restaurar la solicitud de préstamo" });
  }
}

async function updateLoanStatusSetInterval() {
  try {
    const loanRequests = await LoanRequest.find().populate("payments");

    for (const loanRequest of loanRequests) {
      const payments = loanRequest.payments;

      // Verificar si hay algún pago con el estado "Atrazado"
      const anyPaymentDelayed = payments.some(
        (payment) => payment.status === "Atrazado"
      );

      if (anyPaymentDelayed) {
        // Si hay algún pago atrasado, establecer el estado del préstamo a "Atrazado"
        loanRequest.status = "Atrazado";
      } else {
        // Verificar si todos los pagos están al corriente
        const allPaymentsPaid = payments.every(
          (payment) => payment.status === "al corriente"
        );

        if (allPaymentsPaid) {
          // Si todos los pagos están al corriente, establecer el estado del préstamo a "Al corriente"
          loanRequest.status = "Al corriente";
        }
      }

      await loanRequest.save();
    }

    console.log("Actualización de estado de préstamos completada.");
  } catch (error) {
    console.error("Error al actualizar el estado de los préstamos:", error);
  }
}

//funcion para recordar si hay pagos pendientes
async function sendPaymentReminderToOwner() {
  try {
    const loanRequests = await LoanRequest.find()
      .populate({
        path: "payments",
        select: "amount status dueDate",
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
        const message = `Recordatorio de pago:\nPréstamo atrasado para ${firstname} por un monto de ${totalAmount}. Monto pendiente: ${delayedPayment.amount}. Fecha límite de pago: ${formattedDueDate}. Por favor, recuerda contactar al cliente y solicitarle el pago lo antes posible.`;

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

// Función para enviar un mensaje utilizando Venom Bot y obtener el préstamo correspondiente al código
// Función para iniciar Venom Bot
const browser = await puppeteer.launch({
  headless: true,
  args: ["--use-gl=egl"],
});

async function initVenomBot() {
  if (!client) {
    try {
      client = await venom.create({
        session: "session-name", //name of session
        browser,
      });
      start(client);
    } catch (error) {
      console.error("Error al iniciar Venom Bot:", error);
    }
  }
}
let client = null;
let waitingForPaymentDate = false;
let waitingForEmail = false;

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
// Ejecutar la función de actualización cada cierto período de tiempo
setInterval(updateLoanStatusSetInterval, 3600000); // Ejemplo: cada 1 hora
setInterval(sendPaymentReminderToOwner, 86400000); // Ejemplo: cada 24 horas
module.exports = {
  createLoanRequest,
  getLoanRequests,
  getLoanRequest,
  updateLoanRequest,
  deleteLoanRequest,
  restoreLoanRequest,
};
