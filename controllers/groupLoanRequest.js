const Customer = require("../models/customer");
const GroupLoanRequestClient = require("../models/groupLoanRequestClient");
const GroupLoanRequest = require("../models/groupLoanRequest");

// Controlador para crear un grupo de préstamo
const createGroupLoanRequest = async (req, res) => {
  const { group, startDate, endDate } = req.body;

  try {
    // Contar la cantidad de grupos de préstamo existentes
    const count = await GroupLoanRequest.countDocuments();

    // Generar el código del grupo de préstamo con números consecutivos
    const groupCode = `TPC_${(count + 1).toString().padStart(4, "0")}`;

    // Crear un nuevo grupo de préstamo
    const groupLoanRequest = new GroupLoanRequest({
      group,
      code: groupCode,
      startDate,
      endDate,
    });

    // Guardar el grupo de préstamo en la base de datos
    await groupLoanRequest.save();

    res.status(201).json({ success: true, groupLoanRequest });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, error: "Error al crear el grupo de préstamo" });
  }
};

async function createLoanRequest(req, res) {
  const {
    customerId,
    groupId,
    amountRequested,
    period,
    startDate,
    interestRate,
  } = req.body;

  try {
    // Obtener el cliente
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).send({ msg: "Cliente no encontrado" });
    }
    // Verificar si el cliente tiene préstamos pendientes
    if (customer.loanRequests && customer.loanRequests.length > 0) {
      const lastLoanRequest =
        customer.loanRequests[customer.loanRequests.length - 1];

      // Verificar si el período anterior al último préstamo está completamente pagado
      if (lastLoanRequest.periodPaid < lastLoanRequest.period - 1) {
        return res.status(400).send({
          msg: "Debe pagar el préstamo anterior antes de generar otro préstamo",
        });
      }
    }

    // Obtener el grupo de préstamo
    const groupLoanRequest = await GroupLoanRequest.findById(groupId);
    if (!groupLoanRequest) {
      return res.status(404).send({ msg: "Grupo de préstamo no encontrado" });
    }

    // Generar el código del préstamo usando las iniciales del cliente y un número consecutivo
    const initials = `${
      customer.firstname ? customer.firstname.charAt(0) : ""
    }${customer.lastname ? customer.lastname.charAt(0) : ""}`;
    const loanRequestCount = groupLoanRequest.clients.length + 1;
    const code = `TPC_${loanRequestCount
      .toString()
      .padStart(4, "0")}_${initials}`;

    const endDate = moment(startDate).add(period * 15, "days");
    const amountRequestedBig = new Big(amountRequested);
    const interestRateBig = new Big(interestRate);
    const interestAmount = amountRequestedBig.times(interestRateBig);
    const totalAmount = amountRequestedBig.plus(interestAmount);

    const groupLoanRequestClient = new GroupLoanRequestClient({
      groupLoanRequest: groupId,
      customer: customerId,
      code,
      amountRequested,
      status: "No iniciado",
      period,
      startDate,
      endDate,
      interestAmount: interestAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      interestRate,
      payments: [], // Los pagos se generarán posteriormente
      periodPaid: 0,
      totalPaid: 0,
    });

    // Guardar el préstamo individual en la base de datos
    await groupLoanRequestClient.save();

    // Agregar el préstamo individual al grupo de préstamo
    groupLoanRequest.clients.push(groupLoanRequestClient._id);
    await groupLoanRequest.save();

    res.status(201).send(groupLoanRequestClient);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      msg: "Error al crear la solicitud de préstamo",
      error: error.message, // Agrega el mensaje de error al objeto de respuesta
    });
  }
}

module.exports = {
  createGroupLoanRequest,
  createLoanRequest,
};
