# RecruitAI Suite — Enterprise AI Talent Acquisition & Pipeline Intelligence

A zero-infrastructure-cost AI recruitment platform that turns **Google Sheets into an ATS database** and **Google Drive into CV storage**, featuring automated PDF resume extraction, dynamic job description matching, candidate pipeline intelligence, and tailored AI interview kits.

---

## 🚀 Quick Start (Running Version 2 — React + FastAPI)

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+**

### 2. Start Backend (FastAPI)
Open a terminal in the root directory:
```bash
# Create and activate virtual environment
python -m venv .venv

# Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
cd v2/backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
The backend API is now running at `http://localhost:8000`.

### 3. Start Frontend (React + Vite)
Open a second terminal:
```bash
cd v2/frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser to access the RecruitAI Suite!

---

## ⚡ 1-Click Launch (Windows)
Double-click **`run_v2.bat`** in the root directory to launch the server automatically.

---

## 🔄 Alternative: Version 1 (Streamlit Single-File Demo)
If you want to run the lightweight Streamlit backup demo:
```bash
streamlit run app.py
```
Opens at `http://localhost:8501`.

---

## 📊 Google Sheets ATS Integration (30 Seconds)
1. Open your Google Sheet &rarr; Click **Extensions → Apps Script**.
2. Replace everything in `Code.gs` with the code from **`apps_script/Code.gs`** &rarr; click **Save**.
3. Click **Deploy → New deployment → Web app**:
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
4. Click **Deploy** &rarr; **Authorize access** &rarr; **Allow**.
5. Copy the Web app URL (ends with `/exec`) and paste it into the app navbar.

---

## 🔑 AI Key Setup
No `.env` file editing required! Simply click the **AI Engine** button in the top navigation bar and paste your Google Gemini, Anthropic Claude, or OpenAI API key directly through the UI.

- Get a free Google Gemini key: https://aistudio.google.com/apikey

---

## 📁 Project Structure
```text
talent-suite/
├── app.py                      # Version 1: Original Streamlit Demo
├── requirements.txt            # Python dependencies
├── apps_script/
│   └── Code.gs                 # Google Sheets & Drive Apps Script Connector
├── v2/
│   ├── backend/
│   │   ├── main.py             # FastAPI REST endpoints & pipeline engine
│   │   ├── extractor.py        # PDF text parser & multi-LLM JD scoring
│   │   ├── connector.py        # Google Sheets live 2-way sync
│   │   ├── candidates_meta.json# Local metadata & location/fit score cache
│   │   └── uploads/            # Local resume storage & viewer fallback
│   └── frontend/
│       ├── src/
│       │   ├── components/     # React UI components (UploadZone, Cards, Table, Chat)
│       │   ├── App.jsx         # Main dashboard layout & tabs
│       │   └── index.css       # Enterprise White & Royal Blue design system
│       ├── package.json        # Frontend dependencies (React 19, Lucide, React Icons)
│       └── vite.config.js      # Vite proxy configuration
└── README.md                   # This documentation
```
