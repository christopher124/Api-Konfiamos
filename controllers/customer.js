const LoanRequest = require("../models/loanRequest");
const Customer = require("../models/customer");
const image = require("../utils/image");
const path = require("path");
const fs = require("fs");

// Controlador para obtener el recuento de clientes registrados,con prestamo y sin prestamo
async function getCustomerCount(req, res) {
  try {
    const countWithLoan = await Customer.countDocuments({ status: true });
    const countWithoutLoan = await Customer.countDocuments({ status: false });

    res.status(200).send({
      countWithLoan: countWithLoan,
      countWithoutLoan: countWithoutLoan,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      msg: "Error al obtener el recuento de clientes: " + error.message,
    });
  }
}

// funtion para crear un cliente
async function createCustumer(req, res) {
  const {
    firstname,
    lastname,
    email,
    gender,
    phone,
    cellnumber,
    street,
    number_int_address,
    number_ext_address,
    neighborhood,
    zip,
    state,
    municipality,
    city,
    ocupation,
    accountStatus,
    identification,
    clave_int,
    banco,
  } = req.body;

  try {
    // verificar si ya existe un cliente con el mismo correo
    const existingEmail = await Customer.findOne({ email });
    if (existingEmail) {
      return res
        .status(400)
        .send({ msg: "Ya existe un cliente con el mismo correo." });
    }
    const customer = new Customer({
      firstname,
      lastname,
      email,
      gender,
      phone,
      cellnumber,
      street,
      number_int_address,
      number_ext_address,
      neighborhood,
      zip,
      state,
      municipality,
      city,
      ocupation,
      accountStatus,
      identification,
      clave_int,
      banco,
    });

    // validos si el Cliente manda imagen o no
    if (req.files.accountStatus) {
      const imagePath = image.getFilePath(req.files.accountStatus);
      customer.accountStatus = imagePath;
    }
    // validos si el Cliente manda imagen o no
    if (req.files.identification) {
      const imagePath = image.getFilePath(req.files.identification);
      customer.identification = imagePath;
    }

    const newCustumer = await customer.save();
    res.status(201).send(newCustumer);
  } catch (error) {
    console.log(error);
    res.status(500).send({ msg: "Error al crear el rol: " + error.message });
  }
}

// funcition para Actulizar un cliente
async function updateCustumer(req, res) {
  const { id } = req.params;
  const CustumerData = req.body;

  try {
    const existingCustomer = await Customer.findOne({
      email: CustumerData.email,
      _id: { $ne: id },
    });
    if (existingCustomer) {
      return res
        .status(400)
        .send({ msg: "Ya existe un cliente con el mismo correo." });
    }

    // validos si el Cliente manda imagen o no
    if (req.files.accountStatus) {
      const imagePath = image.getFilePath(req.files.accountStatus);
      CustumerData.accountStatus = imagePath;
    }
    // validos si el Cliente manda imagen o no
    if (req.files.identification) {
      const imagePath = image.getFilePath(req.files.identification);
      CustumerData.identification = imagePath;
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(id, CustumerData, {
      new: true,
    });
    if (!updatedCustomer) {
      return res.status(404).send({ msg: "Cliente no encontrado" });
    }

    res.status(200).send({
      msg: "Cliente actualizado correctamente",
      user: updatedCustomer,
    });
  } catch (error) {
    res
      .status(500)
      .send({ msg: "Error al actualizar el cliente: " + error.message });
  }
}

// fintion para eliminar un cliente
async function deleteCustomer(req, res) {
  const { id } = req.params;

  try {
    // Encontrar el cliente a eliminar
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).send({ msg: "No se encontró el Cliente" });
    }

    // Borrar lógicamente el cliente
    await customer.delete();

    // Desvincular los préstamos asociados al cliente
    await LoanRequest.updateMany({ customer: id }, { $unset: { customer: 1 } });

    res.status(200).send({ msg: "Cliente eliminado correctamente" });
  } catch (error) {
    res.status(500).send({ msg: "Error del servidor" + error });
  }
}

// function para restaurar un cliente
async function restoreCustomer(req, res) {
  const { id } = req.params;

  Customer.restore({ _id: id }, (error, restoredCustomer) => {
    if (error) {
      res.status(500).send({ msg: "Error del servidor" });
    } else if (!restoredCustomer) {
      res.status(404).send({ msg: "No se encontró el cliente" });
    } else {
      res.status(200).send({ msg: "Cliente restaurado correctamente" });
    }
  });
}

// fintion para ver a todos cliente
async function getCustomers(req, res) {
  const { status } = req.query;
  let response = null;
  try {
    if (status === undefined) {
      response = await Customer.find().populate("loanRequests");
    } else {
      response = await Customer.find({ status }).populate("loanRequests");
    }
    res.status(200).send(response);
  } catch (error) {
    res.status(400).send({ msg: "Error al obtener los clientes" });
  }
}

// fintion para ver un cliente
async function getCustomer(req, res) {
  const { id } = req.params;
  let response = null;

  try {
    response = await Customer.findById(id).populate("loanRequests");
    console.log(response);
    if (!response) {
      return res.status(404).send({ msg: "El cliente no existe" });
    }
    res.status(200).send(response);
  } catch (error) {
    console.log(error);
    res.status(500).send({ msg: "Error al obtener el cliente" });
  }
}

module.exports = {
  getCustomerCount,
  createCustumer,
  updateCustumer,
  deleteCustomer,
  restoreCustomer,
  getCustomers,
  getCustomer,
};
