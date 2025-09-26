import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle, Filter } from 'lucide-react';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Never Miss Another Canvas Assignment
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            A simple tool that helps you keep track of your Canvas assignments deadlines and schedule them in Google Calendar when you're ready. 
            Take control of your deadlines and never lose track of your assignments again.
          </p>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Manual Organization</h3>
            <p className="text-gray-600 dark:text-gray-300">Connect your Canvas account and view all your upcoming assignments across all courses in one place.</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Bulk Calendar Scheduling</h3>
            <p className="text-gray-600 dark:text-gray-300">Select multiple assignments and add them to your Google Calendar all at once, complete with course details and Canvas links.</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
              <Filter className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Smart Filtering</h3>
            <p className="text-gray-600 dark:text-gray-300">Filter by course, due date status, and sort assignments to focus on what matters most to you.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
