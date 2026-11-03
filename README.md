# Chronos — Intelligent Event and Task Scheduling System

<div align="center">

![Chronos Banner](assets/screenshots/00_landing_page.png)

> **A production-grade, full-stack productivity and scheduling platform that combines calendar events, task prerequisites, and intelligent daily focus planning — powered by three core syllabus algorithms (Merge Sort, Graph Traversal, and Dynamic Programming) and a normalized PostgreSQL 18 relational database.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Vitest-30%2F30%20Passing-brightgreen?logo=vitest&logoColor=white)](#testing--verification)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## Table of Contents
- [1. Overview & Problem Statement](#1-overview--problem-statement)
- [2. How DSA Powers Chronos](#2-how-dsa-powers-chronos)
- [3. Application Features & UI Walkthrough](#3-application-features--ui-walkthrough)
- [4. System Architecture](#4-system-architecture)
- [5. Database Design & Relational Schema](#5-database-design--relational-schema)
- [6. Project Directory Structure](#6-project-directory-structure)
- [7. Setup & Installation Guide](#7-setup--installation-guide)
- [8. Testing & Verification](#8-testing--verification)
- [9. Technical Documentation Directory](#9-technical-documentation-directory)
- [10. Limitations & Future Scope](#10-limitations--future-scope)
- [11. Author & Academic Context](#11-author--academic-context)

---

## 1. Overview & Problem Statement

### 1.1 Problem Statement
Modern professionals and students juggle scattered commitments across disparate tools: calendar events, asynchronous backlogs, interdependent project deliverables, and fleeting daily focus windows. Conventional todo list apps treat tasks as isolated, unweighted checklist items without understanding:
1. **Deadlock Vulnerability**: Cycles in prerequisite relationships ($A \to B \to A$) cause organizational deadlocks.
2. **Suboptimal Daily Time Allocation**: Users have fixed focus windows (e.g. 2 hours), but pick tasks arbitrarily rather than optimizing for deadline urgency and priority within that capacity.
3. **Timeline Instability**: Calendar feeds lack deterministic tie-breaking, causing concurrent events to shift unpredictably across reloads.

### 1.2 The Chronos Solution
Chronos addresses these challenges as a practical, production-grade productivity SaaS. Rather than serving as an academic toy or algorithm visualizer, **classical Data Structures and Algorithms quietly power real backend scheduling decisions**:
- Stable **Merge Sort** orders the unified event timeline and priority backlogs.
- **Graph Traversal (DFS & BFS)** rejects circular prerequisites and calculates downstream readiness cascades when tasks complete.
- **0/1 Knapsack Dynamic Programming** powers the *"Plan My Day"* feature, maximizing output under bounded focus hours.

---

## 2. How DSA Powers Chronos

Chronos deeply integrates **three primary algorithms** from the computer science engineering syllabus into its production backend service:

```mermaid
flowchart LR
    subgraph S1 ["1. Merge Sort (Unit I, Ch 1.2)"]
        direction TB
        M1["Calendar Event Feeds"]
        M2["Task Backlog Ordering"]
        M3["Execution Plan Tie-Breaking"]
    end

    subgraph S2 ["2. Graph Traversal: BFS & DFS (Unit III, Ch 3.1)"]
        direction TB
        G1["DFS: 3-Color Cycle Prevention"]
        G2["BFS: Downstream Readiness Cascades"]
        G3["Kahn's Topo Tiers"]
    end

    subgraph S3 ["3. 0/1 Knapsack DP (Unit III, Ch 3.3)"]
        direction TB
        K1["Capacity W: User Focus Window"]
        K2["Weight w: Task Duration"]
        K3["Value v: Priority + Urgency"]
    end

    S1 --> RealWorld["Real Business Logic\nInside Express & PostgreSQL"]
    S2 --> RealWorld
    S3 --> RealWorld
```

### 2.1 Algorithm to Feature Mapping

| Syllabus Topic | Algorithm | Source File | Invoking Service / Route | Product Feature | Complexity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Unit I, Ch 1.2** | **Merge Sort** | [`server/src/dsa/MergeSort.ts`](server/src/dsa/MergeSort.ts) | `calendarController.ts`, `taskController.ts` | Calendar Timeline & Priority Backlog Ordering | $\mathcal{O}(n \log n)$ time<br>$\mathcal{O}(n)$ space |
| **Unit III, Ch 3.1** | **Graph Traversal (BFS & DFS)** | [`server/src/dsa/DependencyGraph.ts`](server/src/dsa/DependencyGraph.ts) | `taskController.ts`, `schedulerController.ts` | Prerequisite Loop Rejection & Downstream Unlocking | $\mathcal{O}(V + E)$ time<br>$\mathcal{O}(V + E)$ space |
| **Unit III, Ch 3.3** | **0/1 Knapsack (DP)** | [`server/src/dsa/KnapsackDP.ts`](server/src/dsa/KnapsackDP.ts) | `schedulerController.ts` (`/plan-my-day`) | "Plan My Day" Focus Planner | $\mathcal{O}(n \cdot W)$ time<br>$\mathcal{O}(n \cdot W)$ space |

---

### A. Merge Sort — Unit I, Chapter 1.2 (Sorting Techniques)
- **Product Use**: Stable ordering of unified calendar events and task backlogs.
- **Why It Matters in Chronos**:
  - A user’s calendar feed merges standalone meetings with deadline milestones. When multiple events share the exact same start time, standard unstable sorting can arbitrarily swap items between refreshes.
  - Chronos implements a generic, divide-and-conquer **Merge Sort** with stable multi-key comparators:
    1. Primary key: `startTime ASC`
    2. Secondary tie-breaker: `endTime ASC`
    3. Tertiary tie-breaker: `title ASC`
- **Complexity**:
  - **Time**: $\mathcal{O}(n \log n)$ (Best, Average, and Worst case guaranteed via Master Theorem).
  - **Auxiliary Space**: $\mathcal{O}(n)$ for buffer arrays during merge.
- **Implementation**: [`server/src/dsa/MergeSort.ts`](server/src/dsa/MergeSort.ts)
- **Detailed Documentation**: See [docs/ALGORITHMS.md](docs/ALGORITHMS.md#1-merge-sort).

---

### B. BFS and DFS — Unit III, Chapter 3.1 (Graph Traversal)
- **Product Use**: Task dependency modeling, deadlock cycle prevention, and completion readiness cascades.
- **Why It Matters in Chronos**:
  - Tasks are represented as vertices ($V$) and prerequisite requirements as directed edges ($E$).
  - **Depth-First Search (DFS)**: Before committing a dependency to PostgreSQL (`POST /api/tasks/:id/dependencies`), DFS explores the candidate graph using 3-color vertex marking (`WHITE = 0`, `GRAY = 1`, `BLACK = 2`). If a directed edge leads to a `GRAY` node (active recursion call stack), a back-edge is detected $\to$ Chronos **rejects circular dependencies** ($A \to B \to A$) and returns the exact cycle path.
  - **Breadth-First Search (BFS)**: When a user completes a prerequisite task, BFS traverses downstream dependents layer-by-layer (`traverseDownstreamBfs`). It evaluates whether remaining unmet prerequisites reach zero, instantly unlocking newly ready tasks in the UI.
- **Complexity**:
  - **Time**: $\mathcal{O}(V + E)$ for both DFS cycle check and BFS downstream traversal.
  - **Space**: $\mathcal{O}(V + E)$ for adjacency list storage; $\mathcal{O}(V)$ auxiliary traversal queue and recursion depth.
- **Implementation**: [`server/src/dsa/DependencyGraph.ts`](server/src/dsa/DependencyGraph.ts)
- **Detailed Documentation**: See [docs/ALGORITHMS.md](docs/ALGORITHMS.md#2-graph-traversal-bfs--dfs).

---

### C. 0/1 Knapsack Dynamic Programming — Unit III, Chapter 3.3 (Dynamic Programming)
- **Product Use**: Powering the **"Plan My Day"** optimal focus planner.
- **Why It Matters in Chronos**:
  - When a user inputs their available focus time $W$ (e.g. 60, 120, 180 minutes), Chronos filters candidate tasks to include **only ready tasks** (0 unmet prerequisites).
  - **Mapping to 0/1 Knapsack**:
    - **Knapsack Capacity ($W$)**: Available focus time in minutes.
    - **Item Weight ($w_i$)**: Estimated task duration in minutes.
    - **Item Value ($v_i$)**: Deterministic score derived from user priority (`URGENT = 100`, `HIGH = 60`, `MEDIUM = 30`, `LOW = 10`) plus proximity bonuses for approaching deadlines.
  - **DP Recurrence**:
    $$dp[i][w] = \begin{cases} 
    dp[i-1][w] & \text{if } w_i > w \\ 
    \max\Big(dp[i-1][w],\; dp[i-1][w - w_i] + v_i\Big) & \text{if } w_i \le w 
    \end{cases}$$
  - The backend builds the 2D table, backtracks the selected task subset, and uses Merge Sort to arrange the day's tasks in optimal execution sequence.
- **Complexity**:
  - **Time**: $\mathcal{O}(n \cdot W)$ pseudo-polynomial time.
  - **Auxiliary Space**: $\mathcal{O}(n \cdot W)$ for the subproblem state table.
- **Implementation**: [`server/src/dsa/KnapsackDP.ts`](server/src/dsa/KnapsackDP.ts)
- **Detailed Documentation**: See [docs/ALGORITHMS.md](docs/ALGORITHMS.md#3-01-knapsack-with-dynamic-programming).

---

## 3. Application Features & UI Walkthrough

| Screen | Description | Genuine Application Screenshot |
| :--- | :--- | :--- |
| **Public Landing Experience** | Introduces Chronos principles with a physics-based **Polaroid Line Carousel** (EXACT PROMPT 2) featuring spring damping and rotation. | ![Landing Page](assets/screenshots/00_landing_page.png) |
| **Workspace Sign In** | Quick-fill demo account (`alex@chronos.io`) with JWT token issuance and password hashing. | ![Sign In](assets/screenshots/01_signin_page.png) |
| **Executive Dashboard** | Features the **Activity Heatmap** contribution matrix (EXACT PROMPT 1), Recommended Next Task, and summary statistics. | ![Dashboard](assets/screenshots/02_dashboard_overview.png) |
| **Plan My Day Focus Modal** | 0/1 Knapsack optimization modal with presets (30m, 1h, 2h, 4h) selecting optimal ready tasks. | ![Plan My Day](assets/screenshots/06_plan_my_day_modal.png) |
| **Calendar & Interval View** | Merge-Sorted timeline of events and milestones, with real-time overlap collision warnings. | ![Calendar](assets/screenshots/03_calendar_feed.png) |
| **Tasks & Kanban Pipeline** | Multi-view backlog (Kanban Board, List View, and Dependency Planner) with task status transitions. | ![Tasks Board](assets/screenshots/04_tasks_kanban.png) |
| **Dependency Planner Canvas** | Interactive DAG workspace featuring draggable nodes, live prerequisite handles, and cycle validation. | ![Dependency Planner](assets/screenshots/05_dependency_planner.png) |

---

## 4. System Architecture

Chronos follows a decoupled three-tier architecture ensuring separation of concerns:

```mermaid
flowchart TD
    subgraph Client ["Frontend (React 18 + Vite + Tailwind CSS)"]
        UI_Land["Landing Page (Polaroid Carousel)"]
        UI_Dash["Dashboard (Activity Heatmap)"]
        UI_Plan["Plan My Day Modal (0/1 Knapsack UI)"]
        UI_DAG["Dependency Planner (DAG Canvas)"]
        API_Client["API Client (src/lib/api.ts)"]
    end

    subgraph Server ["Backend API Service (Express + TypeScript)"]
        AuthMiddleware["JWT Authentication & Ownership Gate"]
        Router["Express API Router (/api)"]
        
        subgraph Services ["Application Services & DSA Engine"]
            TaskSvc["Task Service (BFS Cascades)"]
            CalSvc["Calendar Service (Merge Sort)"]
            SchedSvc["Scheduler Service (0/1 Knapsack DP)"]
            CycleSvc["Dependency Validator (DFS Cycle Check)"]
        end

        ReminderWorker["Reminder Background Worker (Cron Daemon)"]
    end

    subgraph Database ["Persistence Layer (PostgreSQL 18 + Prisma ORM)"]
        Postgres["PostgreSQL 18 Database Engine"]
        Schema["3NF Relational Tables (Tasks, Events, Dependencies, Users)"]
    end

    Client -->|REST API over HTTP| AuthMiddleware
    AuthMiddleware --> Router
    Router --> Services
    Services -->|Prisma Client| Postgres
    ReminderWorker -->|Atomic Transactions| Postgres
```

For complete architectural details, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 5. Database Design & Relational Schema

Chronos uses **PostgreSQL 18** configured with strict referential integrity in **Third Normal Form (3NF)**:

```mermaid
erDiagram
    User ||--o{ Task : owns
    User ||--o{ Event : owns
    User ||--o{ Category : defines
    User ||--o{ Notification : receives
    Category ||--o{ Task : classifies
    Category ||--o{ Event : classifies
    Task ||--o{ TaskDependency : "is dependent"
    Task ||--o{ TaskDependency : "is prerequisite"
    Task ||--o{ Reminder : triggers
    Event ||--o{ Reminder : triggers

    User {
        uuid id PK
        string email UK
        string passwordHash
        string name
        string timezone
    }

    Task {
        uuid id PK
        uuid userId FK
        uuid categoryId FK
        string title
        string status "TODO | IN_PROGRESS | COMPLETED"
        string priority "LOW | MEDIUM | HIGH | URGENT"
        datetime dueDate
        int estimatedMinutes
        datetime completedAt
    }

    TaskDependency {
        uuid id PK
        uuid taskId FK
        uuid dependsOnTaskId FK
    }

    Event {
        uuid id PK
        uuid userId FK
        string title
        datetime startTime
        datetime endTime
    }

    Reminder {
        uuid id PK
        uuid taskId FK
        datetime remindAt
        string status
        string idempotencyKey UK
    }
```

- **Composite Constraints**: `TaskDependency` enforces `@@unique([taskId, dependsOnTaskId])` to avoid duplicate graph edges.
- **Query Optimization**: Slices the Activity Heatmap via `@@index([userId, status, completedAt])` achieving sub-millisecond execution (`< 0.25 ms` verified with `EXPLAIN ANALYZE`).
- **Complete Schema Reference**: See [docs/DATABASE.md](docs/DATABASE.md).

---

## 6. Project Directory Structure

```
chronos-event-task-scheduler/
│
├── README.md                      # Primary project overview & documentation
├── LICENSE                        # MIT License
├── .gitignore                     # Git hygiene & secret exclusion
├── .env.example                   # Environment configuration template
├── package.json                   # Root workspace orchestration
│
├── client/                        # Frontend Application (React 18 + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/            # AppShell, Topbar, QuickCreateModal
│   │   │   ├── planner/           # DependencyPlanner, PlanMyDayModal
│   │   │   └── ui/                # ActivityHeatmap, PolaroidLineCarousel
│   │   ├── pages/                 # Dashboard, Calendar, Tasks, Landing
│   │   └── lib/                   # API client, auth context, utilities
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── server/                        # Backend API Service (Node.js + Express)
│   ├── src/
│   │   ├── dsa/                   # Core Algorithm Modules
│   │   │   ├── MergeSort.ts       # Stable Merge Sort (Unit I, Ch 1.2)
│   │   │   ├── DependencyGraph.ts # DFS Cycle Check & BFS Cascades (Unit III, Ch 3.1)
│   │   │   └── KnapsackDP.ts      # 0/1 Knapsack Focus Planner (Unit III, Ch 3.3)
│   │   ├── controllers/           # Task, Calendar, Scheduler, Auth Controllers
│   │   ├── routes/                # Modular Express API Routes
│   │   ├── services/              # Scheduler, Task, and Calendar Business Logic
│   │   ├── middleware/            # JWT Auth, CORS, Central Error Handler
│   │   └── tests/                 # Vitest Automated Test Suites
│   │       ├── dsa.test.ts        # 17 Algorithmic Unit Tests
│   │       └── api.test.ts        # 13 Integration API Tests
│   ├── prisma/
│   │   ├── schema.prisma          # PostgreSQL 3NF Data Schema
│   │   └── seed.ts                # Realistic Seed Data (150+ tasks, DAG)
│   └── package.json
│
├── docs/                          # Detailed Technical Documentation
│   ├── ALGORITHMS.md              # DSA Syllabus Formulations & Pseudocode
│   ├── ARCHITECTURE.md            # Three-Tier Architecture & Request Lifecycle
│   ├── DATABASE.md                # PostgreSQL 18 Schema & Index Benchmarks
│   └── API.md                     # RESTful Endpoint Specifications
│
└── assets/
    └── screenshots/               # Authentic Captured UI Walkthrough Images
```

---

## 7. Setup & Installation Guide

### 7.1 Prerequisites
- **Node.js**: v18.0.0 or higher (Tested on Node.js v24.13.1 LTS)
- **npm**: v9.0.0 or higher
- **PostgreSQL**: v14+ (Configured on port `5433` or standard `5432`)

### 7.2 Clone & Configure Environment
```bash
git clone https://github.com/guptahari4787-spec/chronos-event-task-scheduler.git
cd chronos-event-task-scheduler

# Create server environment file
cp server/.env.example server/.env
```

Ensure `server/.env` contains your PostgreSQL connection string:
```dotenv
HOST=127.0.0.1
PORT=2345
FRONTEND_ORIGIN=http://chronos.localhost:3456
DATABASE_URL=postgresql://postgres:password@127.0.0.1:5433/chronos?schema=public
JWT_SECRET=your_secure_jwt_secret_key_minimum_32_characters
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

### 7.3 Install Dependencies
```bash
# Install root, backend, and frontend dependencies
npm.cmd install
npm.cmd --prefix server install
npm.cmd --prefix client install
```

### 7.4 Database Migration & Seeding
```bash
# Push Prisma schema to PostgreSQL
npm.cmd --prefix server run db:push

# Seed database with realistic DAG tasks, calendar events, and activity records
npm.cmd --prefix server run db:seed
```

### 7.5 Run Development Servers
```bash
# Terminal 1: Start Backend API (Port 2345)
npm.cmd --prefix server run dev

# Terminal 2: Start Frontend Application (Port 3456)
npm.cmd --prefix client run dev
```

### 7.6 Local Development URLs
- **Frontend App**: `http://chronos.localhost:3456` (or `http://127.0.0.1:3456`)
- **Backend API**: `http://api.chronos.localhost:2345` (or `http://127.0.0.1:2345`)
- **API Health Check**: `http://api.chronos.localhost:2345/api/health`
- **Demo Account**: `alex@chronos.io` / `Password123!`

---

## 8. Testing & Verification

Chronos maintains an automated test suite verifying both pure DSA logic and end-to-end API workflows:

```bash
# Run Vitest test suite
npm.cmd --prefix server run test
```

### Test Suite Results: 30 / 30 Tests Passing (100% Success Rate)
```
 ✓ src/tests/dsa.test.ts (17 tests)
   - MergeSort: Numeric ascending, strings, custom objects, duplicate keys, single element, empty, reverse-sorted
   - Graph Traversal (DFS & BFS): Empty graph, valid DAG topological order, 2-node cycle detection, 3-node cycle detection, topological tiers, downstream cascade readiness
   - 0/1 Knapsack DP: Empty candidates, tasks exceeding capacity, exact fit, optimal subset choice under capacity, priority ordering

 ✓ src/tests/api.test.ts (13 tests)
   - Health check (/api/health returns ok and healthy PostgreSQL 18)
   - Authentication & Authorization (registration, token issuance, invalid credential rejection)
   - Task operations & ownership isolation (User 1 vs User 2 data isolation)
   - Dependency cycle prevention (circular link returns 400 CycleError)
   - Calendar interval collision detection
   - Activity Heatmap continuous 90-day zero-fill mapping
   - Plan My Day 0/1 Knapsack DP API verification
   - Calendar ordering via Merge Sort verification
   - Downstream cascade impact via BFS traversal verification

 Test Files  2 passed (2)
      Tests  30 passed (30)
```

### Production Build Verification
```bash
# Verify TypeScript compile & production builds
npm.cmd --prefix server run build   # tsc (0 errors)
npm.cmd --prefix client run build   # tsc && vite build (0 errors)
```

---

## 9. Technical Documentation Directory

For comprehensive technical viva and architecture inspection:
- 📘 [**Algorithm Technical Formulations (docs/ALGORITHMS.md)**](docs/ALGORITHMS.md): Syllabus mappings, pseudocode, recurrence relations, and step-by-step traces.
- 🏛️ [**System Architecture (docs/ARCHITECTURE.md)**](docs/ARCHITECTURE.md): Component diagrams, three-tier request lifecycles, and security models.
- 🗄️ [**Database & Schema Specification (docs/DATABASE.md)**](docs/DATABASE.md): Complete data dictionary, 3NF normalization proofs, composite indexes, and `EXPLAIN ANALYZE` benchmarks.
- 🔌 [**REST API Documentation (docs/API.md)**](docs/API.md): Request/response payloads, authentication headers, and error codes.

---

## 10. Limitations & Future Scope

### Current Limitations
- **Single-User Workspace Isolation**: Tasks and events are owned by an individual user without shared team spaces.
- **Fixed Knapsack Time Range**: The focus window is bounded to a maximum of 12 hours (720 minutes) per planning session.

### Future Enhancements
- **Multi-Tenant Collaboration**: Shared task boards with fine-grained team permission roles.
- **Predictive Duration Modeling**: Machine learning estimations for actual task completion times based on historical Activity Heatmap completion velocity.
- **Mobile Client**: Native iOS and Android application built with React Native utilizing the existing RESTful API.

---

## 11. Author & Academic Context

- **Author**: Hariom Gupta
- **GitHub**: [@guptahari4787-spec](https://github.com/guptahari4787-spec)
- **Course**: B.Tech / B.E. in Computer Science & Engineering
- **Curriculum Reference**: Core Data Structures & Algorithms, Relational Database Management Systems (PostgreSQL).
