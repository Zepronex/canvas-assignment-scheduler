import React, { useState, useEffect } from 'react';
import { Calendar, Clock, BookOpen, CheckCircle, AlertCircle, ChevronRight, Search, FileText } from 'lucide-react';
import { API_BASE } from '../constants';
import { Course, Assignment, UserInfo } from '../types';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState<Record<number, string>>(() => {
    const saved = localStorage.getItem('assignmentNotes');
    return saved ? JSON.parse(saved) : {};
  });
  const [editingNote, setEditingNote] = useState<number | null>(null);

  // functions to save filter state to localStorage
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

  // check if we have cached data
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
    // try to load from cache first
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

      // cache the data
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
    
    // apply course filter
    if (selectedCourse) {
      filtered = filtered.filter(a => a.course_id === selectedCourse);
    }
    
    // apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.name.toLowerCase().includes(query) ||
        a.course_name.toLowerCase().includes(query)
      );
    }
    
    const now = new Date();
    
    // apply status filter
    switch (statusFilter) {
      case 'all':
        // no filtering needed
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
      
      // show success message
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

  const saveNote = (assignmentId: number, note: string) => {
    const newNotes = { ...assignmentNotes, [assignmentId]: note };
    setAssignmentNotes(newNotes);
    localStorage.setItem('assignmentNotes', JSON.stringify(newNotes));
    setEditingNote(null);
  };

  const deleteNote = (assignmentId: number) => {
    const newNotes = { ...assignmentNotes };
    delete newNotes[assignmentId];
    setAssignmentNotes(newNotes);
    localStorage.setItem('assignmentNotes', JSON.stringify(newNotes));
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

  // keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'a',
      ctrlKey: true,
      action: selectAllUpcoming,
      description: 'Ctrl+A: Select all upcoming assignments'
    },
    {
      key: 'r',
      ctrlKey: true,
      action: fetchData,
      description: 'Ctrl+R: Refresh data'
    },
    {
      key: 'f',
      ctrlKey: true,
      action: () => (document.querySelector('input[type="text"]') as HTMLInputElement)?.focus(),
      description: 'Ctrl+F: Focus search'
    }
  ]);

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
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search assignments or courses..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
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
                            
                            {/* assignment notes */}
                            {assignmentNotes[assignment.id] && (
                              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start">
                                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                                    <p className="text-sm text-blue-800 dark:text-blue-200">{assignmentNotes[assignment.id]}</p>
                                  </div>
                                  <button
                                    onClick={() => deleteNote(assignment.id)}
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-xs"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {/* note input */}
                            {editingNote === assignment.id ? (
                              <div className="mt-2">
                                <textarea
                                  defaultValue={assignmentNotes[assignment.id] || ''}
                                  placeholder="Add a note for this assignment..."
                                  className="w-full p-2 text-sm border border-gray-300 rounded-md resize-none"
                                  rows={2}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.ctrlKey) {
                                      saveNote(assignment.id, e.currentTarget.value);
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingNote(null);
                                    }
                                  }}
                                  autoFocus
                                />
                                <div className="flex justify-end space-x-2 mt-1">
                                  <button
                                    onClick={() => setEditingNote(null)}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      const textarea = e.currentTarget.parentElement?.previousElementSibling as HTMLTextAreaElement;
                                      saveNote(assignment.id, textarea.value);
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    Save (Ctrl+Enter)
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingNote(assignment.id)}
                                className="mt-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center"
                              >
                                <FileText className="w-3 h-3 mr-1" />
                                {assignmentNotes[assignment.id] ? 'Edit note' : 'Add note'}
                              </button>
                            )}
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

export default MainApp;
