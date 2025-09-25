import React from 'react';
import { Github, Linkedin } from 'lucide-react';

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

export default AboutPage;
