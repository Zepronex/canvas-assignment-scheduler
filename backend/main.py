from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
from typing import List
from datetime import datetime
import os
import time
import logging
from dotenv import load_dotenv
from pydantic import BaseModel

# set up logging for better debugging and monitoring
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# load environment variables from .env file
load_dotenv()

# initialize fastapi application
app = FastAPI()

# configure cors to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# rate limiting storage (in production, use redis)
rate_limit_storage = {}
RATE_LIMIT_WINDOW = 60  # 1 minute window
RATE_LIMIT_MAX_REQUESTS = 30  # 30 requests per minute per ip

# simple rate limiting middleware
@app.middleware("http")
async def rate_limit_middleware(request, call_next):
    # get client ip address
    client_ip = request.client.host
    
    # clean old entries (older than 1 minute)
    current_time = time.time()
    if client_ip in rate_limit_storage:
        rate_limit_storage[client_ip] = [
            req_time for req_time in rate_limit_storage[client_ip]
            if current_time - req_time < RATE_LIMIT_WINDOW
        ]
    else:
        rate_limit_storage[client_ip] = []
    
    # check if client has exceeded rate limit
    if len(rate_limit_storage[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=429,
            content={
                "error": "Rate limit exceeded",
                "message": "Too many requests. Please try again later.",
                "retry_after": RATE_LIMIT_WINDOW
            }
        )
    
    # add current request timestamp
    rate_limit_storage[client_ip].append(current_time)
    
    # process the request
    response = await call_next(request)
    return response

# data model for canvas api credentials
class CanvasCredentials(BaseModel):
    canvas_url: str
    canvas_token: str


def make_canvas_request_with_retry(url: str, headers: dict, params: dict = None, max_retries: int = 3):
    """
    make a request to canvas api with automatic retry on failure.
    
    this function implements exponential backoff retry logic to handle temporary
    network issues, rate limiting, and server errors gracefully.
    
    Args:
        url: the canvas api endpoint url
        headers: http headers including authorization
        params: query parameters for the request
        max_retries: maximum number of retry attempts (default: 3)
    
    Returns:
        requests.Response: the successful response from canvas api
        
    Raises:
        HTTPException: for various error conditions with specific error messages
    """
    # try the request up to max_retries + 1 times
    for attempt in range(max_retries + 1):
        try:
            # make the http request with a 30-second timeout
            response = requests.get(url, headers=headers, params=params, timeout=30)
            
            # handle successful response
            if response.status_code == 200:
                return response
            
            # handle authentication errors (no retry needed)
            elif response.status_code == 401:
                raise HTTPException(
                    status_code=401, 
                    detail="Invalid Canvas credentials. Please check your API token and URL."
                )
            elif response.status_code == 403:
                raise HTTPException(
                    status_code=403, 
                    detail="Access denied. Your API token may not have sufficient permissions."
                )
            elif response.status_code == 404:
                raise HTTPException(
                    status_code=404, 
                    detail="Canvas resource not found. Please check your Canvas URL."
                )
            
            # handle rate limiting with retry
            elif response.status_code == 429:
                retry_after = int(response.headers.get('Retry-After', 60))
                if attempt < max_retries:
                    logger.warning(f"Rate limited, retrying in {retry_after} seconds...")
                    time.sleep(retry_after)
                    continue
                else:
                    raise HTTPException(
                        status_code=429, 
                        detail=f"Canvas API rate limit exceeded. Please try again in {retry_after} seconds."
                    )
            
            # handle server errors with exponential backoff retry
            elif response.status_code >= 500:
                if attempt < max_retries:
                    delay = 2 ** attempt  # exponential backoff: 1, 2, 4 seconds
                    logger.warning(f"Canvas API error {response.status_code}, retrying in {delay}s...")
                    time.sleep(delay)
                    continue
                else:
                    raise HTTPException(
                        status_code=response.status_code, 
                        detail="Canvas server error. Please try again later."
                    )
            
            # handle other http errors
            else:
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"Canvas API error: {response.status_code} - {response.text}"
                )
                
        # handle network timeout errors
        except requests.exceptions.Timeout:
            if attempt < max_retries:
                delay = 2 ** attempt
                logger.warning(f"Request timeout, retrying in {delay}s...")
                time.sleep(delay)
                continue
            else:
                raise HTTPException(
                    status_code=408, 
                    detail="Request timeout. Canvas server is not responding."
                )
        
        # handle connection errors (network issues)
        except requests.exceptions.ConnectionError:
            if attempt < max_retries:
                delay = 2 ** attempt
                logger.warning(f"Connection error, retrying in {delay}s...")
                time.sleep(delay)
                continue
            else:
                raise HTTPException(
                    status_code=503, 
                    detail="Cannot connect to Canvas. Please check your internet connection."
                )
        
        # handle other request-related errors
        except requests.exceptions.RequestException as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Network error: {str(e)}"
            )
    
    # if we've exhausted all retry attempts
    raise HTTPException(
        status_code=500, 
        detail="Max retries exceeded. Please try again later."
    )

# api root endpoint - provides basic information about the service
@app.get("/")
def read_root():
    return {
        "message": "Canvas Assignment Scheduler API v2.0",
        "features": [
            "Enhanced error handling with retry mechanisms",
            "Rate limiting and DDoS protection (30 requests/minute per IP)",
            "Upcoming assignments endpoint for bulk operations",
            "Better Canvas API integration",
            "Improved logging and debugging"
        ]
    }

# health check endpoint (not rate limited)
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "rate_limit_info": {
            "window_seconds": RATE_LIMIT_WINDOW,
            "max_requests": RATE_LIMIT_MAX_REQUESTS
        }
    }

# validate canvas credentials by attempting to fetch user information
@app.post("/api/validate-credentials")
def validate_credentials(credentials: CanvasCredentials):
    try:
        # set up headers for canvas api request
        headers = {
            "Authorization": f"Bearer {credentials.canvas_token}",
            "User-Agent": "Canvas-Assignment-Scheduler/2.0"
        }
        
        # test the credentials by fetching user info
        response = make_canvas_request_with_retry(
            f"{credentials.canvas_url}/api/v1/users/self",
            headers
        )
        
        # extract user data from successful response
        user_data = response.json()
        return {
            "valid": True,
            "user": {
                "id": user_data.get("id"),
                "name": user_data.get("name"),
                "email": user_data.get("primary_email")
            }
        }
            
    except HTTPException as e:
        # return validation failure with specific error message
        return {"valid": False, "error": e.detail}
    except Exception as e:
        # log unexpected errors and return generic message
        logger.error(f"Unexpected error in validate_credentials: {str(e)}")
        return {"valid": False, "error": "An unexpected error occurred. Please try again."}

# get current user information from canvas
@app.post("/api/user")
def get_user(credentials: CanvasCredentials):
    try:
        # set up headers for canvas api request
        headers = {
            "Authorization": f"Bearer {credentials.canvas_token}",
            "User-Agent": "Canvas-Assignment-Scheduler/2.0"
        }
        
        # fetch user information from canvas
        response = make_canvas_request_with_retry(
            f"{credentials.canvas_url}/api/v1/users/self",
            headers
        )
        
        # parse and return user data
        user_data = response.json()
        return {
            "id": user_data.get("id"),
            "name": user_data.get("name"),
            "email": user_data.get("primary_email")
        }
    except HTTPException:
        # re-raise http exceptions (they already have proper error messages)
        raise
    except Exception as e:
        # log unexpected errors and return generic message
        logger.error(f"Unexpected error in get_user: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again.")

# get all active courses for the authenticated user
@app.post("/api/courses")
def get_courses(credentials: CanvasCredentials):
    try:
        # set up headers for canvas api request
        headers = {
            "Authorization": f"Bearer {credentials.canvas_token}",
            "User-Agent": "Canvas-Assignment-Scheduler/2.0"
        }
        
        # fetch courses from canvas api
        response = make_canvas_request_with_retry(
            f"{credentials.canvas_url}/api/v1/courses",
            headers,
            params={
                "enrollment_state": "active",  # only get courses the user is actively enrolled in
                "per_page": 100  # get up to 100 courses per request
            }
        )
        
        # parse course data and filter out date-restricted courses
        courses = response.json()
        return [
            {
                "id": course.get("id"),
                "name": course.get("name"),
                "course_code": course.get("course_code")
            }
            for course in courses
            if not course.get("access_restricted_by_date")  # skip courses with date restrictions
        ]
    except HTTPException:
        # re-raise http exceptions (they already have proper error messages)
        raise
    except Exception as e:
        # log unexpected errors and return generic message
        logger.error(f"Unexpected error in get_courses: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again.")

# get all assignments across all courses for the authenticated user
@app.post("/api/assignments")
def get_all_assignments(credentials: CanvasCredentials):
    try:
        # set up headers for canvas api request
        headers = {
            "Authorization": f"Bearer {credentials.canvas_token}",
            "User-Agent": "Canvas-Assignment-Scheduler/2.0"
        }
        
        # first, get all active courses
        courses_response = make_canvas_request_with_retry(
            f"{credentials.canvas_url}/api/v1/courses",
            headers,
            params={
                "enrollment_state": "active",
                "per_page": 100
            }
        )
        courses = courses_response.json()
        
        all_assignments = []
        
        # fetch assignments for each course
        for course in courses:
            # skip courses with date restrictions
            if course.get("access_restricted_by_date"):
                continue
                
            course_id = course["id"]
            try:
                # get assignments for this specific course
                response = make_canvas_request_with_retry(
                    f"{credentials.canvas_url}/api/v1/courses/{course_id}/assignments",
                    headers,
                    params={
                        "per_page": 100,
                        "order_by": "due_at"  # sort by due date
                    }
                )
                
                # process assignments and filter out quiz assignments
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
            except HTTPException as e:
                # log warning but continue with other courses
                logger.warning(f"Failed to fetch assignments for course {course_id}: {e.detail}")
                continue
        
        return all_assignments
    except HTTPException:
        # re-raise http exceptions (they already have proper error messages)
        raise
    except Exception as e:
        # log unexpected errors and return generic message
        logger.error(f"Unexpected error in get_all_assignments: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again.")

# get assignments for a specific course
@app.post("/api/assignments/{course_id}")
def get_course_assignments(course_id: int, credentials: CanvasCredentials):
    try:
        # set up headers for canvas api request
        headers = {
            "Authorization": f"Bearer {credentials.canvas_token}",
            "User-Agent": "Canvas-Assignment-Scheduler/2.0"
        }
        
        # fetch assignments for the specified course
        response = make_canvas_request_with_retry(
            f"{credentials.canvas_url}/api/v1/courses/{course_id}/assignments",
            headers,
            params={
                "per_page": 100,
                "order_by": "due_at"  # sort by due date
            }
        )
        
        # parse assignments and filter out quiz assignments
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
            if not assignment.get("is_quiz_assignment")  # skip quiz assignments
        ]
    except HTTPException:
        # re-raise http exceptions (they already have proper error messages)
        raise
    except Exception as e:
        # log unexpected errors and return generic message
        logger.error(f"Unexpected error in get_course_assignments: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again.")

# get only upcoming assignments for bulk operations like "select all upcoming"
@app.post("/api/assignments/upcoming")
def get_upcoming_assignments(credentials: CanvasCredentials):
    try:
        # set up headers for canvas api request
        headers = {
            "Authorization": f"Bearer {credentials.canvas_token}",
            "User-Agent": "Canvas-Assignment-Scheduler/2.0"
        }
        
        # first, get all active courses
        courses_response = make_canvas_request_with_retry(
            f"{credentials.canvas_url}/api/v1/courses",
            headers,
            params={
                "enrollment_state": "active",
                "per_page": 100
            }
        )
        courses = courses_response.json()
        
        upcoming_assignments = []
        current_time = datetime.now()
        
        # fetch assignments for each course and filter for upcoming ones
        for course in courses:
            if course.get("access_restricted_by_date"):
                continue
                
            course_id = course["id"]
            try:
                # get assignments for this specific course
                response = make_canvas_request_with_retry(
                    f"{credentials.canvas_url}/api/v1/courses/{course_id}/assignments",
                    headers,
                    params={
                        "per_page": 100,
                        "order_by": "due_at"
                    }
                )
                
                # process assignments and filter for upcoming ones only
                assignments = response.json()
                for assignment in assignments:
                    if not assignment.get("is_quiz_assignment") and assignment.get("due_at"):
                        # check if assignment is upcoming (due date is in the future)
                        due_date = datetime.fromisoformat(assignment["due_at"].replace('Z', '+00:00'))
                        if due_date > current_time:
                            upcoming_assignments.append({
                                "id": assignment.get("id"),
                                "name": assignment.get("name"),
                                "course_name": course["name"],
                                "course_id": course_id,
                                "due_at": assignment.get("due_at"),
                                "points_possible": assignment.get("points_possible"),
                                "html_url": assignment.get("html_url")
                            })
            except HTTPException as e:
                # log warning but continue with other courses
                logger.warning(f"Failed to fetch assignments for course {course_id}: {e.detail}")
                continue
        
        return {
            "assignments": upcoming_assignments,
            "count": len(upcoming_assignments)
        }
    except HTTPException:
        # re-raise http exceptions (they already have proper error messages)
        raise
    except Exception as e:
        # log unexpected errors and return generic message
        logger.error(f"Unexpected error in get_upcoming_assignments: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again.")

# start the server when running this file directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)