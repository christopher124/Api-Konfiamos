const Role = require("../models/role");

// function para crear un rol
async function createRole(req, res) {
  const { name, description, displayName } = req.body;

  try {
    // Verificar si ya existe un rol con el mismo nombre
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res
        .status(400)
        .send({ msg: "Ya existe un rol con el mismo nombre." });
    }

    const role = new Role({
      name,
      description,
      displayName,
    });

    const newRole = await role.save();
    res.status(201).send(newRole);
  } catch (error) {
    res.status(500).send({ msg: "Error al crear el rol" });
  }
}

// function para actulizar un role
async function updateRole(req, res) {
  const { id } = req.params;
  const RoleData = req.body;

  try {
    const updateRole = await Role.findByIdAndUpdate(id, RoleData, {
      new: true,
    });
    if (!updateRole) {
      return res.status(404).send({ msg: "Rol no encontrado" });
    }
    res
      .status(200)
      .send({ msg: "Rol actulizado correctamente", role: updateRole });
  } catch (error) {
    res.status(404).send({ msg: "Error al actulizar el rol" });
  }
}

// function para restaurar un rol
async function restoreRole(req, res) {
  const { id } = req.params;

  Role.restore({ _id: id }, (error, restoredRole) => {
    if (error) {
      res.status(500).send({ msg: "Error del servidor" });
    } else if (!restoredRole) {
      res.status(404).send({ msg: "No se encontró el rol" });
    } else {
      res.status(200).send({ msg: "Rol restaurado correctamente" });
    }
  });
}

// function para ver todos los roles
async function getRoles(req, res) {
  const { deleted } = req.query;
  let response = null;

  if (deleted === undefined) {
    response = await Role.find();
    console.log(response);
  } else {
    response = await Role.find({ deleted: false });
    console.log(response);
  }

  res.status(200).send(response);
}

// function para ver un role
async function getRol(req, res) {
  const { id } = req.params;
  let response = null;

  try {
    response = await Role.findById(id);
    console.log(response);
    if (!response) {
      return res.status(404).send({ msg: "El rol no existe" });
    }
    res.status(200).send(response);
  } catch (err) {
    console.error(err);
    res.status(500).send({ msg: "Error al obtener el rol" });
  }
}

// function para eliminar un role
async function deleteRole(req, res) {
  const { id } = req.params;

  Role.delete({ _id: id }, (error, deletedRole) => {
    if (error) {
      res.status(500).send({ msg: "Error del servidor" });
    } else if (!deletedRole) {
      res.status(404).send({ msg: "No se encontró el rol" });
    } else {
      res.status(200).send({ msg: "Rol eliminado correctamente" });
    }
  });
}

module.exports = {
  createRole,
  updateRole,
  getRoles,
  getRol,
  deleteRole,
  restoreRole,
};
