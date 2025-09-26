# Canvas Assignment Scheduler

A simple web app that fetches Canvas assignments and lets you schedule them in Google Calendar with one click.

## Quick Start

1. **Backend**
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   python main.py
   ```

2. **Frontend**
   ```bash
   cd frontend
   pnpm install
   pnpm start
   ```

3. Open `http://localhost:3000`

## Features

- **One-click setup**: Connect with Canvas API token
- **Assignment overview**: View all assignments across courses
- **Bulk calendar scheduling**: Select multiple assignments and add to Google Calendar
- **Smart filtering**: Filter by course, due date status, and sort options
- **Rate limiting**: DDoS protection (30 requests/minute per IP)

## How to Use

1. Get Canvas API token: Account → Settings → Approved Integrations → New Access Token
2. Enter Canvas URL (e.g., `https://your-university.instructure.com`)
3. Browse assignments and add to Google Calendar

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: FastAPI + Python
- **Package Manager**: pnpm

## License

MIT