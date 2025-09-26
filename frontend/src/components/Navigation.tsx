import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface NavigationProps {
  isAuthenticated: boolean;
}

function Navigation({ isAuthenticated }: NavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // check if user actually has valid credentials (not just on authenticated page)
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
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Canvas Assignment Scheduler</h1>
          </div>
          
          {/* navigation tabs */}
          <div className="flex items-center space-x-8">
            <button
              onClick={() => navigate('/')}
              className={`text-lg font-medium transition-colors ${
                isActive('/')
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => navigate('/about')}
              className={`text-lg font-medium transition-colors ${
                isActive('/about')
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              About
            </button>
            {hasValidCredentials ? (
              <button
                onClick={handleLogOut}
                className="text-lg font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Log Out
              </button>
            ) : (
              <button
                onClick={handleLogIn}
                className="text-lg font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Log In
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
