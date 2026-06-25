# Edvixa

Edvixa is an AI-assisted learning and teacher-booking platform.

## Stack

- Frontend: React, Vite, TypeScript, React Router, TanStack Query, Zustand
- Backend: Node.js, Express, TypeScript, MongoDB Atlas, Mongoose
- Architecture: modular MVC with service and validation layers

## Current milestone

This starter implements the platform foundation:

- Email/password registration and login
- Refresh-token sessions and logout
- Forgot/reset password OTP flow for development
- Student and teacher profile creation
- Student, teacher, and admin route protection
- Student/teacher/admin dashboard shells
- Subject CRUD foundation
- Teacher approval foundation
- Complete route map for the planned UI pages

## Start without Docker

### 1. Extract and enter the project

```bash
unzip edvixa-mvc-starter-no-docker.zip
cd edvixa
```

### 2. Create a MongoDB Atlas database

Create a free MongoDB Atlas deployment, create a database user, allow your current IP address, and copy the application connection string.

Use `edvixa` as the database name in the connection string.

### 3. Create environment files

```bash
cp .env.example apps/api/.env
cp .env.example apps/web/.env
```

Open `apps/api/.env` and replace `MONGODB_URI` with your real Atlas connection string.

Keep `apps/web/.env` with:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

### 4. Install dependencies

```bash
npm install
```

### 5. Seed the database

```bash
npm run seed
```

### 6. Start the API and frontend

```bash
npm run dev
```

Frontend: http://localhost:5173  
API health: http://localhost:5000/api/v1/health

## Development email behavior

Until a real email provider is connected, password-reset OTPs and email-verification tokens are printed to the API console in development. They are never returned in production.
