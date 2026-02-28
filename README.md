# Secure Task Management System

A full-stack task management application built as a hiring assessment, demonstrating secure RBAC, audit logging, drag-and-drop kanban, and reactive UI design.

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Data Model & ERD](#data-model--erd)
- [RBAC Model](#rbac-model)
- [API Documentation](#api-documentation)
- [Test Suite](#test-suite)
- [Tradeoffs & Decisions](#tradeoffs--decisions)
- [Future Considerations](#future-considerations)

---

## Quick Start

### Prerequisites

- **Node.js 20+** (tested on v20.20.0 via nvm)
- npm 10+

```bash
# Install dependencies
npm install

# Start the API (http://localhost:3000)
npx nx serve api

# Start the Angular dashboard (http://localhost:4200)
npx nx serve dashboard
```

The API auto-seeds on first boot. Use these demo credentials:

| Role   | Email           | Password     | Org scope                     |
|--------|-----------------|--------------|-------------------------------|
| Owner  | owner@acme.com  | Password123! | Acme Corp + Acme East (child) |
| Admin  | admin@acme.com  | Password123! | Acme East only                |
| Viewer | viewer@acme.com | Password123! | Acme East only (read-only)    |

### Run Tests

```bash
# Backend (28 tests)
npx nx test api

# Frontend (49 tests)
npx nx test dashboard

# RBAC lib (7 tests)
npx nx test auth
```

---

## Architecture Overview

```
turbovet/
├── apps/
│   ├── api/                  # NestJS REST API (port 3000)
│   └── dashboard/            # Angular 19 SPA (port 4200)
├── libs/
│   ├── data/                 # Shared interfaces, enums, DTOs
│   └── auth/                 # RBAC guards, decorators (API-side)
├── nx.json                   # NX monorepo config
└── package.json              # Workspace root with npm workspaces
```

### Backend (`apps/api`)

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Framework  | NestJS 11 (modular architecture)        |
| Auth       | passport-jwt + bcrypt (salt rounds=12)  |
| ORM        | TypeORM with `synchronize: true`        |
| Database   | SQLite via `better-sqlite3`             |
| Validation | `class-validator` + global ValidationPipe |
| Security   | Helmet, CORS, JWT (24h expiry)          |
| Audit      | Persistent audit log table + console    |

### Frontend (`apps/dashboard`)

| Layer         | Technology                              |
|---------------|-----------------------------------------|
| Framework     | Angular 19, standalone components       |
| State         | BehaviorSubject + Observables (no NgRx) |
| Styling       | TailwindCSS v4 with dark mode class     |
| Drag-and-drop | Angular CDK DragDrop (kanban columns)   |
| Charts        | Chart.js via ng2-charts (bar chart)     |
| Particles     | tsparticles (animated login background) |
| HTTP          | Functional interceptor (JWT attachment) |

---

## Data Model & ERD

```
┌─────────────────────┐          ┌─────────────────────┐
│     Organization    │          │        Role         │
├─────────────────────┤          ├─────────────────────┤
│ id          UUID PK │◄────┐    │ id          UUID PK │
│ name        string  │    │    │ name        enum    │
│ parentOrgId UUID FK ├────┘    │  Owner/Admin/Viewer │
└──────────┬──────────┘          └──────────┬──────────┘
           │ 1                              │ 1
           │ *                             │ *
┌──────────▼──────────────────────────────▼──────────┐
│                        User                        │
├────────────────────────────────────────────────────┤
│ id           UUID PK                               │
│ email        string  (unique)                      │
│ password     string  (bcrypt hashed)               │
│ firstName    string                                │
│ lastName     string                                │
│ organizationId  UUID FK → Organization             │
│ roleId          UUID FK → Role                     │
└──────────────────────────┬─────────────────────────┘
                           │ 1 createdBy / assignedTo
                           │ *
┌──────────────────────────▼─────────────────────────┐
│                        Task                        │
├────────────────────────────────────────────────────┤
│ id           UUID PK                               │
│ title        string                                │
│ description  text (nullable)                       │
│ status       enum: todo | in-progress | done       │
│ category     enum: Work | Personal | Other         │
│ priority     enum: low | medium | high             │
│ order        integer (sort within status column)   │
│ createdById  UUID FK → User                        │
│ organizationId  UUID FK → Organization             │
│ assignedToId UUID FK → User (nullable)             │
│ createdAt    datetime                              │
│ updatedAt    datetime                              │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│                     AuditLog                       │
├────────────────────────────────────────────────────┤
│ id           UUID PK                               │
│ userId       UUID                                  │
│ userEmail    string                                │
│ action       enum: login | register | view_tasks   │
│                    create_task | update_task        │
│                    delete_task | view_audit_log     │
│ resource     string (Task, Auth, User, AuditLog)   │
│ resourceId   string (nullable)                     │
│ details      json (nullable)                       │
│ ipAddress    string (nullable)                     │
│ createdAt    datetime                              │
└────────────────────────────────────────────────────┘
```

---

## RBAC Model

Access is controlled by two dimensions: **role** and **organization scope**.

### Role Permissions

| Operation           | Owner | Admin | Viewer |
|---------------------|-------|-------|--------|
| View tasks          | ✓     | ✓     | ✓      |
| Create task         | ✓     | ✓     | ✗      |
| Update task         | ✓     | ✓     | ✗      |
| Delete task         | ✓     | ✓     | ✗      |
| View audit log      | ✓     | ✓     | ✗      |
| Drag-and-drop reorder | ✓   | ✓     | ✗      |

### Organization Scope

The system supports a 2-level organization hierarchy:

```
Acme Corp (parent org)   ← Owner of this org sees ALL tasks below
  └── Acme East (child)  ← Admin/Viewer of Acme East see ONLY Acme East tasks
```

**Scope resolution logic** (in `OrganizationsService.getOrgIdScope`):

```typescript
// Owner of a parent org sees own org + all child orgs
if (user.role === Role.Owner && !user.parentOrgId) {
  const children = await repo.find({ where: { parentOrganizationId: user.orgId } });
  return [user.orgId, ...children.map(c => c.id)];
}
// Everyone else sees only their own org
return [user.orgId];
```

Every task query and mutation checks this scope — a user from a child org cannot read or modify tasks from the parent org.

### Guards Applied

```typescript
// tasks.controller.ts
@Controller('tasks')
@UseGuards(JwtAuthGuard)          // All endpoints require valid JWT
export class TasksController {

  @Get()
  findAll() { ... }               // Any authenticated user (scope filtered in service)

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.Owner, Role.Admin)  // Viewer blocked at guard level
  create() { ... }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.Owner, Role.Admin)
  update() { ... }                // + ForbiddenException if task outside org scope

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.Owner, Role.Admin)
  remove() { ... }                // + ForbiddenException if task outside org scope
}
```

---

## API Documentation

Base URL: `http://localhost:3000`

All protected endpoints require the header:
```
Authorization: Bearer <access_token>
```

### Auth Endpoints

#### `POST /auth/login`
```json
// Request body
{ "email": "owner@acme.com", "password": "Password123!" }

// Response 200
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "owner@acme.com",
    "firstName": "Alice",
    "lastName": "Owner",
    "role": "Owner",
    "orgId": "550e8400-...",
    "orgName": "Acme Corp",
    "parentOrgId": null
  }
}

// Response 401 — wrong credentials
{ "message": "Invalid credentials", "statusCode": 401 }
```

#### `POST /auth/register`
```json
// Request body
{
  "email": "new@acme.com",
  "password": "Password123!",
  "firstName": "New",
  "lastName": "User",
  "organizationId": "uuid",
  "roleId": "uuid"
}

// Response 201
{ "message": "User created", "id": "uuid" }

// Response 409 — duplicate email
{ "message": "Email already registered", "statusCode": 409 }
```

#### `GET /auth/me` _(JWT required)_
```json
// Response 200
{
  "sub": "uuid",
  "email": "owner@acme.com",
  "role": "Owner",
  "orgId": "uuid",
  "parentOrgId": null
}
```

### Task Endpoints _(JWT required for all)_

#### `GET /tasks`
Returns tasks in the authenticated user's org scope, ordered by status then position.

```json
// Response 200
[
  {
    "id": "uuid",
    "title": "Deploy API v2",
    "description": "Blue/green deployment to production",
    "status": "todo",
    "category": "Work",
    "priority": "high",
    "order": 0,
    "createdById": "uuid",
    "createdByName": "Alice Owner",
    "organizationId": "uuid",
    "organizationName": "Acme Corp",
    "assignedToId": null,
    "assignedToName": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### `POST /tasks` _(Owner, Admin only)_
```json
// Request body
{
  "title": "New task",           // required
  "description": "Optional",    // optional
  "status": "todo",             // optional, default: "todo"
  "category": "Work",           // optional, default: "Work"
  "priority": "medium",         // optional, default: "medium"
  "assignedToId": "uuid"        // optional
}
// Response 201: task object
// Response 403: Viewer role
```

#### `PUT /tasks/:id` _(Owner, Admin only)_
```json
// Request body (all fields optional — partial update)
{
  "status": "in-progress",
  "order": 2,
  "priority": "high"
}
// Response 200: updated task object
// Response 403: Viewer role OR task outside org scope
// Response 404: task not found
```

#### `DELETE /tasks/:id` _(Owner, Admin only)_
```
Response 204 No Content
Response 403: Viewer role OR task outside org scope
Response 404: task not found
```

### Audit Log _(Owner, Admin only)_

#### `GET /audit-log`
```json
// Response 200
[
  {
    "id": "uuid",
    "userId": "uuid",
    "userEmail": "owner@acme.com",
    "action": "login",
    "resource": "Auth",
    "resourceId": null,
    "details": null,
    "ipAddress": "::1",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
// Response 403: Viewer role
```

### HTTP Error Reference

| Status | Scenario                                         |
|--------|--------------------------------------------------|
| 400    | Validation failed (missing required fields)      |
| 401    | Missing, expired, or invalid JWT token           |
| 403    | Insufficient role or task outside org scope      |
| 404    | Task or resource not found                       |
| 409    | Email already registered                         |

---

## Test Suite

```
Total: 84 tests across 13 suites — all passing
```

### Backend (`npx nx test api`)

| File                        | Coverage                                                      |
|-----------------------------|---------------------------------------------------------------|
| `auth.service.spec.ts`      | login success/failure, JWT payload fields, register duplicate |
| `jwt.strategy.spec.ts`      | validate() with valid payload, missing sub, null payload      |
| `tasks.service.spec.ts`     | Owner sees child orgs, Admin limited to own org, Forbidden    |
| `tasks.controller.spec.ts`  | POST 201, GET 200, PUT 200, DELETE 204, audit events          |

### RBAC Lib (`npx nx test auth`)

| File                        | Coverage                                                      |
|-----------------------------|---------------------------------------------------------------|
| `roles.guard.spec.ts`       | allows/denies by role, empty roles, missing user              |

### Frontend (`npx nx test dashboard`)

| File                            | Coverage                                               |
|---------------------------------|--------------------------------------------------------|
| `auth.service.spec.ts`          | login/logout BehaviorSubject, localStorage, isAuth$    |
| `task.service.spec.ts`          | loadTasks, create, delete, update, filter, sort        |
| `login.component.spec.ts`       | form validation, submit, navigate, fillDemo, toggle    |
| `task-board.component.spec.ts`  | columns, distribution, sort, canEdit RBAC, delete flow |

---

## Tradeoffs & Decisions

### 1. `TypeORM synchronize: true`
Automatically creates/alters the SQLite schema from entities on each startup. Acceptable for a demo — in production this risks data loss during schema changes. The correct pattern is TypeORM migrations (`typeorm migration:generate` → `typeorm migration:run`).

### 2. No JWT Refresh Tokens
Access tokens expire in 24h. A production system would add: a refresh token stored in an httpOnly cookie, a `POST /auth/refresh` endpoint with rotation, and a revocation list in Redis. Omitted here to keep the scope focused.

### 3. SQLite over PostgreSQL
Zero infrastructure overhead, perfect for a self-contained demo. SQLite does not support concurrent writes and lacks row-level locking. Upgrading is one config line in TypeORM — no application code changes needed.

### 4. No RBAC Permission Caching
Every `findAll` / `assertInScope` call resolves org scope via a DB query. At demo scale this is negligible. Production fix: cache `getOrgIdScope(userId)` in Redis with a short TTL (30–60s), invalidated on org membership changes.

### 5. BehaviorSubject State Management (No NgRx)
Chosen deliberately over NgRx. `TaskService` holds a single `BehaviorSubject<ITask[]>` and derives filtered views with `combineLatest`. This is ~80 lines vs hundreds for NgRx. NgRx adds value when you have complex cross-slice state interactions or need time-travel debugging — neither applies here.

### 6. Shared Libs as TypeScript Source (Not Published Packages)
`libs/data` and `libs/auth` are consumed via TypeScript path aliases (`@org/data`, `@org/auth`) directly from source. This enables zero-latency iteration inside the monorepo. The tradeoff: they cannot be consumed outside this repo without a build step (e.g., `npx nx build data`).

### 7. No Rate Limiting or CSRF Protection
Not implemented for demo scope. Production hardening:
- Rate limiting: `@nestjs/throttler` decorator on `/auth/login` and `/auth/register`
- CSRF: not needed for bearer-token APIs (stateless, no cookies), but relevant if session cookies are introduced

---

## Future Considerations

- **JWT refresh tokens** — httpOnly cookie rotation with revocation list
- **PostgreSQL migration** — connection pooling, advisory locks for reorder operations
- **Real-time updates** — NestJS WebSocket gateway to push task changes to all connected org members
- **Redis** — org scope caching, rate limiting storage, session management
- **File attachments** — task file uploads to S3-compatible storage (pre-signed URLs)
- **Email notifications** — task assignment alerts and due-date reminders via SendGrid/SES
- **Row-level security** — push RBAC enforcement to PostgreSQL RLS policies for defense in depth
- **Observability** — OpenTelemetry tracing + pino structured JSON logging
- **CI/CD** — GitHub Actions: lint → test → build → Docker image → deploy
- **Pagination** — `GET /tasks` cursor-based pagination for large task lists
