const express = require("express");
const md_auth = require("../middlewares/authenticated");
const paymentController = require("../controllers/payment");

const api = express.Router();

// Recuperacion de los pagos de un prestamo
api.get(
  "/loanpayments/:id",
  [md_auth.asureAuth],
  paymentController.getLoanPayments
);

// actulizacion del array de los pagos del cliente
api.put("/loanpayment/:id", paymentController.updatePaymentStatus);

module.exports = api;
