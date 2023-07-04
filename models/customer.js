const mongoose = require("mongoose");
const deletePlugin = require("mongoose-delete");

const CustomerSchema = mongoose.Schema({
  loanRequests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LoanRequest",
    },
  ],
  firstname: String,
  lastname: String,
  gender: String,
  email: {
    type: String,
    unique: true,
  },
  phone: String,
  cellnumber: String,
  street: String,
  number_int_address: String,
  number_ext_address: String,
  neighborhood: String,
  zip: String,
  state: String,
  municipality: String,
  city: String,
  status: {
    type: Boolean,
    default: false,
  },
  ocupation: String,
  accountStatus: String,
  identification: String,
  clave_int: String,
  banco: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now(),
  },
});

CustomerSchema.plugin(deletePlugin, {
  deletedAt: true, // Agregar campo "deletedAt"
  overrideMethods: true, // Sobrescribir métodos para incluir borrado lógico
});

module.exports = mongoose.model("Customer", CustomerSchema);
