# CareForAb (Monorepo)

CareForAb is a comprehensive, AI-powered health and medication management platform designed to help users track vitals, manage complex medication schedules, and gain personalized insights into their well-being.

## 🚀 Overview

The project is built as a modern monorepo featuring a high-performance Next.js frontend and a robust TypeScript/Express backend, all tied together with Supabase for data persistence and authentication.

## ✨ Key Features

- **📊 Interactive Health Dashboard**: Real-time monitoring of critical vitals including Heart Rate, Blood Pressure, and Steps with dynamic data visualization using Recharts.
- **💊 Advanced Medication Hub**: Complete management of medication inventory, chronic disease protocols, and daily schedule tracking.
- **🤖 AI-Powered Insights**: Personalized health analysis and trend detection powered by Google Gemini AI, providing actionable feedback based on logged data.
- **👟 Activity & Vitals Logging**: Simple, intuitive interfaces for logging daily health metrics and physical activities.
- **🔔 Smart Reminders & Notifications**: Integrated reminder system using Brevo (email) and Capacitor (push notifications) to ensure medication adherence.
- **📱 Cross-Platform Ready**: Optimized for web performance with baked-in support for mobile deployment via Capacitor.

## 🛠️ Tech Stack

### Frontend

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **State Management**: [TanStack Query v5](https://tanstack.com/query/latest)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Charts**: [Recharts](https://recharts.org/)
- **Mobile Bridge**: [Capacitor](https://capacitorjs.com/)

### Backend & Infrastructure

- **API**: [Node.js](https://nodejs.org/) with [Express](https://expressjs.com/) & [TypeScript](https://www.typescriptlang.org/)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Communications**: [Brevo](https://www.brevo.com/) (Email Service)
- **AI Engine**: [Google Gemini Pro](https://deepmind.google/technologies/gemini/)

## 📂 Project Structure

- **`frontend/`**: Next.js application (Port 3000)
  - `(app)/`: Main application features (Dashboard, Insights, Medications, Vitals, Readings)
  - `(auth)/`: Authentication flows
  - `components/`: Reusable UI components (Shadcn + Custom)
  - `hooks/`: Custom React hooks for data fetching and logic
- **`backend/`**: Express API (Port 3001) for reminders, cron jobs, and utility helpers.
- **`supabase/`**: Database migrations, edge functions, and configuration.
- **`scripts/`**: Utility scripts for environment setup and management.

## ⚙️ Prerequisites

- **Node.js 18+**
- **npm** or **bun**

## 📥 Installation & Setup

1. **Clone the repo and install dependencies**:

   ```bash
   npm run install:all
   ```
2. **Configure Environment Variables**:
   Create `.env` files in both `frontend/` and `backend/` directories.

   **Frontend (`frontend/.env`):**

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   **Backend (`backend/.env`):**

   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   BREVO_API_KEY=your_brevo_key
   ```

## 🚀 Running Locally

Start both the frontend and backend in development mode:

```bash
npm run dev
```

Or run them individually:

```bash
npm run dev:frontend
npm run dev:backend
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend Health**: [http://localhost:3001/health](http://localhost:3001/health)

## 🐳 Docker Deployment

Run the entire stack using Docker Compose:

```bash
docker compose up --build
```

---

*Developed as part of the CareForAb Health Management Initiative.*
