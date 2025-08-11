from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
from typing import List, Optional
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Canvas API configuration
CANVAS_API_TOKEN = os.getenv("CANVAS_API_TOKEN")
CANVAS_BASE_URL = os.getenv("CANVAS_BASE_URL", "https://his.instructure.com")
HEADERS = {
    "Authorization": f"Bearer {CANVAS_API_TOKEN}"
}

@app.get("/")
def read_root():
    return {"message": "Canvas Assignment Manager API"}

@app.get("/api/user")
def get_user():
    """Get current user information"""
    try:
        response = requests.get(
            f"{CANVAS_BASE_URL}/api/v1/users/self",
            headers=HEADERS
        )
        response.raise_for_status()
        user_data = response.json()
        return {
            "id": user_data.get("id"),
            "name": user_data.get("name"),
            "email": user_data.get("primary_email")
        }
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/courses")
def get_courses():
    """Get all active courses for the user"""
    try:
        response = requests.get(
            f"{CANVAS_BASE_URL}/api/v1/courses",
            headers=HEADERS,
            params={
                "enrollment_state": "active",
                "per_page": 100
            }
        )
        response.raise_for_status()
        courses = response.json()
        return [
            {
                "id": course.get("id"),
                "name": course.get("name"),
                "course_code": course.get("course_code")
            }
            for course in courses
            if not course.get("access_restricted_by_date")
        ]
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/assignments")
def get_all_assignments():
    """Get all assignments across all courses"""
    try:
        # First get all courses
        courses = get_courses()
        all_assignments = []
        
        for course in courses:
            course_id = course["id"]
            response = requests.get(
                f"{CANVAS_BASE_URL}/api/v1/courses/{course_id}/assignments",
                headers=HEADERS,
                params={
                    "per_page": 100,
                    "order_by": "due_at"
                }
            )
            
            if response.status_code == 200:
                assignments = response.json()
                for assignment in assignments:
                    if not assignment.get("is_quiz_assignment"):  # Skip quiz assignments
                        all_assignments.append({
                            "id": assignment.get("id"),
                            "name": assignment.get("name"),
                            "course_name": course["name"],
                            "course_id": course_id,
                            "due_at": assignment.get("due_at"),
                            "points_possible": assignment.get("points_possible"),
                            "html_url": assignment.get("html_url")
                        })
        
        return all_assignments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/assignments/{course_id}")
def get_course_assignments(course_id: int):
    """Get assignments for a specific course"""
    try:
        response = requests.get(
            f"{CANVAS_BASE_URL}/api/v1/courses/{course_id}/assignments",
            headers=HEADERS,
            params={
                "per_page": 100,
                "order_by": "due_at"
            }
        )
        response.raise_for_status()
        assignments = response.json()
        
        return [
            {
                "id": assignment.get("id"),
                "name": assignment.get("name"),
                "due_at": assignment.get("due_at"),
                "points_possible": assignment.get("points_possible"),
                "html_url": assignment.get("html_url")
            }
            for assignment in assignments
            if not assignment.get("is_quiz_assignment")
        ]
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)