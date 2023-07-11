const express = require("express");
const multiparty = require("connect-multiparty");
const CustomerController = require("../controllers/customer");
const md_auth = require("../middlewares/authenticated");

// Middleware para subir documetos del cliente
const md_upload = multiparty({
  uploadDir: "./uploads/documents",
});

const api = express.Router();

// Crear un nuevo cliente
api.post(
  "/customer",
  [md_auth.asureAuth, md_upload],
  CustomerController.createCustumer
);
// actulizar un cliente
api.patch(
  "/customer/:id",
  [md_auth.asureAuth, md_upload],
  CustomerController.updateCustumer
);
// Eliminar un cliente
api.delete(
  "/customer/:id",
  [md_auth.asureAuth],
  CustomerController.deleteCustomer
);
// recuperacion de cliente
api.put(
  "/customer/:id/restore",
  [md_auth.asureAuth],
  CustomerController.restoreCustomer
);
// Obtener todos los cliente
api.get("/customers", [md_auth.asureAuth], CustomerController.getCustomers);

// Ruta para contar clientes
api.get("/customers/count", CustomerController.getCustomerCount);

// Obtener un cliente
api.get("/customer/:id", [md_auth.asureAuth], CustomerController.getCustomer);

module.exports = api;
