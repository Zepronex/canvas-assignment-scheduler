import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, BookOpen, CheckCircle, AlertCircle, Filter, ChevronRight, ArrowRight, Info } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

interface Course {
  id: number;
  name: string;
  course_code: string;
}

interface Assignment {
  id: number;
  name: string;
  course_name: string;
  course_id: number;
  due_at: string | null;
  due_date_formatted: string | null;
  points_possible: number;
  html_url: string;
  description: string;
  submission_types: string[];
}

interface UserInfo {
  id: number;
  name: string;
  email: string;
  login_id: string;
}

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <BookOpen className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Canvas Assignment Scheduler</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Never Miss Another Canvas Assignment
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            A simple tool that checks your upcoming Canvas deadlines and lets you schedule them in Google Calendar with just one click. 
            Stay organized and never lose track of your assignments again.
          </p>
          
          <button
            onClick={() => navigate('/setup')}
            className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            Get Started
            <ArrowRight className="ml-2 w-5 h-5" />
          </button>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Automatic Sync</h3>
            <p className="text-gray-600">Connect your Canvas account and automatically fetch all your upcoming assignments across all courses.</p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">One-Click Scheduling</h3>
            <p className="text-gray-600">Add any assignment to your Google Calendar with a single click, complete with course details and Canvas links.</p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Filter className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Organization</h3>
            <p className="text-gray-600">Filter by course, sort by due date, and get visual indicators for urgent assignments and overdue work.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SetupPage() {
  const navigate = useNavigate();
  const [canvasToken, setCanvasToken] = useState('');
  const [canvasUrl, setCanvasUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canvasToken.trim() || !canvasUrl.trim()) {
      setError('Please provide both Canvas token and URL');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const validateResponse = await fetch(`${API_BASE}/validate-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          canvas_url: canvasUrl,
          canvas_token: canvasToken
        })
      });

      const validateData = await validateResponse.json();

      if (!validateData.valid) {
        setError(validateData.error || 'Invalid credentials. Please check your Canvas URL and API token.');
        return;
      }

      localStorage.setItem('canvasToken', canvasToken);
      localStorage.setItem('canvasUrl', canvasUrl);
      
      navigate('/app');
    } catch (err) {
      setError('Failed to validate credentials. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <BookOpen className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Canvas Assignment Scheduler</h1>
            </div>
            <button
              onClick={() => navigate('/')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Back to Home
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Connect Your Canvas Account</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Canvas URL
              </label>
              <input
                type="url"
                value={canvasUrl}
                onChange={(e) => setCanvasUrl(e.target.value)}
                placeholder="https://your-university.instructure.com"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter your university's Canvas URL (e.g., https://your-university.instructure.com)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Canvas API Token
              </label>
              <input
                type="password"
                value={canvasToken}
                onChange={(e) => setCanvasToken(e.target.value)}
                placeholder="Enter your Canvas API token"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              
              <div className="mt-3 p-4 bg-blue-50 rounded-md">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-2">How to get your Canvas API token:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Log into your Canvas account</li>
                      <li>Go to <strong>Account</strong> → <strong>Settings</strong></li>
                      <li>Scroll down to <strong>Approved Integrations</strong></li>
                      <li>Click <strong>New Access Token</strong></li>
                      <li>Give it a name (e.g., "Assignment Scheduler")</li>
                      <li>Set expiration to <strong>Never</strong> or choose a date</li>
                      <li>Click <strong>Generate Token</strong></li>
                      <li>Copy the token and paste it above</li>
                    </ol>
                    <p className="mt-2 text-xs">
                      <strong>Note:</strong> Keep this token secure and don't share it with others.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Connecting...' : 'Connect to Canvas'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function MainApp() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'course'>('date');
  const [showPastDue, setShowPastDue] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const canvasToken = localStorage.getItem('canvasToken');
      const canvasUrl = localStorage.getItem('canvasUrl');
      
      if (!canvasToken || !canvasUrl) {
        throw new Error('No credentials found. Please go back to setup.');
      }

      const credentials = {
        canvas_url: canvasUrl,
        canvas_token: canvasToken
      };

      const [userRes, coursesRes, assignmentsRes] = await Promise.all([
        fetch(`${API_BASE}/user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials)
        }),
        fetch(`${API_BASE}/courses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials)
        }),
        fetch(`${API_BASE}/assignments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials)
        })
      ]);

      if (!userRes.ok || !coursesRes.ok || !assignmentsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const userData = await userRes.json();
      const coursesData = await coursesRes.json();
      const assignmentsData = await assignmentsRes.json();

      setUser(userData);
      setCourses(coursesData);
      setAssignments(assignmentsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAssignments = () => {
    let filtered = assignments;
    
    if (selectedCourse) {
      filtered = filtered.filter(a => a.course_id === selectedCourse);
    }
    
    if (!showPastDue) {
      filtered = filtered.filter(a => {
        if (!a.due_at) return true;
        return new Date(a.due_at) >= new Date();
      });
    }
    
    return filtered.sort((a, b) => {
      if (sortBy === 'date') {
        if (!a.due_at) return 1;
        if (!b.due_at) return -1;
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      } else {
        return a.course_name.localeCompare(b.course_name);
      }
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays <= 7) return `Due in ${diffDays} days`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getDateColor = (dateString: string | null) => {
    if (!dateString) return 'text-gray-500';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'text-red-600';
    if (diffDays <= 1) return 'text-orange-600';
    if (diffDays <= 3) return 'text-yellow-600';
    return 'text-green-600';
  };

  const addToGoogleCalendar = (assignment: Assignment) => {
    if (!assignment.due_at) return;
    
    const date = new Date(assignment.due_at);
    const endDate = new Date(date.getTime() + 60 * 60 * 1000);
    
    const formatDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    
    const details = `Assignment: ${assignment.name}\nCourse: ${assignment.course_name}\nPoints: ${assignment.points_possible || 'N/A'}\nCanvas Link: ${assignment.html_url}`;
    
    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.append('action', 'TEMPLATE');
    url.searchParams.append('text', `${assignment.name} - ${assignment.course_name}`);
    url.searchParams.append('dates', `${formatDate(date)}/${formatDate(endDate)}`);
    url.searchParams.append('details', details);
    
    window.open(url.toString(), '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your assignments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
          <p className="text-red-800 text-center">{error}</p>
          <button onClick={fetchData} className="mt-4 w-full bg-red-600 text-white py-2 rounded hover:bg-red-700">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const filteredAssignments = getFilteredAssignments();
  const upcomingCount = assignments.filter(a => a.due_at && new Date(a.due_at) >= new Date()).length;
  const overdueCount = assignments.filter(a => a.due_at && new Date(a.due_at) < new Date()).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <BookOpen className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Canvas Assignment Manager</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Welcome back,</p>
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              </div>
              <User className="w-8 h-8 text-gray-400" />
              <button
                onClick={() => {
                  localStorage.removeItem('canvasToken');
                  localStorage.removeItem('canvasUrl');
                  window.location.href = '/setup';
                }}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Change Credentials
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Assignments</p>
                <p className="text-2xl font-semibold text-gray-900">{assignments.length}</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-2xl font-semibold text-green-600">{upcomingCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-semibold text-red-600">{overdueCount}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-80">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                <select 
                  value={selectedCourse || ''} 
                  onChange={(e) => setSelectedCourse(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Courses</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.course_code ? `${course.course_code} - ${course.name}` : course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={sortBy === 'date'}
                      onChange={() => setSortBy('date')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Due Date</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={sortBy === 'course'}
                      onChange={() => setSortBy('course')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Course Name</span>
                  </label>
                </div>
              </div>

              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showPastDue}
                    onChange={(e) => setShowPastDue(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Show overdue assignments</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  Assignments ({filteredAssignments.length})
                </h2>
              </div>
              
              <div className="divide-y">
                {filteredAssignments.length === 0 ? (
                  <div className="px-6 py-12 text-center text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No assignments found</p>
                  </div>
                ) : (
                  filteredAssignments.map(assignment => (
                    <div key={assignment.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-base font-medium text-gray-900 mb-1">
                            {assignment.name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">{assignment.course_name}</p>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className={`flex items-center ${getDateColor(assignment.due_at)}`}>
                              <Clock className="w-4 h-4 mr-1" />
                              {formatDate(assignment.due_at)}
                            </span>
                            {assignment.points_possible && (
                              <span className="text-gray-500">
                                {assignment.points_possible} points
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {assignment.due_at && (
                            <button
                              onClick={() => addToGoogleCalendar(assignment)}
                              className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <Calendar className="w-4 h-4 mr-1" />
                              Add to Calendar
                            </button>
                          )}
                          <a
                            href={assignment.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            View in Canvas
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/app" element={<MainApp />} />
      </Routes>
    </Router>
  );
}