const mongoose = require("mongoose");
const deletePlugin = require("mongoose-delete");

const RoleSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  displayName: String,
  description: String,
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  updatedAt: {
    type: Date,
    default: Date.now(),
  },
});

RoleSchema.plugin(deletePlugin, {
  deletedAt: true, // Agregar campo "deletedAt"
  overrideMethods: true, // Sobrescribir métodos para incluir borrado lógico
});

module.exports = mongoose.model("Role", RoleSchema);
