<div align="center">

# Divido

**Smart Expense Sharing for Groups**

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Express](https://img.shields.io/badge/Express-4.18-000000?logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.0-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![License](https://img.shields.io/badge/License-Private-red)]()

A full-stack expense management application designed to make splitting bills and managing shared expenses effortless. Track, split, and settle group expenses with complete transparency — built with Indian users in mind, with native ₹ INR support.

[Getting Started](#getting-started) · [Documentation](#documentation) · [API Reference](#api-reference) · [Architecture](#architecture)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Documentation](#documentation)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Divido is a modern, full-stack web application that simplifies group expense management. Whether you're splitting vacation costs with friends, managing rent with roommates, or organising event budgets, Divido automates the math and keeps everyone on the same page.

### Use Cases

| Scenario | How Divido Helps |
|---|---|
| **Trips & Vacations** | Track shared travel costs and settle up at the end |
| **Roommates** | Manage rent, utilities, groceries, and household expenses |
| **Events** | Handle group event costs with full transparency |
| **Project Teams** | Track project-related expenses and reimbursements |
| **Everyday Splitting** | From restaurant bills to group gifts |

---

## Features

### Expense Management
- Add, edit, and categorise expenses with detailed descriptions
- Track who paid and who participated in each expense
- Split bills equally or by custom amounts
- Attach notes for future reference

### Group Organisation
- Create and manage multiple groups for different activities
- Invite members via shareable invite links and codes
- Role-based access control within groups
- Real-time group balance tracking

### Settlement Engine
- Automatic debt calculation using an optimised balance algorithm
- Simplified settlement suggestions to minimise transactions
- Full settlement history with status tracking
- Mark settlements as pending, completed, or rejected

### Analytics & Insights
- Visual spending breakdowns with interactive charts (Recharts)
- Category-wise expense analysis
- Member contribution statistics
- Spending trends over time

### Notifications
- In-app notification system for group activity
- Alerts for new expenses, settlements, and group invitations
- Email notifications via Nodemailer

### Authentication & Security
- Email/password registration with OTP verification
- Google OAuth 2.0 single sign-on
- JWT-based session management
- Protected routes and API endpoints
- Rate limiting on sensitive endpoints

---

## Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| [React 18](https://react.dev) | UI library with component-based architecture |
| [TypeScript](https://www.typescriptlang.org) | Static type checking |
| [Vite](https://vitejs.dev) | Build tool and dev server with HMR |
| [React Router v6](https://reactrouter.com) | Client-side routing |
| [TanStack Query](https://tanstack.com/query) | Server state management and data fetching |
| [shadcn/ui](https://ui.shadcn.com) | Accessible, composable UI components |
| [Radix UI](https://www.radix-ui.com) | Unstyled, accessible UI primitives |
| [Tailwind CSS](https://tailwindcss.com) | Utility-first CSS framework |
| [Recharts](https://recharts.org) | Composable charting library |
| [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) | Form management and schema validation |
| [Lucide React](https://lucide.dev) | Icon system |

### Backend

| Technology | Purpose |
|---|---|
| [Express.js](https://expressjs.com) | HTTP server and REST API framework |
| [MongoDB](https://www.mongodb.com) + [Mongoose](https://mongoosejs.com) | NoSQL database and ODM |
| [JSON Web Tokens](https://jwt.io) | Stateless authentication |
| [bcrypt.js](https://github.com/dcodeIO/bcrypt.js) | Password hashing |
| [express-validator](https://express-validator.github.io) | Request validation middleware |
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | API rate limiting |
| [Nodemailer](https://nodemailer.com) | Email delivery (OTP, invitations) |
| [Google Auth Library](https://github.com/googleapis/google-auth-library-nodejs) | Google OAuth verification |

### Infrastructure

| Technology | Purpose |
|---|---|
| [Vercel](https://vercel.com) | Frontend hosting with SPA rewrites |
| [MongoDB Atlas](https://www.mongodb.com/atlas) | Managed database cluster |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                     │
│                                                             │
│  React + TypeScript ─── React Router ─── TanStack Query     │
│       │                                       │             │
│   shadcn/ui                              API Client         │
│   Tailwind CSS                          (src/lib/api.ts)    │
│   Recharts                                    │             │
└───────────────────────────────┬─────────────────────────────┘
                                │  HTTP / REST (JSON)
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Express.js)                     │
│                                                             │
│  Middleware Layer          Route Layer          Utils        │
│  ┌──────────────┐    ┌─────────────────┐   ┌────────────┐  │
│  │ CORS         │    │ /api/auth       │   │ Balance    │  │
│  │ Auth (JWT)   │    │ /api/groups     │   │ Calculator │  │
│  │ Rate Limit   │    │ /api/expenses   │   │ Email      │  │
│  │ Validation   │    │ /api/settlements│   │ Invite     │  │
│  └──────────────┘    │ /api/dashboard  │   │ Codes      │  │
│                      │ /api/activity   │   └────────────┘  │
│                      │ /api/notifications│                  │
│                      │ /api/invites    │                    │
│                      └─────────────────┘                    │
└───────────────────────────────┬─────────────────────────────┘
                                │  Mongoose ODM
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    MongoDB (Atlas / Local)                   │
│                                                             │
│  Collections: Users │ Groups │ Expenses │ Settlements       │
│               Notifications │ ActivityLogs │ OTPs           │
│               GroupInvites                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| **Node.js** | ≥ 18.x | [Install via nvm](https://github.com/nvm-sh/nvm#installing-and-updating) |
| **npm** | ≥ 9.x | Bundled with Node.js |
| **MongoDB** | ≥ 6.x | Local installation or [MongoDB Atlas](https://www.mongodb.com/atlas) account |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/divido.git
cd divido

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
cd backend
npm install
cd ..
```

### Environment Variables

#### Frontend (`/.env`)

```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

#### Backend (`/backend/.env`)

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/divido
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=development
FRONTEND_URL=http://localhost:8080
```

> [!IMPORTANT]
> Never commit `.env` files to version control. Both directories include `.gitignore` rules to exclude them.

### Running the Application

Open **two terminal sessions** — one for each service:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# ✓ Server running on http://localhost:5000
# ✓ MongoDB connected
```

**Terminal 2 — Frontend:**
```bash
npm run dev
# ✓ Dev server running on http://localhost:8080
```

Once both services are running, open [http://localhost:8080](http://localhost:8080) in your browser.

> [!TIP]
> Verify the backend is healthy by visiting [http://localhost:5000/api/health](http://localhost:5000/api/health). You should receive a JSON response with the server status and database connection state.

---

## Project Structure

```
divido/
├── backend/                    # Express.js REST API
│   ├── config/                 #   Database connection configuration
│   ├── middleware/              #   Auth (JWT verification) middleware
│   ├── models/                 #   Mongoose schemas and models
│   │   ├── User.js             #     User accounts and profiles
│   │   ├── Group.js            #     Group definitions and membership
│   │   ├── Expense.js          #     Expense records with split details
│   │   ├── Settlement.js       #     Debt settlement transactions
│   │   ├── Notification.js     #     In-app notification entries
│   │   ├── ActivityLog.js      #     Audit trail of group activity
│   │   ├── GroupInvite.js      #     Invite codes and links
│   │   └── Otp.js              #     One-time password records
│   ├── routes/                 #   Express route handlers
│   │   ├── auth.js             #     Authentication & registration
│   │   ├── groups.js           #     Group CRUD & membership
│   │   ├── expenses.js         #     Expense management
│   │   ├── settlements.js      #     Settlement workflows
│   │   ├── dashboard.js        #     Aggregated dashboard data
│   │   ├── activity.js         #     Activity feed
│   │   ├── notifications.js    #     Notification management
│   │   └── invites.js          #     Group invitation system
│   ├── utils/                  #   Shared utilities
│   │   ├── balanceCalculator.js #     Debt simplification algorithm
│   │   ├── email.js            #     Email transport (Nodemailer)
│   │   └── inviteCode.js       #     Invite code generation
│   └── server.js               #   Application entry point
│
├── src/                        # React frontend application
│   ├── components/             #   Reusable UI components
│   │   ├── ui/                 #     shadcn/ui primitives
│   │   ├── auth/               #     Authentication components
│   │   ├── charts/             #     Analytics chart components
│   │   ├── dashboard/          #     Dashboard widgets
│   │   ├── expenses/           #     Expense-related components
│   │   ├── groups/             #     Group management components
│   │   └── layout/             #     App shell and navigation
│   ├── hooks/                  #   Custom React hooks
│   │   ├── useAuth.tsx         #     Authentication context & logic
│   │   ├── use-toast.ts        #     Toast notification hook
│   │   └── use-mobile.tsx      #     Responsive breakpoint hook
│   ├── lib/                    #   Shared utilities
│   │   ├── api.ts              #     Centralised HTTP client
│   │   ├── format.ts           #     Currency & date formatters
│   │   └── utils.ts            #     General utility functions
│   ├── pages/                  #   Route-level page components
│   │   ├── Index.tsx           #     Dashboard / home page
│   │   ├── Auth.tsx            #     Login & registration
│   │   ├── Groups.tsx          #     Group listing & creation
│   │   ├── GroupDetail.tsx     #     Single group view
│   │   ├── Expenses.tsx        #     Expense listing & management
│   │   ├── Settlements.tsx     #     Settlement management
│   │   ├── Analytics.tsx       #     Spending analytics
│   │   ├── Settings.tsx        #     User preferences
│   │   ├── Notifications.tsx   #     Notification centre
│   │   └── JoinGroup.tsx       #     Public invite join page
│   ├── types/                  #   TypeScript type definitions
│   └── App.tsx                 #   Root component with routing
│
├── public/                     # Static assets
├── index.html                  # HTML entry point
├── vite.config.ts              # Vite build configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── vercel.json                 # Vercel deployment config (SPA rewrites)
├── package.json                # Frontend dependencies & scripts
└── tsconfig.json               # TypeScript compiler configuration
```

---

## API Reference

All endpoints are prefixed with `/api`. Protected routes require a valid JWT in the `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | ✗ | Register a new user account |
| `POST` | `/api/auth/login` | ✗ | Authenticate and receive JWT |
| `POST` | `/api/auth/google` | ✗ | Google OAuth sign-in |
| `GET` | `/api/auth/me` | ✓ | Retrieve authenticated user profile |

### Groups

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/groups` | ✓ | List all groups for current user |
| `GET` | `/api/groups/:id` | ✓ | Get group details with members |
| `POST` | `/api/groups` | ✓ | Create a new group |
| `PUT` | `/api/groups/:id` | ✓ | Update group details |
| `DELETE` | `/api/groups/:id` | ✓ | Delete a group |

### Expenses

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/expenses` | ✓ | List expenses (filterable by group) |
| `POST` | `/api/expenses` | ✓ | Create a new expense |
| `PUT` | `/api/expenses/:id` | ✓ | Update an expense |
| `DELETE` | `/api/expenses/:id` | ✓ | Delete an expense |

### Settlements

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/settlements` | ✓ | List settlements for user |
| `POST` | `/api/settlements` | ✓ | Create a new settlement |
| `PATCH` | `/api/settlements/:id` | ✓ | Update settlement status |

### Dashboard

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/dashboard/summary` | ✓ | Aggregated financial summary |

### Activity & Notifications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/activity` | ✓ | Activity feed for user's groups |
| `GET` | `/api/notifications` | ✓ | User notifications |
| `PATCH` | `/api/notifications/:id` | ✓ | Mark notification as read |

### Invitations

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/groups/:id/invite` | ✓ | Generate invite link for group |
| `GET` | `/api/invite/:code` | ✗ | Validate invite code (public) |
| `POST` | `/api/invite/:code/join` | ✓ | Join group via invite code |

### Health Check

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | ✗ | Server and database status |

---

## Documentation

| Document | Description |
|---|---|
| [SETUP.md](./SETUP.md) | Step-by-step setup instructions for development |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common issues and their solutions |
| [backend/README.md](./backend/README.md) | Backend-specific documentation |
| [backend/ATLAS_SETUP_GUIDE.md](./backend/ATLAS_SETUP_GUIDE.md) | MongoDB Atlas configuration guide |

---

## Scripts

### Frontend

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Create production build |
| `npm run build:dev` | Create development build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint checks |

### Backend

| Command | Description |
|---|---|
| `npm start` | Start production server |
| `npm run dev` | Start dev server with `--watch` mode |
| `npm run test:connection` | Test MongoDB connection |

---

## Deployment

### Frontend (Vercel)

The frontend is configured for deployment on **Vercel** with SPA routing support via `vercel.json`. All routes are rewritten to serve `index.html` for client-side routing.

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Backend

The backend can be deployed to any Node.js hosting platform (Render, Railway, Fly.io, etc.). Ensure the following environment variables are configured in your hosting provider's dashboard:

- `PORT`
- `MONGODB_URI` (use MongoDB Atlas connection string)
- `JWT_SECRET` (use a strong, unique secret)
- `NODE_ENV=production`
- `FRONTEND_URL` (your deployed frontend URL, for CORS)

---

## Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/your-feature`)
3. **Commit** your changes (`git commit -m 'feat: add your feature'`)
4. **Push** to the branch (`git push origin feature/your-feature`)
5. **Open** a Pull Request

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Usage |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation changes |
| `style:` | Code style (formatting, no logic change) |
| `refactor:` | Code refactoring |
| `test:` | Adding or updating tests |
| `chore:` | Maintenance tasks |

---

## License

This project is private and proprietary. All rights reserved.

---

<div align="center">

Built with ☕ and TypeScript

</div>
