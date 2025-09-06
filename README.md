# Canvas Assignment Scheduler

A web application that helps students manage and organize their Canvas LMS assignments. The app fetches upcoming deadlines from Canvas and allows users to schedule them in Google Calendar with a single click.

## Features

- **Landing Page**: Beautiful introduction explaining what the tool does
- **Easy Setup**: Simple form to input Canvas URL and API token with step-by-step instructions
- **Assignment Overview**: View all assignments across all courses in one place
- **Smart Filtering**: Filter by course, sort by due date or course name
- **Visual Indicators**: Color-coded due dates (green for upcoming, yellow for soon, red for overdue)
- **One-Click Calendar Integration**: Add any assignment to Google Calendar with course details and Canvas links
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Quick Start

1. **Clone the repository**
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

3. **Start the frontend** (in a new terminal)
   ```bash
   cd frontend
   pnpm install
   pnpm start
   ```

4. **Open your browser** to `http://localhost:3000`

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

1. **Get Your Canvas API Token**:
   - Log into your Canvas account
   - Go to Account → Settings
   - Scroll down to "Approved Integrations"
   - Click "New Access Token"
   - Give it a name (e.g., "Assignment Scheduler")
   - Set expiration to "Never" or choose a date
   - Click "Generate Token"
   - Copy the token (you won't see it again!)

2. **Use the Application**:
   - Open the application in your browser
   - Click "Get Started" on the landing page
   - Enter your Canvas URL (e.g., `https://your-university.instructure.com`)
   - Paste your API token
   - Click "Connect to Canvas"
   - Browse your assignments and add them to Google Calendar!

## API Endpoints

- `POST /api/validate-credentials` - Validate Canvas credentials
- `POST /api/user` - Get current user information
- `POST /api/courses` - Get all active courses
- `POST /api/assignments` - Get all assignments across courses
- `POST /api/assignments/{course_id}` - Get assignments for a specific course

## Security Notes

- API tokens are stored in localStorage (client-side only)
- No tokens are sent to any third-party services
- All communication is between your browser and your Canvas instance
- You can change credentials at any time using the "Change Credentials" button

## Deployment

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
