import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { ChangelogEntry } from '../types';
import { AlertCircle, Check, Loader2 } from 'lucide-react';

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
        setGenerationOutput('❌ Please provide GitHub token, owner, and repository name');
        return;
      }

      setIsGenerating(true);
      setGenerationStatus('loading');
      setGenerationOutput('Generating changelog... This may take a moment.');
      
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
      
      setGenerationOutput(`Sending request to generate changelog for ${credentials.owner}/${credentials.repo}...
Mode: ${generationMode}
${generationMode === 'recent' 
  ? `Commits: ${commitCount}` 
  : `Batch size: ${batchSize}, Max entries: ${maxEntries}`}
${version ? `Version: ${version}` : ''}

⏳ This may take some time depending on repository size and generation mode...`);
      
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
        ? `Successfully generated changelog: "${result.entry?.title}"`
        : `Successfully generated ${result.entries?.length || 0} changelog entries`;
      
      setGenerationOutput(`✅ ${resultSummary}

Check the "Recent Changelogs" panel to see the generated entries.`);
      
      // Refresh changelogs list
      fetchChangelogs();
    } catch (error: unknown) {
      console.error('Error generating changelog:', error);
      setGenerationStatus('error');
      setGenerationOutput(`❌ Error generating changelog: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
          
          {/* GitHub Credentials */}
          <div className="mb-6 space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">GitHub Credentials</h3>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="repo-name"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Your credentials are stored locally in your browser and sent directly to the API.
            </p>
          </div>
          
          <div className="space-y-6">
            {/* Generation Mode */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Generation Mode
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="recent"
                    checked={generationMode === 'recent'}
                    onChange={() => setGenerationMode('recent')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Recent Commits</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="comprehensive"
                    checked={generationMode === 'comprehensive'}
                    onChange={() => setGenerationMode('comprehensive')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Full History</span>
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
                  Number of Commits
                </label>
                <input
                  id="commitCount"
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                    Batch Size
                  </label>
                  <input
                    id="batchSize"
                    type="number"
                    min="5"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={batchSize}
                    onChange={(e) => setBatchSize(Math.max(5, Math.min(100, parseInt(e.target.value, 10) || 10)))}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Number of commits per changelog entry (5-100).
                  </p>
                </div>
                
                <div>
                  <label htmlFor="maxEntries" className="block text-sm font-medium text-gray-700 mb-1">
                    Max Entries
                  </label>
                  <input
                    id="maxEntries"
                    type="number"
                    min="1"
                    max="50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={maxEntries}
                    onChange={(e) => setMaxEntries(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 10)))}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Maximum number of changelog entries to generate (1-50).
                  </p>
                </div>
                
                <div className="rounded-md bg-amber-50 p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-amber-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <p className="text-xs text-amber-700">
                        This mode generates multiple changelog entries and may take some time. It will consume more API quota from both GitHub and OpenAI.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Version field - common to both modes */}
            <div>
              <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-1">
                {generationMode === 'recent' 
                  ? 'Version (Optional)'
                  : 'Version Prefix (Optional)'}
              </label>
              <input
                id="version"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder={generationMode === 'recent' ? 'e.g., v1.0.0' : 'e.g., milestone-1'}
              />
              <p className="mt-1 text-xs text-gray-500">
                {generationMode === 'recent'
                  ? 'Version label for the changelog entry.'
                  : 'Prefix for version labels in batch mode. Will generate entries like "prefix-batch-1", "prefix-batch-2", etc.'}
              </p>
            </div>
            
            <button
              onClick={generateChangelog}
              disabled={isGenerating || !credentials.token || !credentials.owner || !credentials.repo}
              className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 focus:outline-none ${
                isGenerating || !credentials.token || !credentials.owner || !credentials.repo
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
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
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Status:</h3>
              <div className={`p-3 rounded text-sm ${
                generationStatus === 'error' 
                  ? 'bg-red-50 text-red-700' 
                  : generationStatus === 'success'
                    ? 'bg-green-50 text-green-700'
                    : generationStatus === 'loading'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-gray-50 text-gray-700'
              }`}>
                <pre className="whitespace-pre-wrap break-words">{generationOutput}</pre>
              </div>
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
              className={`inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-0.5 mr-2 h-4 w-4" />
                  Loading...
                </>
              ) : (
                'Refresh'
              )}
            </button>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="text-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
              <p className="mt-2 text-gray-500">Loading changelogs...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="text-center py-6 text-red-500 bg-red-50 rounded-md">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          )}

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
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {format(parseISO(log.published_at), 'MMM d, yyyy')}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {log.category}
                      </span>
                      {log.version && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {log.version}
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
                  <div className="mt-2 text-sm text-gray-600 line-clamp-3 prose prose-sm max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: log.description.replace(/\n/g, '<br>') }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}