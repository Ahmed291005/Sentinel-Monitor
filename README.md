# SENTINEL — Autonomous Rule Intelligence & Action System

A production-grade intelligent automation platform that monitors events,
applies dynamic decision rules, and executes actions automatically.

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18, Vite, Tailwind CSS        |
| Charts     | Chart.js + react-chartjs-2          |
| Backend    | Node.js + Express.js                |
| Database   | SQL Server (SSMS 22)                |
| Auth       | JWT + bcryptjs                      |
| Patterns   | Observer, Chain of Responsibility, Strategy, Factory |

---

## Design Patterns

| Pattern               | File                                          |
|-----------------------|-----------------------------------------------|
| Observer              | `backend/src/patterns/EventBus.js`            |
| Chain of Responsibility | `backend/src/patterns/chain/`               |
| Strategy              | `backend/src/patterns/strategies/`            |
| Factory               | `backend/src/patterns/factories/`             |
| Brain (all 4 wired)   | `backend/src/services/RuleEngineService.js`   |

---

## Setup Instructions

### Step 1 — Database (SSMS)

Open SQL Server Management Studio and run:

```sql
CREATE DATABASE SentinelDB;
```

Enable `sa` login:
```sql
ALTER LOGIN sa ENABLE;
ALTER LOGIN sa WITH PASSWORD = 'Sentinel@123', CHECK_POLICY = OFF;
```

### Step 2 — Backend

```bash
cd backend
npm install
npm run setup
npm run dev
```

Backend runs on: http://localhost:3001

### Step 3 — Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: http://localhost:5173

---

## Login Credentials

| Role     | Username   | Password       |
|----------|------------|----------------|
| Admin    | admin      | Admin@1234     |
| Operator | operator   | Operator@1234  |

---

## API Endpoints

| Method | Endpoint                    | Description              |
|--------|-----------------------------|--------------------------|
| POST   | /api/auth/login             | Login                    |
| POST   | /api/auth/register          | Register                 |
| GET    | /api/events                 | List events              |
| POST   | /api/events                 | Create + process event   |
| GET    | /api/rules                  | List rules               |
| POST   | /api/rules                  | Create rule (admin)      |
| PATCH  | /api/rules/:id/toggle       | Enable/disable rule      |
| POST   | /api/rules/:id/test         | Test rule sandbox        |
| GET    | /api/logs                   | Decision audit trail     |
| GET    | /api/logs/stats             | Log statistics           |
| POST   | /api/simulation/start       | Start simulation         |
| POST   | /api/simulation/stop        | Stop simulation          |
| POST   | /api/simulation/fire        | Fire one random event    |

---

## Project Structure

```
sentinel/
├── backend/
│   ├── database/
│   │   ├── connection.js
│   │   ├── migrations/
│   │   └── seeds/
│   └── src/
│       ├── models/          (6 files — data access)
│       ├── patterns/
│       │   ├── EventBus.js  (Observer)
│       │   ├── chain/       (Chain of Responsibility)
│       │   ├── strategies/  (Strategy)
│       │   └── factories/   (Factory)
│       ├── services/
│       │   ├── RuleEngineService.js
│       │   └── SimulationService.js
│       ├── controllers/     (7 files)
│       ├── middleware/      (3 files)
│       ├── routes/          (7 files)
│       └── app.js
└── frontend/
    └── src/
        ├── api/             (API service layer)
        ├── components/      (Layout, UI components)
        ├── hooks/           (useAuth)
        └── pages/           (Dashboard, Events, Rules, Logs, Login)
```
