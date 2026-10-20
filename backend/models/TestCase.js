
const mongoose = require("mongoose");

const testCaseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    steps: {
      type: [String],
      default: []
    },
    expectedResult: {
      type: String,
      default: ""
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium"
    },
    status: {
      type: String,
      enum: ["Draft", "Active", "Not Run", "Passed", "Failed", "Blocked", "Skipped"],
      default: "Draft"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("TestCase", testCaseSchema);
