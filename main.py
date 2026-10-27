"""Root entry point for Cloud Deployment (Render, Railway, etc.)

Delegates directly to v2/backend/main.py to serve both the React frontend and FastAPI REST API.
"""

import sys
import os
from pathlib import Path

# Ensure root and backend directory are in sys.path
root_dir = Path(__file__).resolve().parent
backend_dir = root_dir / "v2" / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

# Import FastAPI app from v2.backend.main
from v2.backend.main import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
