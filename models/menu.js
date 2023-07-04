const mongoose = require("mongoose");
const deletePlugin = require("mongoose-delete");

const MenuSchema = mongoose.Schema({
  title: String,
  path: String,
  order: Number,
  active: Boolean,
});

MenuSchema.plugin(deletePlugin, {
  deletedAt: true, // Agregar campo "deletedAt"
  overrideMethods: true, // Sobrescribir métodos para incluir borrado lógico
});
module.exports = mongoose.model("Menu", MenuSchema);
