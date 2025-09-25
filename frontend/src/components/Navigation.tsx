import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

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
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-xl font-semibold text-gray-900">Canvas Assignment Scheduler</h1>
          </div>
          
          {/* navigation tabs */}
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

export default Navigation;
