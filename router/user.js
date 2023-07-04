const express = require("express");
const multiparty = require("connect-multiparty");
const UserController = require("../controllers/user");
const md_auth = require("../middlewares/authenticated");

// Middleware para subir avatar del usuario
const md_upload = multiparty({
  uploadDir: "./uploads/avatar",
});

const api = express.Router();

// obtener la informacion de usuario
api.get("/user/me", [md_auth.asureAuth], UserController.getMe);
// Obtener todos los usuarios
api.get("/users", [md_auth.asureAuth], UserController.getUsers);
// Obtener un usuario
api.get("/user/:id", [md_auth.asureAuth], UserController.getUser);
// creaccion de usuario
api.post("/user", [md_auth.asureAuth, md_upload], UserController.createUser);
// eliminacion de usuario
api.delete("/user/:id", [md_auth.asureAuth], UserController.deleteUser);
// recuperacion de usuario
api.put("/user/:id/restore", [md_auth.asureAuth], UserController.restoreUser);
// Actualización parcial de usuario (incluye avatar)
api.patch(
  "/user/:id",
  [md_auth.asureAuth, md_upload],
  UserController.updateUser
);

module.exports = api;
