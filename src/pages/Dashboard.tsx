import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

export function Dashboard() {
  const [commits, setCommits] = useState('');
  const [loading, setLoading] = useState(false);
  const [changelog, setChangelog] = useState('');

  const handleGenerateChangelog = async () => {
    setLoading(true);
    try {
      // TODO: Integrate with Supabase Edge Function
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulated delay
      setChangelog('# What\'s New\n\n- Added support for real-time collaboration\n- Fixed bug in authentication flow\n- Improved performance of search functionality');
    } catch (error) {
      console.error('Error generating changelog:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Generate Changelog</h1>
        <p className="mt-2 text-gray-600">
          Paste your git commits or describe your changes, and we'll generate a user-friendly changelog.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="commits" className="block text-sm font-medium text-gray-700">
              Git Commits or Changes
            </label>
            <textarea
              id="commits"
              rows={8}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Paste your git commits or describe your changes here..."
              value={commits}
              onChange={(e) => setCommits(e.target.value)}
            />
          </div>

          <button
            onClick={handleGenerateChangelog}
            disabled={loading || !commits.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Generating...
              </>
            ) : (
              'Generate Changelog'
            )}
          </button>

          {changelog && (
            <div className="mt-6">
              <h2 className="text-lg font-medium text-gray-900">Generated Changelog</h2>
              <div className="mt-2 p-4 bg-gray-50 rounded-md">
                <pre className="whitespace-pre-wrap text-sm text-gray-700">{changelog}</pre>
              </div>
              <button
                onClick={() => {
                  // TODO: Save to database
                  alert('Changelog saved!');
                }}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Save Changelog
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}