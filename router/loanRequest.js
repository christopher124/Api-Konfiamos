const express = require("express");
const multiparty = require("connect-multiparty");
const md_auth = require("../middlewares/authenticated");
const LoanRequestController = require("../controllers/loanRequest");

// Middleware para subir documentos del usuario
const md_upload = multiparty({
  uploadDir: "./uploads/loanrequest",
});

const api = express.Router();

api.get("/totalinvestment", LoanRequestController.getTotalInvestment);

// creacion del prestamo
api.post(
  "/loanrequest",
  [md_auth.asureAuth, md_upload],
  LoanRequestController.createLoanRequest
);
// actulizacion de prestamo
api.put(
  "/loanrequest/:id",
  [md_auth.asureAuth],
  LoanRequestController.updateLoanRequest
);

// Recuperacion de todos los prestamos
api.get(
  "/loanrequests",
  [md_auth.asureAuth],
  LoanRequestController.getLoanRequests
);

// Recuperacion de un prestamo
api.get(
  "/loanrequest/:id",
  [md_auth.asureAuth],
  LoanRequestController.getLoanRequest
);

// Eliminar un prestamo
api.delete(
  "/loanrequest/:id",
  [md_auth.asureAuth],
  LoanRequestController.deleteLoanRequest
);

// recuperacion de rol
api.put(
  "/loanrequest/:id/restore",
  [md_auth.asureAuth],
  LoanRequestController.restoreLoanRequest
);

module.exports = api;
