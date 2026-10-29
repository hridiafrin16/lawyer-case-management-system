# Lawyer Case Management System

![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=111111)
![Vite](https://img.shields.io/badge/Build-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=ffffff)
![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge&logo=node.js&logoColor=ffffff)
![Express](https://img.shields.io/badge/API-Express.js-000000?style=for-the-badge&logo=express&logoColor=ffffff)
![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=ffffff)

A modern, responsive Lawyer Case Management System built to help advocates and law firms manage clients, cases, hearings, payments, reports, and documents efficiently.

---

## Features

| Feature | Description |
| --- | --- |
| 🔐 Secure authentication | Login-protected access for chamber users |
| 📊 Dashboard with case statistics | Quick overview of cases, hearings, and financial summaries |
| 👥 Client management | Store and manage client records and contact details |
| ⚖️ Case management | Track case details, court information, status, and parties |
| 📅 Hearing scheduling | Manage today, tomorrow, and upcoming hearing records |
| 💳 Payment tracking | Track due amounts, paid amounts, and payment history |
| 📈 Reports | View operational and financial summaries |
| 📁 Document management | Upload and manage case-related documents |
| 📱 Responsive modern UI | Clean interface designed for desktop and smaller screens |

---

## Tech Stack

### Frontend

| Technology | Purpose |
| --- | --- |
| React | User interface |
| Vite | Frontend development and build tooling |
| Axios | API requests |
| CSS | Styling and responsive layout |

### Backend

| Technology | Purpose |
| --- | --- |
| Node.js | Runtime environment |
| Express.js | REST API server |
| Better SQLite3 | SQLite database driver |
| JWT Authentication | Secure route access |
| Multer | Document upload handling |

### Database

| Database | Purpose |
| --- | --- |
| SQLite | Local application data storage |

---

## Project Structure

```text
backend/
frontend/
```

---

## Installation

### Clone

```bash
git clone <repository-url>
```

### Backend

```bash
cd backend
npm install
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Default Login

| Field | Value |
| --- | --- |
| Email | `admin@example.com` |
| Password | `admin123` |

---

## Screenshots

| Page | Preview |
| --- | --- |
| Login Page | Screenshot placeholder |
| Dashboard | Screenshot placeholder |
| Clients | Screenshot placeholder |
| Cases | Screenshot placeholder |
| Hearings | Screenshot placeholder |
| Reports | Screenshot placeholder |
| Settings | Screenshot placeholder |

---

## 🔮 Future Improvements

- Multi-user support
- Role-based access control
- Email notifications
- Calendar integration
- Cloud database
- Backup & Restore
- Advanced reporting

---



This project is for educational and portfolio purposes.

---



**Sadia Afrin Hridi**

## Render deployment

Deploy the backend as a Render Web Service and the frontend as a Render Static Site. Both use this repository; keep the existing login enabled.

### Backend Render Web Service

- **Root Directory:** `backend`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

Set these environment variables in the backend service:

| Variable | Requirement | Value |
| --- | --- | --- |
| `NODE_ENV` | Required | `production` (enables production security checks). |
| `JWT_SECRET` | Required | A long, random secret stored only in Render's environment settings. |
| `CORS_ORIGIN` | Required for browser access | The exact HTTPS URL of the deployed frontend, without a trailing slash. |
| `DATABASE_PATH` | Required for persistent SQLite data | The absolute path on the mounted persistent disk, for example `/var/data/case_system.db`. |
| `DOCUMENTS_DIR` | Required if uploaded documents must persist | A directory on that same disk, for example `/var/data/uploads`. |
| `PORT` | Supplied by Render | Do not set unless needed for local development; the service uses Render's assigned port. |

Attach a Render Persistent Disk to the backend service, mount it at `/var/data`, and use the paths above. Render Persistent Disks require a paid service plan. SQLite and uploaded files are otherwise on the service filesystem and will not survive replacement/redeploys reliably. You can also set the backend health check path to `/api/health`. The existing local defaults remain `backend/case_system.db` and `backend/uploads`.

For a Render Free test without a Persistent Disk, leave `DATABASE_PATH` and `DOCUMENTS_DIR` unset. If either variable points to an unavailable or unwritable directory, the backend falls back to `backend/case_system.db` and `backend/uploads`. Free service storage is temporary, so test data and uploaded files may be lost when the service restarts or redeploys. Set the variables back to paths on the mounted disk if you later move to a plan with persistent storage.

A newly mounted disk starts with a separate, empty database; it does not copy the local `case_system.db`. On an empty database, the existing seed logic creates `admin@example.com` with password `admin123`. Change that password through Settings before sharing the demo URL, and use only demo or sanitized case data in the Render database.

### Frontend Render Static Site

- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`

Set `VITE_API_URL` to the backend service's HTTPS origin, without a trailing slash, such as `https://your-backend-service.onrender.com`. The frontend adds `/api` to that origin. Vite embeds this value at build time, so set it before the static-site build.

Add a Static Site rewrite rule in the Render dashboard: source `/*`, destination `/index.html`, action `Rewrite`. This lets React Router serve case and client detail URLs when opened directly or refreshed.

### Local development

From `backend`, run `npm.cmd run dev`; from `frontend`, run `npm.cmd run dev`. The backend defaults to port `4000`, the Vite dev server to `5173`, and Vite proxies `/api` to the local backend. The local SQLite file and document folder are unchanged unless `DATABASE_PATH` or `DOCUMENTS_DIR` is set. `backend/.env.example` and `frontend/.env.example` list the available overrides; copy them to `.env` if needed. Never put a production JWT secret in the repository.
