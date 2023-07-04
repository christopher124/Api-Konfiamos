const mongoose = require("mongoose");
const app = require("./app");
const {
  API_VERSION,
  DB_HOST,
  DB,
  DB_PASSWORD,
  DB_USER,
  IP_SERVER,
} = require("./constants");

const PORT = process.env.POST || 3977;

// Conexión a la base de datos
(async () => {
  try {
    await mongoose.connect(
      `mongodb+srv://${DB_USER}:${DB_PASSWORD}@${DB_HOST}/${DB}`,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("#####################");
    console.log("##### API REST ######");
    console.log("#####################");
    console.log(`http://${IP_SERVER}:${PORT}/api/${API_VERSION}`);
    app.listen(PORT, () => {
      console.log(`La aplicación está escuchando en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error("Error al conectar a la base de datos:", error.message);
  }
})();
