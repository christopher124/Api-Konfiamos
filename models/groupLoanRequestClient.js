const mongoose = require("mongoose");
const deletePlugin = require("mongoose-delete");

const GroupLoanRequestClientSchema = mongoose.Schema({
  groupLoanRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GroupLoanRequest",
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
  },
  code: String,
  amountRequested: Number,
  status: {
    type: String,
    enum: ["Atrazado", "Al corriente", "No iniciado"],
    default: "No iniciado",
  },
  period: {
    type: Number,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  interestAmount: Number,
  totalAmount: Number,
  interestRate: Number, // Interés variable
  payments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
  ], // Referencia a los pagos realizados por el cliente
  periodPaid: {
    type: Number,
    default: 0,
  },
  totalPaid: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now(),
  },
});

GroupLoanRequestClientSchema.plugin(deletePlugin, {
  deletedAt: true,
  overrideMethods: true,
});

module.exports = mongoose.model(
  "GroupLoanRequestClient",
  GroupLoanRequestClientSchema
);
