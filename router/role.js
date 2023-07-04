const express = require("express");
const RoleController = require("../controllers/role");
const md_auth = require("../middlewares/authenticated");

const api = express.Router();

// creaccion de rol
api.post("/role", [md_auth.asureAuth], RoleController.createRole);
// actualizacion de rol
api.put("/role/:id", [md_auth.asureAuth], RoleController.updateRole);
// Obtener todos los roles
api.get("/roles", [md_auth.asureAuth], RoleController.getRoles);
// Obtener un rol
api.get("/role/:id", [md_auth.asureAuth], RoleController.getRol);
// Eliminar un rol
api.delete("/role/:id", [md_auth.asureAuth], RoleController.deleteRole);
// recuperacion de rol
api.put("/role/:id/restore", [md_auth.asureAuth], RoleController.restoreRole);
module.exports = api;
