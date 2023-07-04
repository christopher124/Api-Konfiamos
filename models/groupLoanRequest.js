const mongoose = require("mongoose");
const deletePlugin = require("mongoose-delete");

const GroupLoanRequestSchema = mongoose.Schema({
  group: {
    type: String,
  },
  code: String,
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now(),
  },
});

GroupLoanRequestSchema.plugin(deletePlugin, {
  deletedAt: true,
  overrideMethods: true,
});

module.exports = mongoose.model("GroupLoanRequest", GroupLoanRequestSchema);
