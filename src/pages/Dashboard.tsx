import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { ChangelogEntry } from '../types';

export function Dashboard() {
  const [changelogs, setChangelogs] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [commitRange, setCommitRange] = useState('HEAD~10..HEAD');
  const [version, setVersion] = useState('');
  const [generationOutput, setGenerationOutput] = useState<string | null>(null);

  useEffect(() => {
    fetchChangelogs();
  }, []);

  async function fetchChangelogs() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('changelog_entries')
        .select('*')
        .order('published_at', { ascending: false });

      if (error) {
        throw error;
      }

      setChangelogs(data || []);
    } catch (err) {
      console.error('Error fetching changelogs:', err);
      setError('Failed to load changelogs');
    } finally {
      setLoading(false);
    }
  }

  async function generateChangelog() {
    setIsGenerating(true);
    setGenerationOutput('Generating changelog...');
    
    try {
      // In a real implementation, you'd call an API endpoint that would execute the script
      // Here, we'll simulate the process
      const cmd = `npm run generate-changelog -- --range "${commitRange}"${version ? ` --version "${version}"` : ''}`;
      setGenerationOutput(`Executing: ${cmd}\n\nPlease run this command in your terminal to generate the changelog.`);

      // This would be replaced with an actual API call in production
      // const response = await fetch('/api/generate-changelog', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ commitRange, version })
      // });
      
      // if (!response.ok) {
      //   throw new Error('Failed to generate changelog');
      // }
      
      // const result = await response.json();
      // setGenerationOutput(result.output);
      
      // Refresh changelogs
      // await fetchChangelogs();
    } catch (err) {
      console.error('Error generating changelog:', err);
      setGenerationOutput('Error generating changelog. See console for details.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Changelog Generator</h1>
        <p className="mt-2 text-gray-600">
          Generate and manage changelogs for your project.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Generator Panel */}
        <div className="md:col-span-1 bg-white shadow rounded-lg p-6 h-fit">
          <h2 className="text-xl font-semibold mb-4">Generate New Changelog</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="commitRange" className="block text-sm font-medium text-gray-700 mb-1">
                Commit Range
              </label>
              <input
                id="commitRange"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={commitRange}
                onChange={(e) => setCommitRange(e.target.value)}
                placeholder="e.g., HEAD~10..HEAD"
              />
              <p className="mt-1 text-xs text-gray-500">
                Specify the range of commits to analyze
              </p>
            </div>
            
            <div>
              <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-1">
                Version (Optional)
              </label>
              <input
                id="version"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g., 1.2.3 or 2025-01-30.acacia"
              />
            </div>
            
            <button
              onClick={generateChangelog}
              disabled={isGenerating || !commitRange}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 focus:outline-none ${
                isGenerating || !commitRange 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              }`}
            >
              {isGenerating ? 'Generating...' : 'Generate Changelog'}
            </button>
          </div>

          {generationOutput && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Output:</h3>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-60 text-gray-700">
                {generationOutput}
              </pre>
            </div>
          )}
        </div>

        {/* Recent Changelogs Panel */}
        <div className="md:col-span-2 bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Recent Changelogs</h2>
            <button
              onClick={fetchChangelogs}
              disabled={loading}
              className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Refresh
            </button>
          </div>

          {/* Loading state */}
          {loading && <div className="text-center py-6">Loading...</div>}

          {/* Error state */}
          {error && <div className="text-center py-6 text-red-500">{error}</div>}

          {/* Empty state */}
          {!loading && !error && changelogs.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              No changelogs available. Generate your first changelog!
            </div>
          )}

          {/* Changelogs list */}
          <div className="space-y-4">
            {changelogs.map((log) => (
              <div key={log.id} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{log.title}</h3>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {format(parseISO(log.published_at), 'MMM d, yyyy')}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {log.category}
                      </span>
                      {log.version && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          v{log.version}
                        </span>
                      )}
                    </div>
                  </div>
                  <a
                    href="/changelog"
                    className="text-sm text-indigo-600 hover:text-indigo-900"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View
                  </a>
                </div>
                {log.description && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {log.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}