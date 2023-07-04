const express = require("express");
const md_auth = require("../middlewares/authenticated");
const GroupLoanRequestController = require("../controllers/groupLoanRequest");

const api = express.Router();

api.post(
  "/grouploanrequests",
  [md_auth.asureAuth],
  GroupLoanRequestController.createGroupLoanRequest
);
api.post(
  "/createLoanRequest",
  [md_auth.asureAuth],
  GroupLoanRequestController.createLoanRequest
);

module.exports = api;
