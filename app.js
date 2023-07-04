const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { API_VERSION } = require("./constants");

const app = express();

/// Import Routings
const authRoutes = require("./router/auth");
const roleRoutes = require("./router/role");
const userRoutes = require("./router/user");
const customerRoutes = require("./router/customer");
const menuRoutes = require("./router/menu");
const loanRequestRoutes = require("./router/loanRequest");
const paymentRoutes = require("./router/payment");
const groupLoanRequest = require("./router/groupLoanRequest");

// Configure Body Parse
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configure static folder
app.use(express.static("uploads"));

// Configure Header HTTP - CORS
app.use(cors());

// Configure routings
app.use(`/api/${API_VERSION}`, authRoutes);
app.use(`/api/${API_VERSION}`, roleRoutes);
app.use(`/api/${API_VERSION}`, userRoutes);
app.use(`/api/${API_VERSION}`, menuRoutes);
app.use(`/api/${API_VERSION}`, loanRequestRoutes);
app.use(`/api/${API_VERSION}`, customerRoutes);
app.use(`/api/${API_VERSION}`, paymentRoutes);
app.use(`/api/${API_VERSION}`, groupLoanRequest);

module.exports = app;
