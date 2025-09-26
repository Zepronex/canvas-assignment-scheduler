import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { API_BASE } from '../constants';

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
                Enter your university's Canvas URL (e.g. link to your canvas page, for example https://canvas.cityu.edu.hk or https://his.instructure.com)
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

export default SetupPage;
