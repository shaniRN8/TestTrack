const TestCase = require("./models/TestCase");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Test API
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to TestTrack API",
    status: "Running"
  });
});



app.post("/api/testcases", async (req, res) => {
  try {
    const { title, description, steps, expectedResult, priority, status } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: "Test case title is required"
      });
    }

    const testCase = await TestCase.create({
      title: title.trim(),
      description: description ? description.trim() : "",
      steps: Array.isArray(steps) ? steps : [],
      expectedResult: expectedResult ? expectedResult.trim() : "",
      priority: priority || "Medium",
      status: status || "Draft"
    });

    res.status(201).json({
      message: "Test case created successfully",
      data: testCase
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create test case",
      error: error.message
    });
  }
});

// Get all Test Cases (Newest first)
app.get("/api/testcases", async (req, res) => {
  try {
    const testCases = await TestCase.find().sort({ createdAt: -1 });

    res.status(200).json({
      count: testCases.length,
      data: testCases
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve test cases",
      error: error.message
    });
  }
});

// Get Dashboard Statistics from actual database records
app.get("/api/testcases/stats", async (req, res) => {
  try {
    const total = await TestCase.countDocuments();
    const passed = await TestCase.countDocuments({ status: "Passed" });
    const failed = await TestCase.countDocuments({ status: "Failed" });
    const blocked = await TestCase.countDocuments({ status: "Blocked" });
    const skipped = await TestCase.countDocuments({ status: "Skipped" });
    const active = await TestCase.countDocuments({ status: "Active" });
    const draft = await TestCase.countDocuments({ status: "Draft" });
    const notRun = await TestCase.countDocuments({ status: "Not Run" });
    const highPriority = await TestCase.countDocuments({ priority: "High" });

    // Total test executions = passed + failed + blocked + skipped
    const totalExecutions = passed + failed + blocked + skipped;

    // Pass rate: passed divided by all executions as a percentage (safe against division by zero)
    // Skipped and blocked are NOT counted as passed
    const passRate = totalExecutions > 0 ? Math.round((passed / totalExecutions) * 100) : 0;
    const passRateExact = totalExecutions > 0 ? Number(((passed / totalExecutions) * 100).toFixed(1)) : 0;

    res.status(200).json({
      success: true,
      data: {
        total,
        totalExecutions,
        executed: totalExecutions,
        passed,
        failed,
        blocked,
        skipped,
        active,
        draft,
        notRun,
        highPriority,
        passRate,
        passRateExact
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve statistics",
      error: error.message
    });
  }
});

// Get a single Test Case by ID
app.get("/api/testcases/:id", async (req, res) => {
  try {
    const testCase = await TestCase.findById(req.params.id);

    if (!testCase) {
      return res.status(404).json({
        message: "Test case not found"
      });
    }

    res.status(200).json({
      data: testCase
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve test case",
      error: error.message
    });
  }
});

// Update a Test Case by ID
app.put("/api/testcases/:id", async (req, res) => {
  try {
    const { title, description, steps, expectedResult, priority, status } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: "Test case title is required"
      });
    }

    const updatedTestCase = await TestCase.findByIdAndUpdate(
      req.params.id,
      {
        title: title.trim(),
        description: description ? description.trim() : "",
        steps: Array.isArray(steps) ? steps : [],
        expectedResult: expectedResult ? expectedResult.trim() : "",
        priority: priority || "Medium",
        status: status || "Draft"
      },
      { new: true, runValidators: true }
    );

    if (!updatedTestCase) {
      return res.status(404).json({
        message: "Test case not found"
      });
    }

    res.status(200).json({
      message: "Test case updated successfully",
      data: updatedTestCase
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update test case",
      error: error.message
    });
  }
});

// Delete a Test Case by ID
app.delete("/api/testcases/:id", async (req, res) => {
  try {
    const deletedTestCase = await TestCase.findByIdAndDelete(req.params.id);

    if (!deletedTestCase) {
      return res.status(404).json({
        message: "Test case not found"
      });
    }

    res.status(200).json({
      message: "Test case deleted successfully",
      data: deletedTestCase
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete test case",
      error: error.message
    });
  }
});


// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  }
}


startServer();
