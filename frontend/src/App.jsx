import { useEffect, useState, useMemo } from "react";
import "./App.css";
import ExecutionPieChart from "./components/ExecutionPieChart";

const API_URL = "http://localhost:5000/api/testcases";
const STATS_API_URL = "http://localhost:5000/api/testcases/stats";

const INITIAL_FORM = {
  title: "",
  description: "",
  steps: "",
  expectedResult: "",
  priority: "Medium",
  status: "Draft",
};

function App() {
  const [testCases, setTestCases] = useState([]);
  const [dbStats, setDbStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState(null);

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);

  // View switch: "cards" or "table"
  const [viewMode, setViewMode] = useState("cards");

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [selectedStatusTab, setSelectedStatusTab] = useState("All");

  // Toast Notification State
  const [toast, setToast] = useState(null);

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  }

  // Fetch all test cases from backend
  async function fetchTestCases() {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error("Failed to load test cases");
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data.data || data.testCases || []);
      setTestCases(list);
    } catch (err) {
      console.error("fetchTestCases error:", err);
      showToast("Cannot connect to backend server on port 5000", "error");
    }
  }

  // Fetch actual database statistics from backend /api/testcases/stats
  async function fetchDatabaseStats() {
    try {
      setStatsLoading(true);
      const response = await fetch(STATS_API_URL);
      if (!response.ok) throw new Error("Failed to retrieve statistics");
      const result = await response.json();
      if (result && result.data) {
        setDbStats(result.data);
        setLastSyncedTime(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.warn("Database stats query failed, falling back to local list:", err);
    } finally {
      setStatsLoading(false);
    }
  }

  // Refresh both test cases and database statistics
  async function reloadAllData() {
    await Promise.all([fetchTestCases(), fetchDatabaseStats()]);
  }

  useEffect(() => {
    reloadAllData();
  }, []);

  // Compute live statistics and execution metrics calculated from actual database records
  const stats = useMemo(() => {
    if (dbStats) {
      const total = dbStats.total ?? testCases.length;
      const passed = dbStats.passed ?? 0;
      const failed = dbStats.failed ?? 0;
      const blocked = dbStats.blocked ?? 0;
      const skipped = dbStats.skipped ?? 0;
      const active = dbStats.active ?? 0;
      const draft = dbStats.draft ?? 0;
      const notRun = dbStats.notRun ?? 0;
      const highPriority = dbStats.highPriority ?? 0;

      // Total test executions = passed + failed + blocked + skipped
      const totalExecutions = dbStats.totalExecutions ?? (passed + failed + blocked + skipped);
      // Pass rate: passed divided by all executions as a percentage (safe against division by zero)
      // Skipped and blocked tests are NOT counted as passed
      const passRate = totalExecutions > 0 ? Math.round((passed / totalExecutions) * 100) : 0;
      const passRateExact = totalExecutions > 0 ? Number(((passed / totalExecutions) * 100).toFixed(1)) : 0;

      return {
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
        passRateExact,
        isDbSource: true,
      };
    }

    // Direct calculation from loaded testCases array
    const total = testCases.length;
    const passed = testCases.filter((tc) => tc.status === "Passed").length;
    const failed = testCases.filter((tc) => tc.status === "Failed").length;
    const blocked = testCases.filter((tc) => tc.status === "Blocked").length;
    const skipped = testCases.filter((tc) => tc.status === "Skipped").length;
    const active = testCases.filter((tc) => tc.status === "Active").length;
    const draft = testCases.filter((tc) => tc.status === "Draft").length;
    const notRun = testCases.filter((tc) => tc.status === "Not Run").length;
    const highPriority = testCases.filter((tc) => tc.priority === "High").length;

    // Total test executions = passed + failed + blocked + skipped
    const totalExecutions = passed + failed + blocked + skipped;
    // Pass rate: passed executions divided by all executions, expressed as percentage
    // Handled without division-by-zero error
    const passRate = totalExecutions > 0 ? Math.round((passed / totalExecutions) * 100) : 0;
    const passRateExact = totalExecutions > 0 ? Number(((passed / totalExecutions) * 100).toFixed(1)) : 0;

    return {
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
      passRateExact,
      isDbSource: false,
    };
  }, [dbStats, testCases]);

  // Open modal in Create Mode
  function handleOpenCreate() {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setIsModalOpen(true);
  }

  // Open modal in Edit Mode
  function handleOpenEdit(testCase) {
    setEditingId(testCase._id || testCase.id);
    setForm({
      title: testCase.title || "",
      description: testCase.description || "",
      steps: Array.isArray(testCase.steps) ? testCase.steps.join("\n") : (testCase.steps || ""),
      expectedResult: testCase.expectedResult || "",
      priority: testCase.priority || "Medium",
      status: testCase.status || "Draft",
    });
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
  }

  // Handle Form Change
  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // Handle Create or Update Submit
  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...form,
        steps: form.steps
          .split("\n")
          .map((step) => step.trim())
          .filter(Boolean),
      };

      const isEditing = Boolean(editingId);
      const url = isEditing ? `${API_URL}/${editingId}` : API_URL;
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Operation failed");

      showToast(isEditing ? "Test case updated successfully!" : "New test case added to repository!");
      handleCloseModal();
      await reloadAllData();
    } catch (err) {
      showToast(err.message || "Failed to save test case", "error");
    } finally {
      setLoading(false);
    }
  }

  // Quick 1-Click Status Run (Pass / Fail / Block / Skip)
  async function handleQuickStatusChange(testCase, newStatus) {
    const id = testCase._id || testCase.id;
    try {
      const payload = {
        title: testCase.title,
        description: testCase.description,
        steps: testCase.steps,
        expectedResult: testCase.expectedResult,
        priority: testCase.priority,
        status: newStatus,
      };

      const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to update status");

      showToast(`Status updated to "${newStatus}"!`);
      await reloadAllData();
    } catch (err) {
      showToast(err.message || "Status update failed", "error");
    }
  }

  // Delete test case
  async function handleDelete(id, title) {
    const confirmed = window.confirm(`Are you sure you want to permanently delete: "${title}"?`);
    if (!confirmed) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Failed to delete test case");

      showToast("Test case deleted from repository!");
      if (editingId === id) handleCloseModal();
      await reloadAllData();
    } catch (err) {
      showToast(err.message || "Delete failed", "error");
    } finally {
      setLoading(false);
    }
  }

  // Filter test cases
  const filteredTestCases = useMemo(() => {
    return testCases.filter((tc) => {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = tc.title ? tc.title.toLowerCase().includes(q) : false;
      const descMatch = tc.description ? tc.description.toLowerCase().includes(q) : false;
      const matchesSearch = q === "" || titleMatch || descMatch;

      const matchesPriority = selectedPriority === "All" || tc.priority === selectedPriority;
      const matchesStatusTab = selectedStatusTab === "All" || tc.status === selectedStatusTab;

      return matchesSearch && matchesPriority && matchesStatusTab;
    });
  }, [testCases, searchQuery, selectedPriority, selectedStatusTab]);

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          <div className="toast-icon">{toast.type === "success" ? "✓" : "⚠️"}</div>
          <div className="toast-text">{toast.message}</div>
          <button className="toast-close" onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      {/* Top Enterprise App Navigation */}
      <header className="app-navbar">
        <div className="nav-left">
          <div className="brand-badge">
            <span className="brand-logo-icon">🎯</span>
            <div className="brand-text">
              <h1>TestTrack</h1>
              <span className="brand-sub">QA Execution Hub</span>
            </div>
          </div>
          <div className="env-pill">
            <span className="pulse-dot"></span>
            <span>Local QA Staging</span>
          </div>
        </div>

        <div className="nav-right">
          <button className="btn-create-glow" onClick={handleOpenCreate}>
            <span className="btn-icon">+</span>
            <span>New Test Case</span>
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        {/* Visual Execution Progress Banner */}
        <section className="progress-banner">
          <div className="progress-header">
            <div>
              <h2>Test Execution Health</h2>
              <p>Live progress tracking across all documented test scenarios</p>
            </div>
            <div className="progress-metric">
              <span className="metric-rate">{stats.passRate}%</span>
              <span className="metric-label">Pass Rate</span>
            </div>
          </div>

          {/* Segmented Stacked Bar */}
          <div className="segmented-bar-track">
            {stats.total > 0 ? (
              <>
                <div
                  className="bar-seg seg-passed"
                  style={{ width: `${(stats.passed / stats.total) * 100}%` }}
                  title={`Passed: ${stats.passed} (${Math.round((stats.passed / stats.total) * 100)}%)`}
                ></div>
                <div
                  className="bar-seg seg-failed"
                  style={{ width: `${(stats.failed / stats.total) * 100}%` }}
                  title={`Failed: ${stats.failed} (${Math.round((stats.failed / stats.total) * 100)}%)`}
                ></div>
                <div
                  className="bar-seg seg-blocked"
                  style={{ width: `${(stats.blocked / stats.total) * 100}%` }}
                  title={`Blocked: ${stats.blocked} (${Math.round((stats.blocked / stats.total) * 100)}%)`}
                ></div>
                <div
                  className="bar-seg seg-skipped"
                  style={{ width: `${(stats.skipped / stats.total) * 100}%` }}
                  title={`Skipped: ${stats.skipped} (${Math.round((stats.skipped / stats.total) * 100)}%)`}
                ></div>
                <div
                  className="bar-seg seg-untested"
                  style={{
                    width: `${((stats.total - (stats.passed + stats.failed + stats.blocked + stats.skipped)) / stats.total) * 100}%`,
                  }}
                  title="Draft / Active / Not Run"
                ></div>
              </>
            ) : (
              <div className="bar-seg seg-empty" style={{ width: "100%" }}></div>
            )}
          </div>

          <div className="progress-legend">
            <span className="legend-item"><span className="legend-color color-passed"></span> Passed ({stats.passed})</span>
            <span className="legend-item"><span className="legend-color color-failed"></span> Failed ({stats.failed})</span>
            <span className="legend-item"><span className="legend-color color-blocked"></span> Blocked ({stats.blocked})</span>
            <span className="legend-item"><span className="legend-color color-skipped"></span> Skipped ({stats.skipped})</span>
            <span className="legend-item"><span className="legend-color color-untested"></span> Draft / Not Run ({stats.draft + stats.active + stats.notRun})</span>
          </div>
        </section>

        {/* Summary Statistics KPI Cards Grid */}
        <section className="kpi-grid">
          {/* 1. Total test executions */}
          <div className="kpi-card kpi-total">
            <div className="kpi-header">
              <span className="kpi-label">Total Test Executions</span>
              <span className="kpi-icon-box">⚡</span>
            </div>
            <div className="kpi-body">
              <span className="kpi-number">{stats.totalExecutions}</span>
              <span className="kpi-badge badge-primary">{stats.total} Cases in DB</span>
            </div>
          </div>

          {/* 2. Number of passed executions */}
          <div className="kpi-card kpi-passed">
            <div className="kpi-header">
              <span className="kpi-label">Passed Executions</span>
              <span className="kpi-icon-box">✅</span>
            </div>
            <div className="kpi-body">
              <span className="kpi-number">{stats.passed}</span>
              <span className="kpi-hint">
                {stats.totalExecutions > 0 ? `${Math.round((stats.passed / stats.totalExecutions) * 100)}% of runs` : "0% of runs"}
              </span>
            </div>
          </div>

          {/* 3. Number of failed executions */}
          <div className="kpi-card kpi-failed">
            <div className="kpi-header">
              <span className="kpi-label">Failed Executions</span>
              <span className="kpi-icon-box">❌</span>
            </div>
            <div className="kpi-body">
              <span className="kpi-number">{stats.failed}</span>
              <span className="kpi-hint">
                {stats.totalExecutions > 0 ? `${Math.round((stats.failed / stats.totalExecutions) * 100)}% of runs` : "0% of runs"}
              </span>
            </div>
          </div>

          {/* 4. Number of blocked executions */}
          <div className="kpi-card kpi-blocked">
            <div className="kpi-header">
              <span className="kpi-label">Blocked Executions</span>
              <span className="kpi-icon-box">⊘</span>
            </div>
            <div className="kpi-body">
              <span className="kpi-number">{stats.blocked}</span>
              <span className="kpi-hint">
                {stats.totalExecutions > 0 ? `${Math.round((stats.blocked / stats.totalExecutions) * 100)}% of runs` : "0% of runs"}
              </span>
            </div>
          </div>

          {/* 5. Number of skipped executions */}
          <div className="kpi-card kpi-skipped">
            <div className="kpi-header">
              <span className="kpi-label">Skipped Executions</span>
              <span className="kpi-icon-box">⏭</span>
            </div>
            <div className="kpi-body">
              <span className="kpi-number">{stats.skipped}</span>
              <span className="kpi-hint">
                {stats.totalExecutions > 0 ? `${Math.round((stats.skipped / stats.totalExecutions) * 100)}% of runs` : "0% of runs"}
              </span>
            </div>
          </div>

          {/* 6. Pass rate calculated as passed divided by all executions */}
          <div className="kpi-card kpi-rate">
            <div className="kpi-header">
              <span className="kpi-label">Execution Pass Rate</span>
              <span className="kpi-icon-box">🎯</span>
            </div>
            <div className="kpi-body">
              <span className="kpi-number">{stats.passRate}%</span>
              <span className="kpi-hint">
                {stats.totalExecutions > 0 ? `${stats.passed} / ${stats.totalExecutions} passed` : "No test runs"}
              </span>
            </div>
          </div>
        </section>

        {/* Interactive SVG Pie & Donut Chart calculated from actual database records */}
        <ExecutionPieChart
          stats={stats}
          onSelectStatus={(status) => setSelectedStatusTab(status)}
          onRefresh={fetchDatabaseStats}
          isRefreshing={statsLoading}
          lastSyncedTime={lastSyncedTime}
        />

        {/* Search, Filter Tabs & View Mode Switcher */}
        <section className="control-strip">
          {/* Status Tabs */}
          <div className="status-tabs">
            {["All", "Passed", "Failed", "Blocked", "Skipped", "Active", "Draft", "Not Run"].map((status) => {
              let count = stats.total;
              if (status === "Passed") count = stats.passed;
              if (status === "Failed") count = stats.failed;
              if (status === "Blocked") count = stats.blocked;
              if (status === "Skipped") count = stats.skipped;
              if (status === "Active") count = stats.active;
              if (status === "Draft") count = stats.draft;
              if (status === "Not Run") count = stats.notRun;

              return (
                <button
                  key={status}
                  className={`tab-btn ${selectedStatusTab === status ? "tab-active" : ""}`}
                  onClick={() => setSelectedStatusTab(status)}
                >
                  <span>{status}</span>
                  <span className="tab-count">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="control-right">
            {/* Search Input */}
            <div className="search-wrapper">
              <span className="search-glyph">🔍</span>
              <input
                type="text"
                placeholder="Search by title, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="search-clear-btn" onClick={() => setSearchQuery("")}>✕</button>
              )}
            </div>

            {/* Priority Selector */}
            <select
              className="select-priority"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
            >
              <option value="All">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>

            {/* View Switcher: Cards vs Table */}
            <div className="view-toggle">
              <button
                className={`view-btn ${viewMode === "cards" ? "view-btn-active" : ""}`}
                onClick={() => setViewMode("cards")}
                title="Cards View"
              >
                🎴 Cards
              </button>
              <button
                className={`view-btn ${viewMode === "table" ? "view-btn-active" : ""}`}
                onClick={() => setViewMode("table")}
                title="Table View"
              >
                📑 Table
              </button>
            </div>
          </div>
        </section>

        {/* Test Cases Main List */}
        <section className="testcases-container">
          <div className="list-meta-header">
            <h3>Test Scenarios ({filteredTestCases.length})</h3>
            {(searchQuery || selectedPriority !== "All" || selectedStatusTab !== "All") && (
              <span className="filter-badge">
                Filtered from {testCases.length} total
              </span>
            )}
          </div>

          {filteredTestCases.length === 0 ? (
            <div className="empty-state-modern">
              <div className="empty-graphic">📋</div>
              <h4>No test cases found</h4>
              <p>Try adjusting your search filters or create a new test case.</p>
              <button className="btn-create-glow" onClick={handleOpenCreate}>
                + Create Test Case
              </button>
            </div>
          ) : viewMode === "cards" ? (
            /* Cards View */
            <div className="cards-stream">
              {filteredTestCases.map((tc, index) => {
                const tcId = `TC-${String(index + 1).padStart(3, "0")}`;
                const priorityClass = tc.priority ? tc.priority.toLowerCase() : "medium";
                const statusClass = tc.status ? tc.status.toLowerCase().replace(/\s+/g, "-") : "draft";

                return (
                  <article className="scenario-card" key={tc._id || tc.id}>
                    {/* Card Top Strip */}
                    <div className="scenario-top">
                      <div className="scenario-id-title">
                        <span className="case-id-tag">{tcId}</span>
                        <h4>{tc.title}</h4>
                      </div>

                      <div className="scenario-chips">
                        <span className={`chip chip-priority priority-${priorityClass}`}>
                          {tc.priority}
                        </span>
                        <span className={`chip chip-status status-${statusClass}`}>
                          {tc.status}
                        </span>
                      </div>
                    </div>

                    {tc.description && (
                      <p className="scenario-desc">{tc.description}</p>
                    )}

                    {/* Test Steps Preview */}
                    {tc.steps && tc.steps.length > 0 && (
                      <div className="steps-container">
                        <span className="steps-title">Execution Steps ({tc.steps.length}):</span>
                        <ol className="steps-ordered-list">
                          {tc.steps.map((step, idx) => (
                            <li key={idx}>
                              <span className="step-num">{idx + 1}</span>
                              <span className="step-txt">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Expected Result */}
                    {tc.expectedResult && (
                      <div className="expected-result-box">
                        <span className="expected-label">Expected Result:</span>
                        <p>{tc.expectedResult}</p>
                      </div>
                    )}

                    {/* Card Footer: Quick Status Runners & Actions */}
                    <div className="scenario-footer">
                      {/* 1-Click Status Runner Chips */}
                      <div className="quick-runner">
                        <span className="runner-label">Quick Run:</span>
                        <button
                          className={`btn-run run-pass ${tc.status === "Passed" ? "run-active" : ""}`}
                          onClick={() => handleQuickStatusChange(tc, "Passed")}
                          title="Mark test as Passed"
                        >
                          ✓ Pass
                        </button>
                        <button
                          className={`btn-run run-fail ${tc.status === "Failed" ? "run-active" : ""}`}
                          onClick={() => handleQuickStatusChange(tc, "Failed")}
                          title="Mark test as Failed"
                        >
                          ✕ Fail
                        </button>
                        <button
                          className={`btn-run run-block ${tc.status === "Blocked" ? "run-active" : ""}`}
                          onClick={() => handleQuickStatusChange(tc, "Blocked")}
                          title="Mark test as Blocked"
                        >
                          ⊘ Block
                        </button>
                        <button
                          className={`btn-run run-skip ${tc.status === "Skipped" ? "run-active" : ""}`}
                          onClick={() => handleQuickStatusChange(tc, "Skipped")}
                          title="Mark test as Skipped"
                        >
                          ⏭ Skip
                        </button>
                      </div>

                      {/* Edit / Delete Buttons */}
                      <div className="footer-actions">
                        <button
                          className="btn-icon-action btn-edit-glass"
                          onClick={() => handleOpenEdit(tc)}
                          title="Edit test case"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn-icon-action btn-delete-glass"
                          onClick={() => handleDelete(tc._id || tc.id, tc.title)}
                          title="Delete test case"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="table-responsive-wrapper">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Test Scenario</th>
                    <th>Steps</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Quick Execution</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTestCases.map((tc, index) => {
                    const tcId = `TC-${String(index + 1).padStart(3, "0")}`;
                    const priorityClass = tc.priority ? tc.priority.toLowerCase() : "medium";
                    const statusClass = tc.status ? tc.status.toLowerCase().replace(/\s+/g, "-") : "draft";

                    return (
                      <tr key={tc._id || tc.id}>
                        <td><span className="case-id-tag">{tcId}</span></td>
                        <td>
                          <div className="table-title">{tc.title}</div>
                          {tc.description && <div className="table-sub">{tc.description}</div>}
                        </td>
                        <td>{tc.steps ? tc.steps.length : 0} steps</td>
                        <td>
                          <span className={`chip chip-priority priority-${priorityClass}`}>
                            {tc.priority}
                          </span>
                        </td>
                        <td>
                          <span className={`chip chip-status status-${statusClass}`}>
                            {tc.status}
                          </span>
                        </td>
                        <td>
                          <div className="table-quick-runner">
                            <button
                              className={`btn-mini-run pass-chip ${tc.status === "Passed" ? "active" : ""}`}
                              onClick={() => handleQuickStatusChange(tc, "Passed")}
                            >
                              ✓
                            </button>
                            <button
                              className={`btn-mini-run fail-chip ${tc.status === "Failed" ? "active" : ""}`}
                              onClick={() => handleQuickStatusChange(tc, "Failed")}
                            >
                              ✕
                            </button>
                            <button
                              className={`btn-mini-run block-chip ${tc.status === "Blocked" ? "active" : ""}`}
                              onClick={() => handleQuickStatusChange(tc, "Blocked")}
                              title="Mark Blocked"
                            >
                              ⊘
                            </button>
                            <button
                              className={`btn-mini-run skip-chip ${tc.status === "Skipped" ? "active" : ""}`}
                              onClick={() => handleQuickStatusChange(tc, "Skipped")}
                              title="Mark Skipped"
                            >
                              ⏭
                            </button>
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="btn-table-action"
                            onClick={() => handleOpenEdit(tc)}
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-table-action btn-table-del"
                            onClick={() => handleDelete(tc._id || tc.id, tc.title)}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Modern Slide-over / Centered Modal Dialog for Create & Edit */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="modal-icon">{editingId ? "✏️" : "✨"}</span>
                <div>
                  <h3>{editingId ? "Edit Test Case" : "Create New Test Case"}</h3>
                  <p>{editingId ? "Update existing test scenario steps and details" : "Document a new QA test case for your repository"}</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={handleCloseModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="title">Test Case Title *</label>
                <input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Verify checkout payment via Credit Card"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description / Objective</label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Provide test scenario context, preconditions, or test data..."
                  rows={2}
                />
              </div>

              <div className="form-group">
                <label htmlFor="steps">Test Steps (One step per line)</label>
                <textarea
                  id="steps"
                  name="steps"
                  value={form.steps}
                  onChange={handleChange}
                  placeholder={"1. Navigate to /checkout\n2. Fill card details: 4242 4242 4242...\n3. Click Pay Now"}
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label htmlFor="expectedResult">Expected Result</label>
                <textarea
                  id="expectedResult"
                  name="expectedResult"
                  value={form.expectedResult}
                  onChange={handleChange}
                  placeholder="e.g. Order confirmation screen appears with Order #1042"
                  rows={2}
                />
              </div>

              <div className="form-row-split">
                <div className="form-group">
                  <label htmlFor="priority">Priority</label>
                  <select
                    id="priority"
                    name="priority"
                    value={form.priority}
                    onChange={handleChange}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="status">Execution Status</label>
                  <select
                    id="status"
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Active">Active</option>
                    <option value="Not Run">Not Run</option>
                    <option value="Passed">Passed</option>
                    <option value="Failed">Failed</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Skipped">Skipped</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={handleCloseModal}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-save"
                  disabled={loading}
                >
                  {loading ? "Saving..." : editingId ? "Update Test Case" : "Save Test Case"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
