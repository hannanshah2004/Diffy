import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { ChangelogEntry } from '../types';
import { AlertCircle, Check, Loader2, RefreshCw } from 'lucide-react';

// Get the API URL from environment, with fallback
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Type for the API response
interface GenerationResponse {
  success: boolean;
  mode: string;
  repoInfo?: {
    name: string;
    fullName: string;
    description?: string;
  };
  commitsAnalyzed?: number;
  entry?: any; // The generated changelog entry
  batchCount?: number;
  successfulBatches?: number;
  entries?: any[]; // The generated changelog entries
  error?: string;
}

// Type for GitHub credentials
interface GitHubCredentials {
  token: string;
  owner: string;
  repo: string;
}

// Helper function to get category badge colors (same as in PublicChangelog)
const getCategoryBadgeClasses = (category: string) => {
  switch (category?.toLowerCase()) {
    case 'new feature':
      return 'bg-indigo-100 text-indigo-800';
    case 'enhancement':
      return 'bg-teal-100 text-teal-800';
    case 'bug fix':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function Dashboard() {
  const [changelogs, setChangelogs] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Generation settings
  const [commitCount, setCommitCount] = useState(10);
  const [version, setVersion] = useState('');
  const [generationMode, setGenerationMode] = useState('recent');
  const [batchSize, setBatchSize] = useState(10);
  const [maxEntries, setMaxEntries] = useState(10);
  
  // GitHub credentials (with localStorage persistence)
  const [credentials, setCredentials] = useState<GitHubCredentials>(() => {
    const savedCreds = localStorage.getItem('github_credentials');
    return savedCreds ? JSON.parse(savedCreds) : {
      token: '',
      owner: '',
      repo: ''
    };
  });
  
  // State for display
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [generationOutput, setGenerationOutput] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<GenerationResponse | null>(null);

  // Handle credentials change
  const handleCredentialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updated = { ...credentials, [name]: value };
    setCredentials(updated);
    localStorage.setItem('github_credentials', JSON.stringify(updated));
  };

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
    try {
      // Validate GitHub credentials
      if (!credentials.token || !credentials.owner || !credentials.repo) {
        setGenerationStatus('error');
        setGenerationOutput('Please provide GitHub token, owner, and repository name');
        return;
      }

      setIsGenerating(true);
      setGenerationStatus('loading');
      setGenerationOutput('Initializing generation...');
      
      const requestBody = {
        mode: generationMode,
        repoOwner: credentials.owner,
        repoName: credentials.repo,
        githubToken: credentials.token, // Pass token to backend
        commitCount: commitCount,
        batchSize: batchSize,
        maxEntries: maxEntries,
        version: version || undefined,
        dryRun: false
      };
      
      setGenerationOutput(`Generating changelog for ${credentials.owner}/${credentials.repo} (Mode: ${generationMode})...`);
      
      const response = await fetch(`${API_URL}/generate-changelog`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to generate changelog');
      }
      
      // Success!
      setGenerationStatus('success');
      setGenerationResult(result);
      
      const resultSummary = result.mode === 'recent'
        ? `Generated changelog: "${result.entry?.title}"`
        : `Generated ${result.entries?.length || 0} changelog entries`;
      
      setGenerationOutput(`${resultSummary}. Check the list below.`);
      
      // Refresh changelogs list
      fetchChangelogs();
    } catch (error: unknown) {
      console.error('Error generating changelog:', error);
      setGenerationStatus('error');
      setGenerationOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Generator Panel */}
        <div className="lg:col-span-1 bg-white shadow-lg rounded-xl p-6 border border-gray-100 h-fit">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Generate New Changelog</h2>
          
          {/* GitHub Credentials */}
          <div className="mb-6 space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">GitHub Credentials</h3>
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
                Personal Access Token*
              </label>
              <input
                id="token"
                name="token"
                type="password"
                value={credentials.token}
                onChange={handleCredentialsChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                placeholder="ghp_..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Token needs 'repo' permissions
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="owner" className="block text-sm font-medium text-gray-700 mb-1">
                  Repository Owner*
                </label>
                <input
                  id="owner"
                  name="owner"
                  type="text"
                  value={credentials.owner}
                  onChange={handleCredentialsChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                  placeholder="username"
                />
              </div>
          <div>
                <label htmlFor="repo" className="block text-sm font-medium text-gray-700 mb-1">
                  Repository Name*
            </label>
                <input
                  id="repo"
                  name="repo"
                  type="text"
                  value={credentials.repo}
                  onChange={handleCredentialsChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                  placeholder="repo-name"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Credentials stored locally and sent only during generation.
            </p>
          </div>
          
          <div className="space-y-6">
            {/* Generation Mode */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Generation Mode
              </label>
              <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
                <label className="inline-flex items-center p-2 border rounded-md hover:bg-gray-50 cursor-pointer transition duration-150 ease-in-out">
                  <input
                    type="radio"
                    value="recent"
                    checked={generationMode === 'recent'}
                    onChange={() => setGenerationMode('recent')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-800">Recent Commits</span>
                </label>
                <label className="inline-flex items-center p-2 border rounded-md hover:bg-gray-50 cursor-pointer transition duration-150 ease-in-out">
                  <input
                    type="radio"
                    value="comprehensive"
                    checked={generationMode === 'comprehensive'}
                    onChange={() => setGenerationMode('comprehensive')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-800">Full History</span>
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {generationMode === 'recent' 
                  ? 'Generates a single changelog entry from recent commits.' 
                  : 'Generates multiple changelog entries covering the repository history.'}
              </p>
            </div>
            
            {/* Recent Mode Options */}
            {generationMode === 'recent' && (
              <div>
                <label htmlFor="commitCount" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Commits to Analyze
                </label>
                <input
                  id="commitCount"
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                  value={commitCount}
                  onChange={(e) => setCommitCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Number of recent commits to analyze.
                </p>
              </div>
            )}
            
            {/* Comprehensive Mode Options */}
            {generationMode === 'comprehensive' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="batchSize" className="block text-sm font-medium text-gray-700 mb-1">
                    Commits per Changelog Entry
                  </label>
                  <input
                    id="batchSize"
                    type="number"
                    min="5"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                    value={batchSize}
                    onChange={(e) => setBatchSize(Math.max(5, Math.min(100, parseInt(e.target.value, 10) || 10)))}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Recommended: 10-50. (Min: 5, Max: 100).
                  </p>
                </div>
                
                <div>
                  <label htmlFor="maxEntries" className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Changelog Entries to Generate
                  </label>
                  <input
                    id="maxEntries"
                    type="number"
                    min="1"
                    max="50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                    value={maxEntries}
                    onChange={(e) => setMaxEntries(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 10)))}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    (Min: 1, Max: 50).
                  </p>
                </div>
                
                <div className="rounded-md bg-amber-50 p-3 border border-amber-200">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-amber-500" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-amber-800">
                        This mode generates multiple changelog entries and may take some time. It will consume more API quota from both GitHub and OpenAI.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Version Input (Optional) */}
            <div>
                <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-1">
                    Version Tag (Optional)
                </label>
                <input
                    id="version"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="e.g., 1.0.0"
                />
                 <p className="mt-1 text-xs text-gray-500">
                    Assign a version number to the generated entry/entries.
                </p>
            </div>

            <button
                onClick={generateChangelog}
                disabled={isGenerating || !credentials.token || !credentials.owner || !credentials.repo}
                className={`w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 focus:outline-none transition duration-150 ease-in-out ${
                  isGenerating || !credentials.token || !credentials.owner || !credentials.repo
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 hover:shadow-md'
                }`}
              >
                {isGenerating ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Generating...
                </>
              ) : (
                'Generate Changelog'
              )}
            </button>
          </div>

          {generationOutput && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Generation Status:</h3>
              <div className={`p-3 rounded-md text-sm border ${
                generationStatus === 'error' 
                  ? 'bg-red-50 text-red-800 border-red-200'
                  : generationStatus === 'success'
                    ? 'bg-green-50 text-green-800 border-green-200'
                    : generationStatus === 'loading'
                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                    : 'bg-gray-100 text-gray-800 border-gray-200'
              }`}>
                <div className="flex items-center">
                  {generationStatus === 'loading' && <Loader2 className="animate-spin h-4 w-4 mr-2 flex-shrink-0" />}
                  {generationStatus === 'success' && <Check className="h-4 w-4 mr-2 text-green-600 flex-shrink-0" />}
                  {generationStatus === 'error' && <AlertCircle className="h-4 w-4 mr-2 text-red-600 flex-shrink-0" />}
                  <pre className="whitespace-pre-wrap break-words text-xs sm:text-sm font-mono">{generationOutput}</pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Changelogs Panel */}
        <div className="lg:col-span-2 bg-white shadow-lg rounded-xl p-6 border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3 sm:mb-0">Recent Changelogs</h2>
            <button
              onClick={fetchChangelogs}
              disabled={loading}
              className={`inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out ${
                loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'
              }`}
            >
              {loading || isGenerating ? (
                <>
                  <Loader2 className="-ml-0.5 mr-2 h-4 w-4" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="-ml-0.5 mr-2 h-4 w-4" />
                  Refresh
                </>
              )}
            </button>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex justify-center items-center py-16">
               <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               <span className="text-lg text-gray-600">Loading Changelogs...</span>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="text-center py-16 bg-red-50 border border-red-200 rounded-lg p-6">
               <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
               <h3 className="text-xl font-medium text-red-800 mb-2">Oops! Failed to load.</h3>
               <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && changelogs.length === 0 && (
            <div className="text-center py-16 bg-gray-50 border border-gray-200 rounded-lg p-6">
               <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-1.414 1.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-1.414-1.414A1 1 0 006.586 13H4"></path></svg>
               <h3 className="text-xl font-medium text-gray-700 mb-2">No Changelogs Yet</h3>
               <p className="text-gray-500">
                 Generate your first changelog entry using the panel on the left.
               </p>
            </div>
          )}

          {/* Changelogs list */}
          {!loading && !error && changelogs.length > 0 && (
            <div className="flow-root">
                <ul role="list" className="-mb-8">
                    {changelogs.map((log, logIdx) => (
                        <li key={log.id}>
                            <div className="relative pb-8">
                                {logIdx !== changelogs.length - 1 ? (
                                    <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                                ) : null}
                                <div className="relative flex space-x-3 items-start">
                                    <div>
                                        <span className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center ring-8 ring-white">
                                            {/* Placeholder Icon - Could be dynamic based on category */}
                                            <svg className="h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                            </svg>
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1 pt-1.5">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm text-gray-500 mb-0.5">
                                                    Generated on {format(parseISO(log.published_at), 'MMM d, yyyy h:mm a')}
                                                </p>
                                                <h3 className="text-lg font-semibold text-gray-900">{log.title}</h3>
                                            </div>
                                            <a
                                                href="/changelog" // Link to public view (consider linking to specific entry if possible)
                                                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition duration-150 ease-in-out flex-shrink-0 ml-4"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                View Public
                                            </a>
                                        </div>

                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium ${getCategoryBadgeClasses(log.category)}`}>
                                                {log.category}
                                            </span>
                                            {log.version && (
                                                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    v{log.version}
                                                </span>
                                            )}
                                            {log.repo_owner && log.repo_name && (
                                                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                                                    {log.repo_owner}/{log.repo_name}
                                                </span>
                                            )}
                                        </div>

                                        {log.description && (
                                            <div className="mt-3 prose prose-sm max-w-none text-gray-600 line-clamp-4">
                                                {/* Using ReactMarkdown might be better if description contains markdown */}
                                                <div dangerouslySetInnerHTML={{ __html: log.description.replace(/\n/g, '<br />') }} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}