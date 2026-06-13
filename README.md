# AI Resume Grader with AI Recruiter Persona Simulator

This repository contains a full-stack MERN application for analyzing resume content, generating ATS scores, and providing recruiter-style feedback powered by AI.

## Structure

- `backend/` - Express.js API server with MongoDB, JWT auth, PDF parsing, and OpenAI integration
- `frontend/` - React application using React Router, Bootstrap, and Axios

## Setup

1. Install backend dependencies:
   - `cd backend`
   - `npm install`
2. Install frontend dependencies:
   - `cd ../frontend`
   - `npm install`
3. Copy `.env.example` to `.env` in `backend/` and set:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `OPENAI_API_KEY`
4. Start the backend and frontend:
   - `cd backend && npm run dev`
   - `cd ../frontend && npm run dev`

## API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/analysis/upload`
- `POST /api/analysis/analyze`
- `GET /api/analysis/history`
- `DELETE /api/analysis/:id`
