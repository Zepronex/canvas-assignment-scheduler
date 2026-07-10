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

## Chrome Extension Permissions

The Chrome extension stores the Canvas URL and API token in `chrome.storage.local`. Host access is optional: when `Test connection` is clicked, Chrome requests permission only for the exact HTTPS Canvas origin entered. That permission lets the extension call `GET /api/v1/users/self` with the local token; assignment fetching is not implemented yet.

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: FastAPI + Python
- **Package Manager**: pnpm

## License

MIT
