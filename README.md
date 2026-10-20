# 🎯 TestTrack — Enterprise QA Test Management & Execution Hub

[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express_5-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

**TestTrack** is a modern, responsive, enterprise-grade Quality Assurance (QA) test management platform designed for engineering and QA teams to author, organize, execute, and analyze test scenarios with live real-time statistics and interactive visual analytics.

---

## 🌟 Key Features

### 1. 📋 Test Scenario Management (Full CRUD)
- **Author Scenarios**: Document test title, objective/description, ordered execution steps (line-by-line), and expected results.
- **Priority & Status Categorization**:
  - **Priorities**: High, Medium, Low
  - **Statuses**: Draft, Active, Not Run, Passed, Failed, Blocked, Skipped
- **Live Search & Multi-Criteria Filtering**: Filter dynamically by keyword, priority, or status tabs with live badge counters.
- **Dual View Modes**: Switch seamlessly between modern **🎴 Card Stream View** and structured **📑 Enterprise Table View**.

### 2. ⚡ 1-Click Quick Execution Runners
Execute and update test run statuses instantly directly from either the card stream or table rows:
- `✓ Pass` — Mark verification as stable & passed
- `✕ Fail` — Flag defects/bugs requiring triage
- `⊘ Block` — Mark scenarios blocked by dependencies or environment issues
- `⏭ Skip` — Record omitted runs

### 3. 📊 Test Run Statistics & Live Database Calculations
All statistics are computed directly from actual **MongoDB** database records via the backend `/api/testcases/stats` endpoint:
- **Total Test Executions**: Sum of all executed tests (`passed + failed + blocked + skipped`)
- **Passed Executions**: Count of successfully passed tests
- **Failed Executions**: Count of failed test scenarios
- **Blocked Executions**: Count of tests blocked by blockers
- **Skipped Executions**: Count of omitted test cases
- **Pass Rate Percentage**:
  $$\text{Pass Rate} = \frac{\text{Passed Executions}}{\text{All Executions}} \times 100\%$$
- **Mathematical Compliance**:
  - **Skipped** and **Blocked** tests are strictly excluded from passed tests.
  - Zero test runs are gracefully handled with **0% pass rate** (guarded against division-by-zero errors).

### 4. 🥧 Interactive SVG Pie & Donut Chart
- **Dynamic Vector Rendering**: Pure SVG geometry calculated from database execution records.
- **Toggle View Styles**:
  - **🍩 Donut View**: Displays center execution pass rate and total executed count.
  - **🥧 Solid Pie View**: Classic full-slice pie visualization.
- **Micro-Animations & Interactions**: Slices subtly expand and glow upon hovering.
- **Interactive Tooltips**: Inspect exact counts and percentages for each slice.
- **Interactive Legend**: Displays color-coded badges, counts, percentages, and mini progress bars; click any item to filter the test scenario list.
- **Database Records Badge**: Visual sync status indicator with a **↻ Query DB** button for on-demand database refresh.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | React 19, Vite 8 | Ultra-fast client application with React Hooks |
| **Styling** | Vanilla CSS3 | Custom enterprise design system with gradients, glassmorphism, and micro-animations |
| **Visuals** | Pure React SVG | Zero-dependency, lightweight interactive Pie & Donut Chart |
| **Backend** | Node.js, Express 5 | RESTful API with route controllers and validation |
| **Database** | MongoDB, Mongoose 9 | Document database storing test cases and execution metadata |

---

## 📂 Project Structure

```text
TestTrack/
├── .gitignore                     # Git ignore rules (node_modules, .env, dist)
├── README.md                      # Project documentation
├── backend/
│   ├── .env                       # Environment variables (local, gitignored)
│   ├── .env.example               # Template environment configuration
│   ├── models/
│   │   └── TestCase.js            # Mongoose schema for test scenarios
│   ├── package.json               # Backend dependencies (express, mongoose, cors, dotenv)
│   └── server.js                  # Express API server & database aggregation endpoints
└── frontend/
    ├── public/                    # Static assets
    ├── src/
    │   ├── components/
    │   │   └── ExecutionPieChart.jsx # Interactive SVG Pie/Donut Chart component
    │   ├── App.jsx                # Main application UI, state & execution handlers
    │   ├── App.css                # Enterprise design system & responsive styling
    │   ├── index.css              # Typography & global base styles
    │   └── main.jsx               # Application entry point
    ├── index.html                 # HTML shell
    ├── vite.config.js             # Vite build configuration
    └── package.json               # Frontend dependencies (react, react-dom, vite)
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) installed and running locally on `mongodb://127.0.0.1:27017` (or a remote MongoDB Atlas URI)
- [Git](https://git-scm.com/)

---

### 1. Clone the Repository
```bash
git clone https://github.com/shaniRN8/TestTrack.git
cd TestTrack
```

---

### 2. Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the environment:
   Create a `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *Verify your MongoDB URI:*
   ```env
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/testtrack
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The server runs at `http://localhost:5000`.*

---

### 3. Frontend Setup
1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The application will be available at `http://localhost:5173`.*

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/testcases` | Retrieve all test scenarios (sorted newest first) |
| `POST` | `/api/testcases` | Create a new test case |
| `GET` | `/api/testcases/:id` | Retrieve single test case by MongoDB ID |
| `PUT` | `/api/testcases/:id` | Update test case fields or execution status |
| `DELETE` | `/api/testcases/:id` | Delete a test case |
| `GET` | `/api/testcases/stats` | Compute live execution statistics & pass rate from database |

### Sample Response (`GET /api/testcases/stats`):
```json
{
  "success": true,
  "data": {
    "total": 5,
    "totalExecutions": 4,
    "executed": 4,
    "passed": 2,
    "failed": 1,
    "blocked": 1,
    "skipped": 0,
    "active": 0,
    "draft": 0,
    "notRun": 1,
    "highPriority": 3,
    "passRate": 50,
    "passRateExact": 50
  }
}
```

---

## 🧪 Testing & Validation
- **Frontend Production Build**:
  ```bash
  cd frontend
  npm run build
  ```
- **Code Linter**:
  ```bash
  cd frontend
  npm run lint
  ```

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
