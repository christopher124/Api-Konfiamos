const mongoose = require("mongoose");
const deletePlugin = require("mongoose-delete");

const PaymentSchema = mongoose.Schema({
  loanRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LoanRequest",
  },
  paymentAmount: Number,
  paymentDate: Date,
  partialPayment: {
    type: Boolean,
    default: false,
  },
  partialPaymentAmount: {
    type: Number,
    default: 0,
  },
  comment: String,
  paid: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ["Al corriente", "Atrasado", "En validación"],
    default: "Al corriente",
  },
  dueDate: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now(),
  },
});

PaymentSchema.plugin(deletePlugin, {
  deletedAt: true, // Agregar campo "deletedAt"
  overrideMethods: true, // Sobrescribir métodos para incluir borrado lógico
});

module.exports = mongoose.model("Payment", PaymentSchema);
