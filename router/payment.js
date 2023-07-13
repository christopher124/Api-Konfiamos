const express = require("express");
const md_auth = require("../middlewares/authenticated");
const PaymentController = require("../controllers/payment");

const api = express.Router();

// Recuperacion de los pagos de un prestamo
api.get(
  "/loanpayments/:id",
  [md_auth.asureAuth],
  PaymentController.getLoanPayments
);

// actulizacion del array de los pagos del cliente
api.put("/loanpayment/:id", PaymentController.updatePaymentStatus);

module.exports = api;
