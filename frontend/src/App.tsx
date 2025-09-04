import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Clock, BookOpen, CheckCircle, AlertCircle, Filter, ChevronRight, ArrowRight, Info, Github, Linkedin } from 'lucide-react';

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

function Navigation({ isAuthenticated }: { isAuthenticated: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Check if user actually has valid credentials (not just on authenticated page)
  const hasValidCredentials = localStorage.getItem('canvasToken') && localStorage.getItem('canvasUrl');

  const menuItems = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    ...(hasValidCredentials ? [{ name: 'Assignments', path: '/assignments' }] : [])
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleLogOut = () => {
    if (window.confirm('Are you sure you want to log out? This will clear your Canvas credentials.')) {
      localStorage.removeItem('canvasToken');
      localStorage.removeItem('canvasUrl');
      localStorage.removeItem('lastActivity');
      localStorage.removeItem('cachedAssignments');
      localStorage.removeItem('cachedCourses');
      localStorage.removeItem('cachedUser');
      localStorage.removeItem('cacheTimestamp');
      window.location.href = '/';
    }
  };

  const handleLogIn = () => {
    window.location.href = '/setup';
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-xl font-semibold text-gray-900">Canvas Assignment Scheduler</h1>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex items-center space-x-8">
            {menuItems.map((item) => (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`text-base font-medium transition-colors ${
                  isActive(item.path)
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {item.name}
              </button>
            ))}
            {hasValidCredentials ? (
              <button
                onClick={handleLogOut}
                className="text-base font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Log Out
              </button>
            ) : (
              <button
                onClick={handleLogIn}
                className="text-base font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Log In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Never Miss Another Canvas Assignment
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            A simple tool that helps you keep track of your Canvas assignments deadlines and schedule them in Google Calendar when you're ready. 
            Take control of your deadlines and never lose track of your assignments again.
          </p>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Manual Organization</h3>
            <p className="text-gray-600">Connect your Canvas account and view all your upcoming assignments across all courses in one place.</p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Bulk Calendar Scheduling</h3>
            <p className="text-gray-600">Select multiple assignments and add them to your Google Calendar all at once, complete with course details and Canvas links.</p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Filter className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Filtering</h3>
            <p className="text-gray-600">Filter by course, due date status, and sort assignments to focus on what matters most to you.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">About Canvas Assignment Scheduler</h1>
          
          <div className="prose max-w-none">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">What is this tool?</h2>
            <p className="text-gray-600 mb-6">
              Canvas Assignment Scheduler (CAS) is a web application designed to help students manage assignment deadlines from their Canvas. It allows users to 
              view and sort them in one place and add them to Google Calendar in bulk. Users can filter assignments by course, due date status and sort them by date or course name. 
               This tool is perfect for students who want to stay organized and never miss a deadline, completely free and open-source.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-4">How does it work?</h2>
            <p className="text-gray-600 mb-6">
              CAS connects to your Canvas account using an API token provided by the user along with a link to the students university canvas. It fetches all assignments across all courses and displays them in a user-friendly interface.
              Users can then select which assignment deadlines to add to their Google Calendar with a single click.
              All data is stored in the user's browser and is never sent to any third-party services, ensuring user privacy.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-4">About the Developer</h2>
            <p className="text-gray-600 mb-6">
              I am a technology enthusiast and student developer passionate about creating applications that solve real-world problems and enhance productivity.
               I built this tool to help students like myself to stay organized in an otherwise hectic academic environment. I am currently pursuing my bachelor's 
               in computer science and always looking for new opportunities to learn and grow as a developer. 
            </p>
            
            <div className="flex space-x-4">
              <a
                href="https://github.com/Zepronex"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Github className="w-4 h-4 mr-2" />
                GitHub
              </a>
              <a
                href="https://www.linkedin.com/in/carl-fredrik-svensson/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Linkedin className="w-4 h-4 mr-2" />
                LinkedIn
              </a>
            </div>
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
      
      navigate('/assignments');
    } catch (err) {
      setError('Failed to validate credentials. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
  const [selectedCourse, setSelectedCourse] = useState<number | null>(() => {
    const saved = localStorage.getItem('selectedCourse');
    return saved ? parseInt(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'course'>(() => {
    const saved = localStorage.getItem('sortBy');
    return (saved as 'date' | 'course') || 'date';
  });
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'overdue' | 'no-date'>(() => {
    const saved = localStorage.getItem('statusFilter');
    return (saved as 'all' | 'upcoming' | 'overdue' | 'no-date') || 'upcoming';
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    const saved = localStorage.getItem('sortOrder');
    return (saved as 'asc' | 'desc') || 'asc';
  });
  const [selectedAssignments, setSelectedAssignments] = useState<Set<number>>(new Set());

  // Functions to save filter state to localStorage
  const updateSortBy = (newSortBy: 'date' | 'course') => {
    setSortBy(newSortBy);
    localStorage.setItem('sortBy', newSortBy);
  };

  const updateStatusFilter = (newStatusFilter: 'all' | 'upcoming' | 'overdue' | 'no-date') => {
    setStatusFilter(newStatusFilter);
    localStorage.setItem('statusFilter', newStatusFilter);
  };

  const updateSortOrder = (newSortOrder: 'asc' | 'desc') => {
    setSortOrder(newSortOrder);
    localStorage.setItem('sortOrder', newSortOrder);
  };

  const updateSelectedCourse = (newSelectedCourse: number | null) => {
    setSelectedCourse(newSelectedCourse);
    if (newSelectedCourse) {
      localStorage.setItem('selectedCourse', newSelectedCourse.toString());
    } else {
      localStorage.removeItem('selectedCourse');
    }
  };

  // Check if we have cached data
  const checkCachedData = () => {
    const cachedUser = localStorage.getItem('cachedUser');
    const cachedCourses = localStorage.getItem('cachedCourses');
    const cachedAssignments = localStorage.getItem('cachedAssignments');
    const cacheTimestamp = localStorage.getItem('cacheTimestamp');
    
    if (cachedUser && cachedCourses && cachedAssignments && cacheTimestamp) {
      const cacheAge = Date.now() - parseInt(cacheTimestamp);
      const cacheValid = cacheAge < 30 * 60 * 1000; // 30 minutes
      
      if (cacheValid) {
        setUser(JSON.parse(cachedUser));
        setCourses(JSON.parse(cachedCourses));
        setAssignments(JSON.parse(cachedAssignments));
        setLoading(false);
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    // Try to load from cache first
    if (!checkCachedData()) {
    fetchData();
    }
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

      // Cache the data
      localStorage.setItem('cachedUser', JSON.stringify(userData));
      localStorage.setItem('cachedCourses', JSON.stringify(coursesData));
      localStorage.setItem('cachedAssignments', JSON.stringify(assignmentsData));
      localStorage.setItem('cacheTimestamp', Date.now().toString());
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
    
    const now = new Date();
    
    switch (statusFilter) {
      case 'all':
        // No filtering needed
        break;
      case 'upcoming':
        filtered = filtered.filter(a => {
          if (!a.due_at) return false;
          return new Date(a.due_at) >= now;
        });
        break;
      case 'overdue':
      filtered = filtered.filter(a => {
          if (!a.due_at) return false;
          return new Date(a.due_at) < now;
      });
        break;
      case 'no-date':
        filtered = filtered.filter(a => !a.due_at);
        break;
    }
    
    return filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'date') {
        if (!a.due_at) comparison = 1;
        else if (!b.due_at) comparison = -1;
        else comparison = new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      } else {
        comparison = a.course_name.localeCompare(b.course_name);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) {
      if (diffHours < 0) return 'Overdue';
      if (diffHours === 0) return 'Due now';
      if (diffHours === 1) return 'Due in 1 hour';
      return `Due in ${diffHours} hours`;
    }
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays < 7) return `Due in ${diffDays} days`;
    if (diffWeeks < 4) return `Due in ${diffWeeks} week${diffWeeks !== 1 ? 's' : ''}`;
    
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

  const getFilterDisplayText = () => {
    const courseText = selectedCourse ? ` in ${courses.find(c => c.id === selectedCourse)?.name || 'Selected Course'}` : '';
    
    switch (statusFilter) {
      case 'all':
        return `All Assignments${courseText}`;
      case 'upcoming':
        return `Upcoming Assignments${courseText}`;
      case 'overdue':
        return `Overdue Assignments${courseText}`;
      case 'no-date':
        return `Assignments with No Due Date${courseText}`;
      default:
        return `Assignments${courseText}`;
    }
  };

  const toggleAssignmentSelection = (assignmentId: number) => {
    const newSelected = new Set(selectedAssignments);
    if (newSelected.has(assignmentId)) {
      newSelected.delete(assignmentId);
    } else {
      newSelected.add(assignmentId);
    }
    setSelectedAssignments(newSelected);
  };

  const selectAllUpcoming = async () => {
    try {
      const canvasToken = localStorage.getItem('canvasToken');
      const canvasUrl = localStorage.getItem('canvasUrl');
      
      if (!canvasToken || !canvasUrl) {
        throw new Error('No credentials found');
      }

      const response = await fetch(`${API_BASE}/assignments/upcoming`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          canvas_url: canvasUrl,
          canvas_token: canvasToken
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch upcoming assignments');
      }

      const data = await response.json();
      const upcomingIds: Set<number> = new Set(data.assignments.map((a: Assignment) => a.id));
      setSelectedAssignments(upcomingIds);
      
      // Show success message
      alert(`Selected ${upcomingIds.size} upcoming assignments`);
    } catch (err) {
      alert('Failed to select upcoming assignments. Please try again.');
    }
  };

  const addSelectedToGoogleCalendar = () => {
    if (selectedAssignments.size === 0) return;

    const selectedAssignmentsList = assignments.filter(a => selectedAssignments.has(a.id));
    
    selectedAssignmentsList.forEach((assignment, index) => {
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
    
      setTimeout(() => {
    window.open(url.toString(), '_blank');
      }, index * 100);
    });

    setSelectedAssignments(new Set());
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
            <p className="text-gray-600">Welcome back, {user?.name}</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={selectAllUpcoming}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              <span className="font-semibold text-sm">Select All Upcoming</span>
            </button>
            <button
              onClick={fetchData}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
            >
              <Calendar className="w-5 h-5 mr-3" />
              <span className="font-semibold text-base">Refresh Data</span>
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 mb-8">
          <div className="flex items-center justify-between">
                         <div className="flex items-center space-x-12">
               <div className="flex items-center space-x-3">
                 <BookOpen className="w-5 h-5 text-blue-500" />
                 <span className="text-sm font-medium text-gray-600">Total:</span>
                 <span className="text-lg font-semibold text-gray-900">{assignments.length}</span>
              </div>
               <div className="flex items-center space-x-3">
                 <CheckCircle className="w-5 h-5 text-green-500" />
                 <span className="text-sm font-medium text-gray-600">Upcoming:</span>
                 <span className="text-lg font-semibold text-green-600">{upcomingCount}</span>
            </div>
               <div className="flex items-center space-x-3">
                 <AlertCircle className="w-5 h-5 text-red-500" />
                 <span className="text-sm font-medium text-gray-600">Overdue:</span>
                 <span className="text-lg font-semibold text-red-600">{overdueCount}</span>
          </div>
               <div className="flex items-center space-x-3">
                 <Clock className="w-5 h-5 text-gray-500" />
                 <span className="text-sm font-medium text-gray-600">No Due Date:</span>
                 <span className="text-lg font-semibold text-gray-600">{assignments.filter(a => !a.due_at).length}</span>
            </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-80">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select 
                  value={statusFilter} 
                  onChange={(e) => updateStatusFilter(e.target.value as 'all' | 'upcoming' | 'overdue' | 'no-date')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="overdue">Overdue</option>
                  <option value="no-date">No Due Date</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                <select 
                  value={selectedCourse || ''} 
                  onChange={(e) => updateSelectedCourse(e.target.value ? Number(e.target.value) : null)}
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
            </div>

            <div className="bg-white rounded-lg shadow p-6 mt-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Sort</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={sortBy === 'date'}
                      onChange={() => updateSortBy('date')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Due Date</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={sortBy === 'course'}
                      onChange={() => updateSortBy('course')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Course Name</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={sortOrder === 'asc'}
                      onChange={() => updateSortOrder('asc')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Increasing (A→Z, 1→9)</span>
                  </label>
                <label className="flex items-center">
                  <input
                      type="radio"
                      checked={sortOrder === 'desc'}
                      onChange={() => updateSortOrder('desc')}
                    className="mr-2"
                  />
                    <span className="text-sm text-gray-700">Decreasing (Z→A, 9→1)</span>
                </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Assignments ({filteredAssignments.length})
                </h2>
                  {selectedAssignments.size > 0 && (
                    <button
                      onClick={addSelectedToGoogleCalendar}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Add {selectedAssignments.size} to Calendar
                    </button>
                  )}
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
                          <div className="flex items-start flex-1">
                            <input
                              type="checkbox"
                              checked={selectedAssignments.has(assignment.id)}
                              onChange={() => toggleAssignmentSelection(assignment.id)}
                              className="mr-3 mt-1"
                            />
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
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
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
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('canvasToken'));

  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(!!localStorage.getItem('canvasToken'));
    };
    checkAuth();
    const interval = setInterval(checkAuth, 1000);
    return () => clearInterval(interval);
  }, []);

  // Session timeout management
  useEffect(() => {
    const checkSessionTimeout = () => {
      const lastActivity = localStorage.getItem('lastActivity');
      if (lastActivity) {
        const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
        const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds
        
        if (timeSinceLastActivity > thirtyMinutes) {
          // Session expired, log out user
          localStorage.removeItem('canvasToken');
          localStorage.removeItem('canvasUrl');
          localStorage.removeItem('lastActivity');
          localStorage.removeItem('cachedAssignments');
          localStorage.removeItem('cachedCourses');
          localStorage.removeItem('cachedUser');
          localStorage.removeItem('cacheTimestamp');
          window.location.href = '/';
        }
      }
    };

    // Update last activity on user interaction
    const updateLastActivity = () => {
      localStorage.setItem('lastActivity', Date.now().toString());
    };

    // Check session timeout every minute
    const sessionInterval = setInterval(checkSessionTimeout, 60000);
    
    // Update last activity on user interactions
    document.addEventListener('click', updateLastActivity);
    document.addEventListener('keypress', updateLastActivity);
    document.addEventListener('scroll', updateLastActivity);

    // Set initial last activity
    if (localStorage.getItem('canvasToken')) {
      updateLastActivity();
    }

    return () => {
      clearInterval(sessionInterval);
      document.removeEventListener('click', updateLastActivity);
      document.removeEventListener('keypress', updateLastActivity);
      document.removeEventListener('scroll', updateLastActivity);
    };
  }, []);

  // Update page title based on current route
  useEffect(() => {
    const path = window.location.pathname;
    let title = 'Canvas Assignment Scheduler';
    
    if (path === '/') title = 'Home - Canvas Assignment Scheduler';
    else if (path === '/about') title = 'About - Canvas Assignment Scheduler';
    else if (path === '/setup') title = 'Setup - Canvas Assignment Scheduler';
    else if (path === '/assignments') title = 'Assignments - Canvas Assignment Scheduler';
    
    document.title = title;
  }, []);

  return (
    <Router>
      <Navigation isAuthenticated={isAuthenticated} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/assignments" element={
          isAuthenticated ? <MainApp /> : <SetupPage />
        } />
      </Routes>
    </Router>
  );
}