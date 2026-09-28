# Deployment Guide — Rainfall Intelligence Platform (SIH26080)

This repository is pre-configured for one-click deployment across multiple cloud platforms.

---

## Option 1: Render.com (Recommended — Free Tier)

Render supports deploying both the FastAPI backend and React frontend from this single repository using `render.yaml`.

### Step-by-Step Instructions:

1. **Sign Up / Log In**:
   - Go to [render.com](https://render.com) and log in with your GitHub account.

2. **Deploy via Blueprint (Automatic)**:
   - Go to your Render Dashboard → Click **New +** → **Blueprint**.
   - Select your repository: `Nandinimayuri/Rainfall-Intelligence`.
   - Render reads `render.yaml` automatically and configures:
     - **Backend Web Service**: `rainfall-intelligence-backend`
     - **Frontend Static Site**: `rainfall-intelligence-frontend`
   - In the environment variables section, fill in your `LLM_API_KEY` (Groq API Key).
   - Click **Apply**.

3. **Or Deploy Services Manually**:
   - **Backend Web Service**:
     - Root Directory: `backend`
     - Build Command: `pip install -r requirements.txt`
     - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
     - Environment Variables:
       - `CORS_ORIGINS`: `*`
       - `LLM_PROVIDER`: `groq`
       - `LLM_MODEL`: `llama-3.3-70b-versatile`
       - `LLM_API_KEY`: `<your_groq_api_key>`
       - `LLM_BASE_URL`: `https://api.groq.com/openai/v1`
   - **Frontend Static Site**:
     - Root Directory: `frontend`
     - Build Command: `npm install && npm run build`
     - Publish Directory: `dist`
     - Environment Variable:
       - `VITE_API_URL`: `<your-backend-render-url>/api`

---

## Option 2: Railway.app (Quickest 1-Click Deployment)

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. Click **New Project** → **Deploy from GitHub repo** → select `Nandinimayuri/Rainfall-Intelligence`.
3. Add environment variables:
   - `CORS_ORIGINS`: `*`
   - `LLM_API_KEY`: `<your_groq_api_key>`
4. Railway will deploy automatically and generate a public HTTPS URL.

---

## Option 3: Vercel (Frontend) + Render (Backend)

1. Deploy the backend on Render as shown in Option 1.
2. Go to [vercel.com](https://vercel.com) and click **Add New...** → **Project**.
3. Import `Nandinimayuri/Rainfall-Intelligence`.
4. Set **Root Directory** to `frontend`.
5. Under **Environment Variables**, add:
   - `VITE_API_URL`: `https://<your-render-backend-url>/api`
6. Click **Deploy**. Vercel will deploy the frontend to a global edge network.

---

## Option 4: Docker Deployment

You can build and run the entire application using the included `Dockerfile`:

```bash
# Build the Docker image
docker build -t rainfall-intelligence .

# Run the container on port 8000
docker run -d -p 8000:8000 -e LLM_API_KEY="<your_api_key>" rainfall-intelligence
```
