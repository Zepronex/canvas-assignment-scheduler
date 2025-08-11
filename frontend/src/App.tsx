import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, BookOpen, CheckCircle, AlertCircle, Filter, ChevronRight } from 'lucide-react';

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

export default function App() {
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
      const [userRes, coursesRes, assignmentsRes] = await Promise.all([
        fetch(`${API_BASE}/user`),
        fetch(`${API_BASE}/courses`),
        fetch(`${API_BASE}/assignments`)
      ]);

      if (!userRes.ok || !coursesRes.ok || !assignmentsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const userData = await userRes.json();
      const coursesData = await coursesRes.json();
      const assignmentsData = await assignmentsRes.json();

      setUser(userData);
      setCourses(coursesData.courses); // Note: accessing .courses property
      setAssignments(assignmentsData.assignments); // Note: accessing .assignments property
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
    const endDate = new Date(date.getTime() + 60 * 60 * 1000); // 1 hour duration
    
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
      {/* Header */}
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
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
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
          {/* Sidebar */}
          <div className="lg:w-80">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
              
              {/* Course Filter */}
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

              {/* Sort Options */}
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

              {/* Show Past Due Toggle */}
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

          {/* Main Content */}
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