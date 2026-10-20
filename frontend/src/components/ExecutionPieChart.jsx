import { useState } from "react";

/**
 * ExecutionPieChart
 * 
 * Interactive SVG Pie & Donut Chart calculating values from actual database records:
 * - Total test executions
 * - Number of passed executions
 * - Number of failed executions
 * - Number of blocked executions
 * - Number of skipped executions
 * - Pass rate (Passed / Total Executions * 100)
 * 
 * Safe against division-by-zero when no test runs exist.
 */
export default function ExecutionPieChart({
  stats,
  onSelectStatus,
  onRefresh,
  isRefreshing,
  lastSyncedTime
}) {
  const [chartMode, setChartMode] = useState("donut"); // "donut" or "pie"
  const [hoveredSlice, setHoveredSlice] = useState(null);

  const total = stats.totalExecutions || 0;
  const passed = stats.passed || 0;
  const failed = stats.failed || 0;
  const blocked = stats.blocked || 0;
  const skipped = stats.skipped || 0;

  // Safe pass rate calculation without division by zero
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  const passRateExact = total > 0 ? Number(((passed / total) * 100).toFixed(1)) : 0;

  const categories = [
    {
      id: "Passed",
      label: "Passed Executions",
      shortLabel: "Passed",
      value: passed,
      color: "#10b981",
      hoverColor: "#059669",
      icon: "✓",
      desc: "Tests passed successfully"
    },
    {
      id: "Failed",
      label: "Failed Executions",
      shortLabel: "Failed",
      value: failed,
      color: "#ef4444",
      hoverColor: "#dc2626",
      icon: "✕",
      desc: "Tests failed during run"
    },
    {
      id: "Blocked",
      label: "Blocked Executions",
      shortLabel: "Blocked",
      value: blocked,
      color: "#f59e0b",
      hoverColor: "#d97706",
      icon: "⊘",
      desc: "Blocked by dependencies or environment"
    },
    {
      id: "Skipped",
      label: "Skipped Executions",
      shortLabel: "Skipped",
      value: skipped,
      color: "#8b5cf6",
      hoverColor: "#7c3aed",
      icon: "⏭",
      desc: "Skipped during test execution"
    }
  ];

  // SVG Geometry Constants
  const cx = 160;
  const cy = 160;
  const rOuter = 116;
  const rInner = chartMode === "donut" ? 72 : 0;

  // Polar to Cartesian Helper
  const polarToCartesian = (angle, radius) => {
    const rad = ((angle - 90) * Math.PI) / 180.0;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad)
    };
  };

  // Generate pie slices
  const activeItems = categories.filter((cat) => cat.value > 0);
  const isSingleSlice = activeItems.length === 1;

  let currentAngle = 0;
  const slices = activeItems.map((item) => {
    const sliceAngle = total > 0 ? (item.value / total) * 360 : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    const midAngle = startAngle + sliceAngle / 2;
    const percentage = total > 0 ? Number(((item.value / total) * 100).toFixed(1)) : 0;

    const p1 = polarToCartesian(startAngle, rOuter);
    const p2 = polarToCartesian(endAngle, rOuter);
    const largeArc = sliceAngle > 180 ? 1 : 0;

    let path = "";
    if (rInner > 0) {
      const p3 = polarToCartesian(endAngle, rInner);
      const p4 = polarToCartesian(startAngle, rInner);
      path = `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 ${largeArc} 0 ${p4.x} ${p4.y} Z`;
    } else {
      path = `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`;
    }

    // Offset for pop out on hover
    const isHovered = hoveredSlice === item.id;
    const popDistance = isHovered ? 8 : 0;
    const popRad = ((midAngle - 90) * Math.PI) / 180.0;
    const popX = Math.cos(popRad) * popDistance;
    const popY = Math.sin(popRad) * popDistance;

    // Label position
    const labelRadius = rInner > 0 ? (rOuter + rInner) / 2 : rOuter * 0.68;
    const labelPos = polarToCartesian(midAngle, labelRadius);

    return {
      ...item,
      sliceAngle,
      startAngle,
      endAngle,
      midAngle,
      percentage,
      path,
      popX,
      popY,
      labelPos,
      isHovered
    };
  });

  const activeHoverCategory = hoveredSlice
    ? categories.find((c) => c.id === hoveredSlice)
    : null;

  return (
    <section className="pie-analytics-card" id="test-run-statistics">
      {/* Card Header */}
      <div className="pie-card-header">
        <div className="pie-title-area">
          <div className="pie-title-row">
            <span className="pie-title-icon">📊</span>
            <div>
              <h3>Test Run Statistics</h3>
              <p>Execution breakdown & pass rate from actual database records</p>
            </div>
          </div>
        </div>

        <div className="pie-header-actions">
          {/* Database Sync Pill */}
          <div className="db-sync-badge" title="Values calculated from MongoDB database records">
            <span className={`db-indicator-dot ${isRefreshing ? "pulsing" : ""}`}></span>
            <span>Database Records</span>
            {lastSyncedTime && <span className="sync-time">({lastSyncedTime})</span>}
          </div>

          {/* Refresh DB Query Button */}
          {onRefresh && (
            <button
              className="btn-refresh-stats"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Re-query MongoDB database for live test run statistics"
            >
              <span className={`refresh-glyph ${isRefreshing ? "spin-animate" : ""}`}>↻</span>
              <span>{isRefreshing ? "Querying DB..." : "Query DB"}</span>
            </button>
          )}

          {/* Chart View Switcher: Donut vs Solid Pie */}
          <div className="chart-mode-toggle">
            <button
              className={`mode-btn ${chartMode === "donut" ? "mode-btn-active" : ""}`}
              onClick={() => setChartMode("donut")}
              title="Donut Chart View"
            >
              🍩 Donut
            </button>
            <button
              className={`mode-btn ${chartMode === "pie" ? "mode-btn-active" : ""}`}
              onClick={() => setChartMode("pie")}
              title="Solid Pie Chart View"
            >
              🥧 Pie
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Chart on Left, Detailed Legend Breakdown on Right */}
      <div className="pie-card-body">
        {/* Left: SVG Chart Area */}
        <div className="chart-visual-pane">
          <div className="svg-container">
            <svg
              viewBox="0 0 320 320"
              className="pie-svg"
              role="img"
              aria-label="Test run executions pie chart"
            >
              <defs>
                <filter id="pie-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.25" />
                </filter>
                <filter id="slice-active-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="6" stdDeviation="8" floodOpacity="0.35" />
                </filter>
              </defs>

              {total === 0 ? (
                /* Empty state when no test executions exist */
                <g className="pie-empty-state">
                  <circle
                    cx={cx}
                    cy={cy}
                    r={chartMode === "donut" ? 95 : 116}
                    fill={chartMode === "donut" ? "none" : "#f8fafc"}
                    stroke="#cbd5e1"
                    strokeWidth={chartMode === "donut" ? "24" : "2"}
                    strokeDasharray="6 6"
                  />
                  <text x={cx} y={cy - 12} textAnchor="middle" className="svg-empty-title">
                    0 Executions
                  </text>
                  <text x={cx} y={cy + 12} textAnchor="middle" className="svg-empty-sub">
                    No test runs yet
                  </text>
                  <text x={cx} y={cy + 30} textAnchor="middle" className="svg-empty-hint">
                    Run tests to populate
                  </text>
                </g>
              ) : isSingleSlice ? (
                /* Single slice full circle / ring (100%) */
                <g
                  className="pie-single-slice"
                  onMouseEnter={() => setHoveredSlice(activeItems[0].id)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  onClick={() => onSelectStatus && onSelectStatus(activeItems[0].id)}
                  style={{ cursor: "pointer" }}
                >
                  {chartMode === "donut" ? (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={(rOuter + rInner) / 2}
                      fill="none"
                      stroke={activeItems[0].color}
                      strokeWidth={rOuter - rInner}
                      filter="url(#pie-glow)"
                      className="slice-path"
                    />
                  ) : (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={rOuter}
                      fill={activeItems[0].color}
                      filter="url(#pie-glow)"
                      className="slice-path"
                    />
                  )}
                  {chartMode === "pie" && (
                    <text
                      x={cx}
                      y={cy + 6}
                      textAnchor="middle"
                      className="pie-slice-label-single"
                    >
                      100%
                    </text>
                  )}
                </g>
              ) : (
                /* Multi-slice pie / donut segments */
                <g className="pie-slices-group">
                  {slices.map((slice) => {
                    const isHovered = hoveredSlice === slice.id;
                    return (
                      <g
                        key={slice.id}
                        transform={`translate(${slice.popX}, ${slice.popY})`}
                        style={{
                          transition: "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
                          cursor: "pointer"
                        }}
                        onMouseEnter={() => setHoveredSlice(slice.id)}
                        onMouseLeave={() => setHoveredSlice(null)}
                        onClick={() => onSelectStatus && onSelectStatus(slice.id)}
                      >
                        <path
                          d={slice.path}
                          fill={isHovered ? slice.hoverColor : slice.color}
                          filter={isHovered ? "url(#slice-active-glow)" : "url(#pie-glow)"}
                          className="slice-path"
                        />
                        {/* Slice percentage label if slice is wide enough */}
                        {slice.sliceAngle > 22 && (
                          <text
                            x={slice.labelPos.x}
                            y={slice.labelPos.y + 4}
                            textAnchor="middle"
                            className="pie-slice-label"
                          >
                            {Math.round(slice.percentage)}%
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Center Donut Hole content */}
              {chartMode === "donut" && total > 0 && (
                <g className="donut-center-group">
                  <circle cx={cx} cy={cy} r={rInner - 2} fill="#ffffff" />
                  {activeHoverCategory ? (
                    <>
                      <text x={cx} y={cy - 16} textAnchor="middle" className="donut-hover-label" fill={activeHoverCategory.color}>
                        {activeHoverCategory.shortLabel}
                      </text>
                      <text x={cx} y={cy + 10} textAnchor="middle" className="donut-center-metric">
                        {activeHoverCategory.value}
                      </text>
                      <text x={cx} y={cy + 28} textAnchor="middle" className="donut-center-sub">
                        {total > 0 ? `${((activeHoverCategory.value / total) * 100).toFixed(1)}%` : "0%"}
                      </text>
                    </>
                  ) : (
                    <>
                      <text x={cx} y={cy - 16} textAnchor="middle" className="donut-center-label">
                        PASS RATE
                      </text>
                      <text x={cx} y={cy + 10} textAnchor="middle" className="donut-center-metric">
                        {passRate}%
                      </text>
                      <text x={cx} y={cy + 28} textAnchor="middle" className="donut-center-sub">
                        {total} Executed
                      </text>
                    </>
                  )}
                </g>
              )}
            </svg>
          </div>

          {/* Interactive Tooltip Card underneath chart */}
          <div className="chart-tooltip-panel">
            {activeHoverCategory ? (
              <div className="tooltip-active-card" style={{ borderColor: activeHoverCategory.color }}>
                <span className="tooltip-dot" style={{ backgroundColor: activeHoverCategory.color }}></span>
                <div className="tooltip-meta">
                  <span className="tooltip-title">{activeHoverCategory.label}</span>
                  <span className="tooltip-desc">{activeHoverCategory.desc}</span>
                </div>
                <div className="tooltip-numbers">
                  <span className="tooltip-val">{activeHoverCategory.value}</span>
                  <span className="tooltip-pct">
                    {total > 0 ? `${((activeHoverCategory.value / total) * 100).toFixed(1)}%` : "0%"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="tooltip-hint-card">
                <span>💡 Hover any slice to inspect execution statistics, or click to filter test list</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Detailed Execution Breakdown & Legend */}
        <div className="chart-legend-pane">
          <div className="legend-list-header">
            <h4>Execution Breakdown ({total} Total Runs)</h4>
            <span className="legend-rate-badge">Pass Rate: {passRate}%</span>
          </div>

          <div className="legend-items-list">
            {categories.map((cat) => {
              const catCount = cat.value;
              const catPct = total > 0 ? ((catCount / total) * 100).toFixed(1) : "0.0";
              const isHovered = hoveredSlice === cat.id;

              return (
                <div
                  key={cat.id}
                  className={`legend-row ${isHovered ? "legend-row-hover" : ""}`}
                  onMouseEnter={() => setHoveredSlice(cat.id)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  onClick={() => onSelectStatus && onSelectStatus(cat.id)}
                >
                  <div className="legend-left-col">
                    <span className="legend-status-bullet" style={{ backgroundColor: cat.color }}>
                      {cat.icon}
                    </span>
                    <div className="legend-labels">
                      <span className="legend-row-title">{cat.label}</span>
                      <span className="legend-row-desc">{cat.desc}</span>
                    </div>
                  </div>

                  <div className="legend-right-col">
                    <div className="legend-values">
                      <span className="legend-count">{catCount}</span>
                      <span className="legend-pct-text">({catPct}%)</span>
                    </div>

                    <div className="legend-mini-bar-track">
                      <div
                        className="legend-mini-bar-fill"
                        style={{
                          width: `${catPct}%`,
                          backgroundColor: cat.color
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mathematical Compliance Banner */}
          <div className="compliance-banner">
            <div className="compliance-header">
              <span className="compliance-icon">📐</span>
              <strong>Pass Rate Calculation Rule:</strong>
            </div>
            <div className="compliance-formula">
              Pass Rate = <span className="formula-highlight">{passed} Passed</span> ÷ <span className="formula-highlight">{total} Total Executions</span> = <span className="formula-result">{passRate}%</span>
              {total > 0 && <span className="formula-exact"> ({passRateExact}%)</span>}
            </div>
            <p className="compliance-notes">
              • <strong>Skipped ({skipped})</strong> and <strong>Blocked ({blocked})</strong> tests count toward total executions (the denominator) but are <strong>not counted as passed</strong>.
              <br />
              • Zero test runs are safely handled with <strong>0% pass rate</strong> (zero-division guarded).
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
