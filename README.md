# Canvas Assignment Scheduler

A web application that fetches Canvas LMS assignments and allows users to schedule them in Google Calendar with one click.

## Features

- **Easy Setup**: Simple form to input Canvas URL and API token
- **Assignment Overview**: View all assignments across courses with smart filtering
- **One-Click Calendar Integration**: Add assignments to Google Calendar with course details
- **Rate Limiting**: DDoS protection with 30 requests/minute per IP
- **Error Handling**: Retry mechanisms and better error messages
- **Responsive Design**: Works on desktop, tablet, and mobile

## Quick Start

1. **Clone and start backend**
   ```bash
   git clone <your-repo-url>
   cd canvas-assignment-scheduler
   ```

2. **Start the backend**
   ```bash
   python3 -m venv .venv  
   source .venv/bin/activate
   pip install -r requirements.txt
   python main.py
   ```

2. **Start frontend** (new terminal)
   ```bash
   cd frontend
   pnpm install
   pnpm start
   ```

3. **Open** `http://localhost:3000`

## Tech Stack

- **Frontend**: React with TypeScript
- **Backend**: FastAPI (Python)
- **Styling**: Custom CSS utilities
- **Icons**: Lucide React
- **Routing**: React Router

## Prerequisites

- Python 3.7+ (for backend)
- Node.js and pnpm (for frontend)

## Installation & Setup

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the backend server:
   ```bash
   python main.py
   ```

The backend will start on `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm start
   ```

The frontend will start on `http://localhost:3000`

## How to Use

1. **Get Canvas API Token**:
   - Canvas → Account → Settings → Approved Integrations → New Access Token
   - Copy the token (you won't see it again!)

2. **Use the App**:
   - Enter Canvas URL (e.g., `https://your-university.instructure.com`)
   - Paste API token
   - Browse assignments and add to Google Calendar!

## Tech Stack

- **Frontend**: React with TypeScript
- **Backend**: FastAPI (Python)
- **Security**: Rate limiting, error handling, retry mechanisms

## Prerequisites

- Python 3.7+
- Node.js and npm

## Security

### Backend Deployment (Heroku/ Railway/ Render)

1. Create a `Procfile` in the backend directory:
   ```
   web: uvicorn main:app --host=0.0.0.0 --port=$PORT
   ```

2. Update CORS settings in `main.py`:
   ```python
   allow_origins=["https://your-frontend-domain.com"]
   ```

### Frontend Deployment (Vercel/ Netlify)

1. Build the project:
   ```bash
   pnpm run build
   ```

2. Deploy the `build` folder to your hosting platform

3. Update the `API_BASE` constant in `App.tsx` to point to your deployed backend

## Development

### Project Structure
```
canvas-assignment-scheduler/
├── backend/
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── index.css
│   ├── package.json
│   └── public/
└── README.md
```

### Adding Features

- **New API endpoints**: Add to `backend/main.py`
- **New UI components**: Add to `frontend/src/App.tsx`
- **Styling**: Add to `frontend/src/index.css`

## License

This project is open source and available under the MIT License.
