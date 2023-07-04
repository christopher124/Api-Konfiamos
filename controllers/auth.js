const bcrypt = require("bcryptjs");
const User = require("../models/user");
const Jwt = require("../utils/jwt");
const Role = require("../models/role");
const Mailjet = require("node-mailjet");
const path = require("path");
const fs = require("fs");

// Esta funtion crear nuevos usuarios en el sistema
async function register(req, res) {
  const { firstname, lastname, email, password } = req.body;
  if (!email) res.status(400).send({ msg: "El correo es obligatorio" });
  if (!password) res.status(400).send({ msg: "La contraseña es obligatoria" });

  try {
    // Verificar que el rol proporcionado existe
    const role = await Role.findById({ _id: "6493509edbe98df352d76753" });
    console.log(role);
    if (!role) {
      return res.status(400).send({ msg: "El rol no existe" });
    }

    const user = new User({
      firstname,
      lastname,
      email: email.toLowerCase(),
      role: role,
      username: firstname + " " + lastname,
      active: false,
    });

    const salt = bcrypt.genSaltSync(10);
    const hashPassword = bcrypt.hashSync(password, salt);
    user.password = hashPassword;

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
        .replace("{{lastname}}", user.lastname);

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
            Subject: "Bienvenido(a) a nuestro sistema de préstamos",
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

    res.status(200).send(user);
  } catch (error) {
    res.status(400).send({ msg: "Error al crear el usuario" });
  }
}

// Esta funtion logea usuarios en el sistema
function login(req, res) {
  const { email, password } = req.body;

  if (!email) res.status(400).send({ msg: "El correo es obligatorio" });
  if (!password) res.status(400).send({ msg: "La contraseña es obligatoria" });

  const emailLowerCase = email.toLowerCase();

  User.findOne({ email: emailLowerCase }, (error, userStore) => {
    if (error) {
      res.status(500).send({ msg: "Error del servidor" });
    } else if (!userStore) {
      // verificación de que el usuario existe
      console.log(userStore);
      res.status(404).send({
        msg: "El usuario no esta registrado, intente registrarse para iniciar sesion",
      });
    } else {
      bcrypt.compare(password, userStore.password, (bcryptError, check) => {
        if (bcryptError) {
          res.status(500).send({ msg: "Error del servidor" });
        } else if (!check) {
          res.status(400).send({ msg: "Correo o Contraseña incorrectas" });
        } else if (!userStore.active) {
          res.status(401).send({ msg: "Usuario no autorizado o no activo" });
        } else {
          const accessToken = Jwt.createAccessToken(userStore);
          const refreshToken = Jwt.createRefreshToken(userStore);

          // Aquí puedes incluir los datos del usuario en la respuesta
          const user = {
            // id: userStore.id,
            email: userStore.email,
            firstname: userStore.firstname,
            lastname: userStore.lastname,
            username: userStore.username,
            role: userStore.role.name,
            // Otros campos de usuario que desees incluir
          };

          res.status(200).send({
            access: accessToken,
            refresh: refreshToken,
            user: user,
          });
        }
      });
    }
  });
}

// Esta funtion refresca el token cuando expira en el sistema
function refreshAccessToken(req, res) {
  const { token } = req.body;

  if (!token) res.status(400).send({ msg: "Token requerido" });

  const { user_id } = Jwt.decoded(token);

  User.findOne({ _id: user_id }, (error, userStorage) => {
    if (error) {
      res.status(500).send({ msg: "Error del servidor" });
    } else {
      res.status(200).send({
        accessToken: Jwt.createAccessToken(userStorage),
      });
    }
  });
}

module.exports = {
  register,
  login,
  refreshAccessToken,
};
