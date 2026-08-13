# AI Interview Coach - Setup & Verification Guide

This repository contains the complete full-stack **AI Interview Coach** application, consisting of a FastAPI Python backend powered by Groq LLM (`llama-3.3-70b-versatile`) and a Next.js 14 React frontend built with Tailwind CSS and shadcn/ui.

---

## 🚀 Prerequisites

Make sure you have the following installed on your machine:
- **Node.js** (v18.0.0 or higher) & `npm`
- **Python** (v3.11 or v3.13)
- **Groq API Key**: Obtain a key from [Groq API Console](https://console.groq.com/)

---

## 🛠️ 1. Backend Setup & Verification (`/backend`)

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

## 💻 2. Frontend Setup & Verification (`/frontend`)

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

## 🎯 3. Complete End-to-End Verification

Follow these steps to test the entire application end-to-end:

1. **Start Backend Server**:
   ```powershell
   cd backend
   python main.py
   ```
2. **Start Frontend Server** (in a second terminal):
   ```powershell
   cd frontend
   npm run dev
   ```
3. Open **`http://localhost:3000`** in your web browser.
4. **Form Inputs**:
   - Enter an **Interview Topic** (e.g., `Binary Search Trees` or `Dynamic Programming`).
   - Select a **Difficulty Level** (`Easy`, `Medium`, or `Hard`).
5. Click **Start Interview**.
6. **Verify Flow**:
   - The button enters a loading state (`Starting Interview...`).
   - The browser sends a `POST` request to `http://localhost:8000/api/interview/start`.
   - On success, the application navigates to `/interview` passing URL-encoded parameters for topic, difficulty, first question, and conversation history.
