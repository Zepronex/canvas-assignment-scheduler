from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import requests
import os
from dotenv import load_dotenv
from datetime import datetime
from typing import List, Dict, Any

# Load environment variables
load_dotenv()

app = FastAPI(title="Canvas Assignment Manager", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Canvas API configuration
CANVAS_TOKEN = os.getenv('CANVAS_API_TOKEN')
CANVAS_BASE_URL = os.getenv('CANVAS_BASE_URL')

def get_canvas_headers():
    return {
        'Authorization': f'Bearer {CANVAS_TOKEN}',
        'Content-Type': 'application/json'
    }

@app.get("/")
async def root():
    return {"message": "Canvas Assignment Manager API", "status": "running"}

@app.get("/api/courses")
async def get_courses():
    """Get all courses for the authenticated user"""
    try:
        headers = get_canvas_headers()
        response = requests.get(f'{CANVAS_BASE_URL}/courses', headers=headers)
        
        if response.status_code == 200:
            courses = response.json()
            # Filter and clean course data
            cleaned_courses = []
            for course in courses:
                cleaned_courses.append({
                    'id': course.get('id'),
                    'name': course.get('name'),
                    'course_code': course.get('course_code'),
                    'enrollment_term_id': course.get('enrollment_term_id'),
                    'start_at': course.get('start_at'),
                    'end_at': course.get('end_at')
                })
            return {"courses": cleaned_courses}
        else:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch courses")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/assignments")
async def get_all_assignments():
    """Get all assignments from all courses"""
    try:
        headers = get_canvas_headers()
        
        # First get all courses
        courses_response = requests.get(f'{CANVAS_BASE_URL}/courses', headers=headers)
        if courses_response.status_code != 200:
            raise HTTPException(status_code=courses_response.status_code, detail="Failed to fetch courses")
        
        courses = courses_response.json()
        all_assignments = []
        
        # Get assignments for each course
        for course in courses:
            course_id = course.get('id')
            course_name = course.get('name', 'Unknown Course')
            
            assignments_response = requests.get(
                f'{CANVAS_BASE_URL}/courses/{course_id}/assignments', 
                headers=headers
            )
            
            if assignments_response.status_code == 200:
                assignments = assignments_response.json()
                
                for assignment in assignments:
                    # Parse due date
                    due_at = assignment.get('due_at')
                    due_date_formatted = None
                    if due_at:
                        try:
                            due_date = datetime.fromisoformat(due_at.replace('Z', '+00:00'))
                            due_date_formatted = due_date.strftime('%Y-%m-%d %H:%M')
                        except:
                            due_date_formatted = due_at
                    
                    all_assignments.append({
                        'id': assignment.get('id'),
                        'name': assignment.get('name'),
                        'description': assignment.get('description', ''),
                        'due_at': due_at,
                        'due_date_formatted': due_date_formatted,
                        'points_possible': assignment.get('points_possible'),
                        'course_id': course_id,
                        'course_name': course_name,
                        'html_url': assignment.get('html_url'),
                        'submission_types': assignment.get('submission_types', [])
                    })
        
        # Sort assignments by due date (upcoming first)
        all_assignments.sort(key=lambda x: x['due_at'] or '9999-12-31', reverse=False)
        
        return {"assignments": all_assignments, "total": len(all_assignments)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/assignments/{course_id}")
async def get_course_assignments(course_id: int):
    """Get assignments for a specific course"""
    try:
        headers = get_canvas_headers()
        response = requests.get(
            f'{CANVAS_BASE_URL}/courses/{course_id}/assignments', 
            headers=headers
        )
        
        if response.status_code == 200:
            assignments = response.json()
            return {"assignments": assignments}
        else:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch assignments")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user")
async def get_user_info():
    """Get current user information"""
    try:
        headers = get_canvas_headers()
        response = requests.get(f'{CANVAS_BASE_URL}/users/self', headers=headers)
        
        if response.status_code == 200:
            user = response.json()
            return {
                "name": user.get('name'),
                "login_id": user.get('login_id'),
                "email": user.get('email'),
                "id": user.get('id')
            }
        else:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch user info")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
