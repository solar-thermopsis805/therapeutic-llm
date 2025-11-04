# AI Therapy Chatbot Synoptic Project - Setup Instructions
# Thomas Gollick
# 21441100

## Overview
This project consists of a Python backend that provides therapeutic responses and a React frontend web application. Below are the instructions to set up and run both parts of the project.

## Backend Setup (Python)

### 1. Set Up Python Environment
```bash
# Create a virtual environment
python -m venv env

# Activate the virtual environment
# On Windows:
env\Scripts\activate
# On macOS/Linux:
source env/bin/activate
```

### 2. Install Python Dependencies
```bash
# Fix the typo in requirements file name
pip install -r requirments.txt
```

### 3. Run the Backend Server
```bash
# Run with uvicorn
uvicorn main:app --reload
```

The backend server will start on http://localhost:8000 by default. The API will be available at:
- API Endpoint: http://localhost:8000/api/chat
- Swagger Docs: http://localhost:8000/docs (automatically provided by FastAPI)

## Frontend Setup (React/TypeScript)

### 1. Navigate to the Web Application Directory
```bash
cd web_application
```

### 2. Install Node.js Dependencies
```bash
npm install
```

### 3. Run the Development Server
```bash
npm run dev
```

The frontend development server will start on http://localhost:5173 by default.

### 4. Build for Production
```bash
npm run build
```

This will create optimized production files in the `dist` directory.

## Project Structure
- `main.py`: FastAPI server that handles chat requests
- `therapy_response/`: Contains the therapeutic response generation logic
- `emotion_detection/`: Emotion detection module
- `sarcasm_detection/`: Sarcasm detection module
- `web_application/`: React frontend application

## Additional Notes
- Make sure both the backend server and frontend development server are running simultaneously during development.
- The backend expects messages in a specific format with conversation history.
- The frontend communicates with the backend through the `/api/chat` endpoint.

## Troubleshooting
- If you encounter module import errors, ensure your PYTHONPATH includes the project root directory.
- For any CORS issues, the backend is configured to allow all origins which should solve most issues
- If for whatever reason the API starts on a different Domain please simply change that domain in the App.tsx from localhost:xxxx to whatever yours runs on

MANY THANKS HOPE YOU LIKE THE PROJECT!