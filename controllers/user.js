const bcrypt = require("bcryptjs");
const User = require("../models/user");
const image = require("../utils/image");
const Mailjet = require("node-mailjet");
const path = require("path");
const fs = require("fs");

// function para obtener los dotos del usuario logueado
async function getMe(req, res) {
  const { user_id } = req.user;

  try {
    const response = await User.findById(user_id).populate("role");
    if (!response) {
      res.status(400).send({ msg: "No se ha encontrado usuario" });
    } else {
      res.status(200).send(response);
    }
  } catch (error) {
    res.status(500).send({ msg: "Error al obtener los datos del usuario" });
  }
}

// function para obtener los dotos de los usuario en el sistema
async function getUsers(req, res) {
  const { active } = req.query;
  let response = null;
  console.log(response);
  if (active === undefined) {
    response = await User.find().populate("role");
  } else {
    response = await User.find({ active }).populate("role");
  }

  res.status(200).send(response);
}

// function para obtener los dotos de un usuario en el sistema
async function getUser(req, res) {
  const { id } = req.params;
  let response = null;

  try {
    response = await User.findById(id).populate("role");
    console.log(response);
    if (!response) {
      return res.status(404).send({ msg: "El usuario no existe" });
    }
    res.status(200).send(response);
  } catch (error) {
    console.log(error);
    res.status(500).send({ msg: "Error al obtener el usuario" });
  }
}

// function para crear un usuario
async function createUser(req, res) {
  try {
    const { firstname, lastname, password } = req.body;
    const user = new User({
      ...req.body,
      active: false,
      username: firstname + " " + lastname,
    });

    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res
        .status(400)
        .send({ msg: "El correo electrónico ya está registrado" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    user.password = hashedPassword;

    if (req.files.avatar) {
      const imagePath = image.getFilePath(req.files.avatar);
      user.avatar = imagePath;
    }

    await user.save();

    try {
      // Leer el contenido de la plantilla de correo electrónico desde el archivo
      const templatePath = path.join(
        __dirname,
        "../mails/Register/registration-email.html"
      );
      const registrationEmailTemplate = fs.readFileSync(templatePath, "utf8");

      // Reemplazar los marcadores de posición con los valores del usuario
      const formattedEmail = registrationEmailTemplate
        .replace("{{firstname}}", user.firstname)
        .replace("{{lastname}}", user.lastname)
        .replace("{{email}}", user.email)
        .replace("{{role}}", user.role.displayName)
        .replace("{{password}}", password); // Utiliza la contraseña original en lugar de la encriptada
      console.log(user.role.displayName);
      const mailjet = new Mailjet({
        apiKey: "180a220b38b1478a458cb1d375f4561c",
        apiSecret: "6a2a8bbe4c8a73a9f8e09582bcd15c98",
      });

      const request = mailjet.post("send", { version: "v3.1" }).request({
        Messages: [
          {
            From: {
              Email: "soporte@konfiamos.com",
              Name: "Soporte",
            },
            To: [
              {
                Email: user.email,
                Name: `${user.firstname} ${user.lastname}`,
              },
            ],
            Subject: "Bienvenido(a) al portal konfiamos",
            HTMLPart: formattedEmail,
          },
        ],
      });

      try {
        const response = await request;
        console.log("Correo enviado:", response.body);
      } catch (error) {
        console.error(
          "Error al enviar el correo:",
          error.statusCode,
          error.ErrorMessage
        );
      }
    } catch (error) {
      console.error("Error al leer el archivo:", error);
      // Aquí puedes manejar el error de acuerdo a tus necesidades
    }

    res.status(201).send(user);
  } catch (error) {
    res.status(400).send({ msg: "Error al crear el usuario" });
  }
}

// funcition para Actulizar un usuario
async function updateUser(req, res) {
  const { id } = req.params;
  const userData = req.body;

  // Password Actualizacion
  if (userData.password) {
    const salt = bcrypt.genSaltSync(10);
    const hasPassword = bcrypt.hashSync(userData.password, salt);
    userData.password = hasPassword;
  } else {
    delete userData.password;
  }

  // Avatar Actulizar
  if (req.files.avatar) {
    const imagePath = image.getFilePath(req.files.avatar);
    userData.avatar = imagePath;
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(id, userData, {
      new: true,
    });
    if (!updatedUser) {
      return res.status(404).send({ msg: "Usuario no encontrado" });
    }
    res
      .status(200)
      .send({ msg: "Usuario actualizado correctamente", user: updatedUser });
  } catch (error) {
    res.status(400).send({ msg: "Error al actualizar el usuario", error });
  }
}

// function para restaurar un Usuario
async function restoreUser(req, res) {
  const { id } = req.params;

  User.restore({ _id: id }, (error, restoredUser) => {
    if (error) {
      res.status(500).send({ msg: "Error del servidor" });
    } else if (!restoredUser) {
      res.status(404).send({ msg: "No se encontró el Usuario" });
    } else {
      res.status(200).send({ msg: "Usuario restaurado correctamente" });
    }
  });
}

// function para eliminar un usuario
async function deleteUser(req, res) {
  const { id } = req.params;

  User.delete({ _id: id }, (error, deletedUser) => {
    if (error) {
      res.status(500).send({ msg: "Error del servidor" });
    } else if (!deletedUser) {
      res.status(404).send({ msg: "No se encontró el usuario" });
    } else {
      res.status(200).send({ msg: "Usuario eliminado correctamente" });
    }
  });
}

module.exports = {
  getMe,
  getUsers,
  getUser,
  createUser,
  updateUser,
  restoreUser,
  deleteUser,
};
