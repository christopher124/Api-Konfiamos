const moment = require("moment");
const LoanRequest = require("../models/loanRequest");
const Payment = require("../models/payment");

// Función para recuperar los pagos de un prestamo
async function getLoanPayments(req, res) {
  const { id } = req.params;
  try {
    const loanRequest = await LoanRequest.findById(id);
    if (!loanRequest) {
      return res.status(404).json({ msg: "No se encontró el préstamo" });
    }

    const payments = await Payment.find({
      _id: { $in: loanRequest.payments },
    }).populate("loanRequest", "code"); // Agrega la opción populate para obtener solo el campo 'code' del préstamo asociado

    if (!payments || payments.length === 0) {
      return res
        .status(404)
        .json({ msg: "No se encontraron pagos para el préstamo" });
    }

    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({
      msg: "Error al obtener los pagos del préstamo",
      error: error.message,
    });
  }
}

//Actualizar el estado de pago
async function updatePaymentStatus(req, res) {
  const { id } = req.params;
  const { paid, partialPayment, partialPaymentAmount, comment } = req.body;

  try {
    const payment = await Payment.findById(id).populate("loanRequest");
    if (!payment) {
      return res.status(404).send({ msg: "Pago no encontrado" });
    }

    const loanRequest = payment.loanRequest;

    // Restablecer el valor de pago anterior
    const previousPaid = payment.paid;

    // Actualizar el estado de pago
    payment.paid = paid;
    payment.partialPayment = partialPayment || false;
    payment.partialPaymentAmount = partialPaymentAmount || 0;
    payment.comment = comment || "";

    // Actualizar los campos periodPaid y totalPaid en LoanRequest
    if (paid !== previousPaid) {
      if (paid) {
        loanRequest.periodPaid += 1;
        loanRequest.totalPaid += parseFloat(payment.paymentAmount);
      } else {
        loanRequest.periodPaid -= 1;
        loanRequest.totalPaid -= parseFloat(payment.paymentAmount);
      }
    }

    await payment.save();
    await loanRequest.save();

    res.status(200).send({ msg: "Estado de pago actualizado exitosamente" });
  } catch (error) {
    res
      .status(500)
      .send({ msg: "Error al actualizar el estado de pago: " + error.message });
  }
}

// verificar si el pago del prestamo esta pendiente
async function updatePaymentStatusSetInterval() {
  try {
    // Obtener los pagos pendientes
    const pendingPayments = await Payment.find({});

    // Iterar sobre cada pago y verificar la fecha límite de pago
    for (const payment of pendingPayments) {
      const currentDate = moment();
      const dueDate = moment(payment.paymentDate);

      // Verificar si la fecha límite de pago ha pasado
      if (currentDate > dueDate) {
        // Actualizar el estado del pago a "atrasado"
        payment.status = "Atrazado";
      }
      if (payment.paid) {
        // Actualizar el estado del pago a "al corriente" si ya está pagado
        payment.status = "Al corriente";
      }

      await payment.save();
    }

    console.log("Actualización de estado de pagos completada");
  } catch (error) {
    console.error("Error al actualizar el estado de los pagos:", error);
  }
}

// Ejecutar la función de actualización cada cierto período de tiempo
setInterval(updatePaymentStatusSetInterval, 86400000); // Ejemplo: cada 24 hora

module.exports = {
  getLoanPayments,
  updatePaymentStatus,
};
