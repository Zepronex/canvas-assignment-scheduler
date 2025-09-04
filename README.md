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
   cd canvas-assignment-scheduler/backend
   pip install -r requirements.txt
   python main.py
   ```

2. **Start frontend** (new terminal)
   ```bash
   cd frontend
   npm install
   npm start
   ```

3. **Open** `http://localhost:3000`

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

- API tokens stored in localStorage only
- No third-party data sharing
- Rate limiting prevents abuse
- All communication between your browser and Canvas