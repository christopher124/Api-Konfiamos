const mongoose = require("mongoose");
const deletePlugin = require("mongoose-delete");
const mongoosePaginate = require("mongoose-paginate");

const UserSchema = mongoose.Schema({
  firstname: String,
  lastname: String,
  email: {
    type: String,
    unique: true,
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
  },
  password: String,
  active: Boolean,
  avatar: String,
  username: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now(),
    required: true,
  },
});
UserSchema.plugin(deletePlugin, {
  deletedAt: true, // Agregar campo "deletedAt"
  overrideMethods: true, // Sobrescribir métodos para incluir borrado lógico
});
UserSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("User", UserSchema);
