# AI Interview Coach - Setup & Deployment Guide

This repository contains the complete full-stack **AI Interview Coach** application, consisting of a FastAPI Python backend powered by Groq LLM (`llama-3.3-70b-versatile`) and a Next.js 14 React frontend built with Tailwind CSS and shadcn/ui.

---

## 📁 Repository Structure

```
capstone/
├── .gitignore              # Global gitignore for Python, Node, and secrets
├── README.md               # Project documentation and deployment guide
├── backend/
│   ├── main.py             # FastAPI app entry point & CORS
│   ├── schemas.py          # Pydantic request models
│   ├── requirements.txt    # Python dependencies
│   ├── .env.example        # Environment variable template
│   ├── routers/            # API routers (/interview, /report)
│   ├── services/           # Groq LLM service integration
│   └── tests/              # Unit and integration tests
└── frontend/
    ├── src/
    │   └── app/            # Next.js App Router pages (/, /interview, /report)
    ├── package.json        # Node dependencies and scripts
    ├── vitest.config.mts   # Vitest testing configuration
    └── .env.local          # Frontend local environment configuration
```

---

## 🚀 Prerequisites

Make sure you have the following installed on your machine:
- **Node.js** (v18.0.0 or higher) & `npm`
- **Python** (v3.11 or v3.13)
- **Git**
- **Groq API Key**: Obtain a free key from [Groq API Console](https://console.groq.com/)

---

## 🛠️ 1. Local Backend Setup & Verification (`/backend`)

### Step 1: Navigate to the backend directory
```powershell
cd backend
```

### Step 2: Configure Environment Variables
Create a `.env` file in the `backend/` directory:
```env
GROQ_API_KEY=your_actual_groq_api_key_here
```

### Step 3: Install Python Dependencies
```powershell
pip install -r requirements.txt
```

### Step 4: Run Backend Tests
Run the **Unit Tests** first:
```powershell
python -m unittest tests/test_unit.py
```

Run the **Integration Tests** (after unit tests pass):
```powershell
python -m unittest tests/test_integration.py
```

### Step 5: Start the Backend Server
```powershell
python main.py
```
*Alternatively using Uvicorn directly:*
```powershell
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API server will run at **`http://localhost:8000`**.

- **Health Check Endpoint**: `GET http://localhost:8000/`
- **Swagger Interactive API Docs**: `http://localhost:8000/docs`
- **Endpoints**:
  - `POST /api/interview/start`
  - `POST /api/interview/answer`
  - `POST /api/report/generate`

---

## 💻 2. Local Frontend Setup & Verification (`/frontend`)

### Step 1: Navigate to the frontend directory
```powershell
cd frontend
```

### Step 2: Verify `.env.local` Configuration
Ensure `.env.local` exists in `frontend/` with:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Step 3: Install Node Dependencies
```powershell
npm install
```

### Step 4: Run Frontend Unit & Component Tests
```powershell
npm run test
```

### Step 5: Verify Production Build & TypeScript Types
```powershell
npm run build
```

### Step 6: Start the Frontend Development Server
```powershell
npm run dev
```

Open **`http://localhost:3000`** in your browser.

---

## 🌐 3. In-Depth Deployment Guide (Render & Vercel)

### Part A: Deploying Backend to Render (`onrender.com`)

Render is recommended for hosting Python FastAPI services.

#### Step 1: Push Repository to GitHub
1. Create a new repository on [GitHub](https://github.com/new).
2. Push your local `capstone` repository:
   ```powershell
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

#### Step 2: Create Web Service on Render
1. Log in to [Render Console](https://dashboard.render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Configure the Web Service settings:
   - **Name**: `ai-interview-coach-backend`
   - **Region**: Select closest location (e.g. Frankfurt, Oregon, Singapore)
   - **Branch**: `main` (or `master`)
   - **Root Directory**: `backend` *(CRITICAL: Must set to `backend`)*
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`

#### Step 3: Configure Render Environment Variables
Under **Environment Variables** in Render, add:
- `GROQ_API_KEY`: `your_actual_groq_api_key_here`
- `PYTHON_VERSION`: `3.11.7` (optional, forces Python 3.11)

#### Step 4: Deploy & Test Backend URL
1. Click **Create Web Service**.
2. Render will build and deploy your API. Once finished, copy your live backend URL (e.g., `https://ai-interview-coach-backend.onrender.com`).
3. Verify in browser: Visit `https://ai-interview-coach-backend.onrender.com/` — it should return `{"message": "AI Interview Coach API is running"}`.

---

### Part B: Deploying Frontend to Vercel (`vercel.com`)

Vercel is the official host for Next.js applications.

#### Step 1: Import Project to Vercel
1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** -> **Project**.
3. Select your GitHub repository (`YOUR_REPO_NAME`).

#### Step 2: Configure Project Settings
- **Project Name**: `ai-interview-coach-frontend`
- **Framework Preset**: `Next.js`
- **Root Directory**: Click **Edit** and select `frontend` *(CRITICAL: Select `frontend`)*
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)

#### Step 3: Add Production Environment Variables
Under **Environment Variables**, add:
- **Key**: `NEXT_PUBLIC_API_URL`
- **Value**: Your live Render backend URL from Part A (e.g., `https://ai-interview-coach-backend.onrender.com`)
*(Do NOT include a trailing slash `/`)*

#### Step 4: Deploy & Verify
1. Click **Deploy**.
2. Vercel will compile the production Next.js build.
3. Upon completion, click the generated live URL (e.g., `https://ai-interview-coach-frontend.vercel.app`).
4. Test starting an interview! The frontend will connect to your live Render backend and Groq LLM API.
