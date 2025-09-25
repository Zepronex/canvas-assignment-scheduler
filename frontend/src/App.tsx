import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import LandingPage from './components/LandingPage';
import AboutPage from './components/AboutPage';
import SetupPage from './components/SetupPage';
import MainApp from './components/MainApp';

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

  // session timeout management
  useEffect(() => {
    const checkSessionTimeout = () => {
      const lastActivity = localStorage.getItem('lastActivity');
      if (lastActivity) {
        const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
        const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds
        
        if (timeSinceLastActivity > thirtyMinutes) {
          // session expired, log out user
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

    // update last activity on user interaction
    const updateLastActivity = () => {
      localStorage.setItem('lastActivity', Date.now().toString());
    };

    // check session timeout every minute
    const sessionInterval = setInterval(checkSessionTimeout, 60000);
    
    // update last activity on user interactions
    document.addEventListener('click', updateLastActivity);
    document.addEventListener('keypress', updateLastActivity);
    document.addEventListener('scroll', updateLastActivity);

    // set initial last activity
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

  // update page title based on current route
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