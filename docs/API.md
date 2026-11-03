# Chronos — RESTful API Specification

- **Base URL**: `http://api.chronos.localhost:2345/api` (Local loopback default)
- **Content-Type**: `application/json`
- **Authentication**: `Authorization: Bearer <jwt_token>` (for all protected routes)

---

## 1. Authentication Endpoints

### 1.1 User Registration
- **Route**: `POST /api/auth/register`
- **Protected**: No
- **Request Body**:
  ```json
  {
    "name": "Alex Mercer",
    "email": "alex@chronos.io",
    "password": "Password123!"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "bdca6283-51ab-4d70-af64-dd52f6387824",
      "email": "alex@chronos.io",
      "name": "Alex Mercer",
      "timezone": "UTC"
    }
  }
  ```

### 1.2 User Login
- **Route**: `POST /api/auth/login`
- **Protected**: No
- **Request Body**:
  ```json
  {
    "email": "alex@chronos.io",
    "password": "Password123!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "bdca6283-51ab-4d70-af64-dd52f6387824",
      "email": "alex@chronos.io",
      "name": "Alex Mercer"
    }
  }
  ```

### 1.3 Current User Profile
- **Route**: `GET /api/auth/me`
- **Protected**: Yes
- **Response (200 OK)**: Returns authenticated user object.

---

## 2. Health Check Endpoint

### 2.1 Health Status
- **Route**: `GET /api/health`
- **Protected**: No
- **Response (200 OK)**:
  ```json
  {
    "status": "ok",
    "service": "chronos-backend-api",
    "timestamp": "2026-11-03T06:25:23.570Z",
    "uptime": 22.75,
    "dependencies": {
      "database": {
        "status": "healthy"
      }
    },
    "host": "127.0.0.1",
    "port": 2345
  }
  ```

---

## 3. Tasks & Dependency Management

### 3.1 List Tasks
- **Route**: `GET /api/tasks`
- **Protected**: Yes
- **Query Parameters**:
  - `status` (`TODO`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`)
  - `priority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`)
  - `categoryId` (UUID)
  - `search` (string)
- **Response (200 OK)**:
  ```json
  {
    "tasks": [
      {
        "id": "1dfb3c5d-3a2f-4668-8687-fcdd898bfea7",
        "title": "Audit UI Accessibility & Dark Mode Contrast",
        "status": "TODO",
        "priority": "MEDIUM",
        "estimatedMinutes": 45,
        "dueDate": "2026-11-04T12:00:00.000Z",
        "dependencies": [],
        "dependentOn": []
      }
    ],
    "total": 1
  }
  ```
  *(Sorted via `MergeSort` on priority, due date, and creation time)*

### 3.2 Create Task
- **Route**: `POST /api/tasks`
- **Protected**: Yes
- **Request Body**:
  ```json
  {
    "title": "Prepare Project Viva Defense",
    "description": "Prepare architecture diagram and algorithmic proofs",
    "priority": "URGENT",
    "estimatedMinutes": 120,
    "dueDate": "2026-11-05T10:00:00.000Z",
    "categoryId": "optional-category-uuid"
  }
  ```
- **Response (201 Created)**: Returns created task object.

### 3.3 Update Task (Status Transition & BFS Cascade)
- **Route**: `PATCH /api/tasks/:id`
- **Protected**: Yes
- **Request Body**: `{ "status": "COMPLETED" }`
- **Response (200 OK)**:
  ```json
  {
    "task": { "id": "task-uuid", "status": "COMPLETED", ... },
    "downstreamImpact": {
      "affectedTaskIds": ["child-task-uuid"],
      "newlyReadyTaskIds": ["child-task-uuid"],
      "stillBlockedTasks": []
    }
  }
  ```

### 3.4 Add Task Dependency (DFS Cycle Validation)
- **Route**: `POST /api/tasks/:id/dependencies`
- **Protected**: Yes
- **Request Body**:
  ```json
  {
    "dependsOnTaskId": "prerequisite-task-uuid"
  }
  ```
- **Success Response (201 Created)**: Returns created `TaskDependency` record.
- **Cycle Rejection Response (400 Bad Request)**:
  ```json
  {
    "error": "CycleError",
    "message": "Cannot add dependency: this would create a circular dependency loop (Task A -> Task B -> Task A).",
    "cyclePath": ["Task A", "Task B", "Task A"]
  }
  ```

### 3.5 Remove Task Dependency
- **Route**: `DELETE /api/tasks/:taskId/dependencies/:dependencyId`
- **Protected**: Yes
- **Response (200 OK)**: `{ "success": true }`

---

## 4. Scheduler & Algorithmic Operations

### 4.1 Plan My Day (0/1 Knapsack Dynamic Programming)
- **Route**: `POST /api/scheduler/plan-my-day` (also supports `GET /api/scheduler/plan-my-day`)
- **Protected**: Yes
- **Request Body**:
  ```json
  {
    "availableMinutes": 120
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "selectedTasks": [
      {
        "id": "1dfb3c5d-3a2f-4668-8687-fcdd898bfea7",
        "title": "Audit UI Accessibility & Dark Mode Contrast",
        "durationMinutes": 45,
        "priority": "MEDIUM",
        "dueDate": "2026-11-04T12:00:00.000Z",
        "status": "TODO"
      }
    ],
    "totalPlannedMinutes": 45,
    "availableMinutes": 120,
    "remainingMinutes": 75,
    "totalValue": 80,
    "taskCount": 1,
    "summaryReason": "Planned 45 of 120 minutes (75m buffer), focusing on your closest deadlines."
  }
  ```

### 4.2 Scheduler Recommendations
- **Route**: `GET /api/scheduler/recommendations`
- **Protected**: Yes
- **Response (200 OK)**: Returns the single top recommended unblocked task, eligible task count, blocked task count, and execution tiers calculated via Kahn's BFS algorithm.

### 4.3 Task Downstream Impact Evaluation
- **Route**: `GET /api/scheduler/impact/:taskId`
- **Protected**: Yes
- **Response (200 OK)**:
  ```json
  {
    "downstreamImpact": {
      "affectedTaskIds": ["child-id-1"],
      "newlyReadyTaskIds": ["child-id-1"],
      "stillBlockedTasks": []
    }
  }
  ```

---

## 5. Calendar & Interval Collision Detection

### 5.1 Calendar Unified Feed
- **Route**: `GET /api/calendar`
- **Protected**: Yes
- **Query Parameters**: `startDate` (ISO string), `endDate` (ISO string)
- **Response (200 OK)**:
  ```json
  {
    "events": [ ... ],
    "conflicts": [
      {
        "eventA": { "id": "ev-1", "title": "Faculty Project Review" },
        "eventB": { "id": "ev-2", "title": "Client Architecture Walkthrough" },
        "overlapMinutes": 45,
        "description": "\"Faculty Project Review\" overlaps with \"Client Architecture Walkthrough\" by 45 minutes."
      }
    ]
  }
  ```
  *(Ordered stably via `MergeSort.sort`)*

### 5.2 Available Continuous Focus Gaps
- **Route**: `GET /api/calendar/free-slots`
- **Protected**: Yes
- **Query Parameters**: `date` (`YYYY-MM-DD`), `durationMinutes` (default: 30)
- **Response (200 OK)**: Returns continuous free gaps between scheduled commitments during workday hours (09:00 - 18:00).

---

## 6. Analytics & Activity Tracking

### 6.1 Activity Heatmap Data
- **Route**: `GET /api/analytics/activity`
- **Protected**: Yes
- **Query Parameters**: `range` (`90` or `365`)
- **Response (200 OK)**:
  ```json
  {
    "days": [
      { "date": "2026-08-05", "count": 0, "level": 0 },
      { "date": "2026-08-06", "count": 3, "level": 3 }
    ],
    "period": "the last 90 days",
    "total": 147,
    "tasksByDate": {
      "2026-08-06": [ ... ]
    }
  }
  ```
  *(Zero-filled, contiguous date array sorted chronologically)*

### 6.2 Productivity Summary
- **Route**: `GET /api/analytics/summary`
- **Protected**: Yes
- **Response (200 OK)**:
  ```json
  {
    "totalTasks": 161,
    "completedTasks": 156,
    "completionRate": 97,
    "todoTasks": 2,
    "inProgressTasks": 3,
    "overdueTasks": 5
  }
  ```
