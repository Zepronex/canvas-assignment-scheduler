from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
from typing import List
from datetime import datetime
import os
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CanvasCredentials(BaseModel):
    canvas_url: str
    canvas_token: str

@app.get("/")
def read_root():
    return {"message": "Canvas Assignment Manager API"}

@app.post("/api/validate-credentials")
def validate_credentials(credentials: CanvasCredentials):
    try:
        headers = {
            "Authorization": f"Bearer {credentials.canvas_token}"
        }
        
        response = requests.get(
            f"{credentials.canvas_url}/api/v1/users/self",
            headers=headers
        )
        
        if response.status_code == 200:
            user_data = response.json()
            return {
                "valid": True,
                "user": {
                    "id": user_data.get("id"),
                    "name": user_data.get("name"),
                    "email": user_data.get("primary_email")
                }
            }
        else:
            return {"valid": False, "error": "Invalid credentials"}
            
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/user")
def get_user(credentials: CanvasCredentials):
    try:
        headers = {
            "Authorization": f"Bearer {credentials.canvas_token}"
        }
        
        response = requests.get(
            f"{credentials.canvas_url}/api/v1/users/self",
            headers=headers
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

@app.post("/api/courses")
def get_courses(credentials: CanvasCredentials):
    try:
        headers = {
            "Authorization": f"Bearer {credentials.canvas_token}"
        }
        
        response = requests.get(
            f"{credentials.canvas_url}/api/v1/courses",
            headers=headers,
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

@app.post("/api/assignments")
def get_all_assignments(credentials: CanvasCredentials):
    try:
        headers = {
            "Authorization": f"Bearer {credentials.canvas_token}"
        }
        
        courses_response = requests.get(
            f"{credentials.canvas_url}/api/v1/courses",
            headers=headers,
            params={
                "enrollment_state": "active",
                "per_page": 100
            }
        )
        courses_response.raise_for_status()
        courses = courses_response.json()
        
        all_assignments = []
        
        for course in courses:
            if course.get("access_restricted_by_date"):
                continue
                
            course_id = course["id"]
            response = requests.get(
                f"{credentials.canvas_url}/api/v1/courses/{course_id}/assignments",
                headers=headers,
                params={
                    "per_page": 100,
                    "order_by": "due_at"
                }
            )
            
            if response.status_code == 200:
                assignments = response.json()
                for assignment in assignments:
                    if not assignment.get("is_quiz_assignment"):
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

@app.post("/api/assignments/{course_id}")
def get_course_assignments(course_id: int, credentials: CanvasCredentials):
    try:
        headers = {
            "Authorization": f"Bearer {credentials.canvas_token}"
        }
        
        response = requests.get(
            f"{credentials.canvas_url}/api/v1/courses/{course_id}/assignments",
            headers=headers,
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