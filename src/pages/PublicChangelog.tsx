import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../lib/supabase';
import { ChangelogEntry } from '../types';
// Consider adding icons for a more polished look, e.g., from lucide-react
// import { Loader2, Tag, GitBranch, AlertCircle, Inbox } from 'lucide-react';

// Helper function to get category badge colors
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

export function PublicChangelog() {
  const [changelogs, setChangelogs] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  // const [searchQuery, setSearchQuery] = useState(''); // Search functionality TBD
  const [repoOwners, setRepoOwners] = useState<string[]>([]);
  const [repoNames, setRepoNames] = useState<string[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);


  // Fetch all unique repo owners and categories initially
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch owners
        const { data: ownerData, error: ownerError } = await supabase
          .from('changelog_entries')
          .select('repo_owner')
          .not('repo_owner', 'is', null)
          .order('repo_owner');

        if (ownerError) throw ownerError;

        const uniqueOwners = Array.from(new Set(
          ownerData.map(item => item.repo_owner).filter(Boolean) as string[]
        ));
        setRepoOwners(uniqueOwners);
        // Auto-select first owner if exists and only one owner
        if (uniqueOwners.length > 0) {
          setSelectedOwner(uniqueOwners[0]);
        }

        // Fetch all categories initially to populate filters even if no owner/repo is selected yet
         const { data: categoryData, error: categoryError } = await supabase
          .from('changelog_entries')
          .select('category')
          .not('category', 'is', null); // Ensure we only get entries with categories

        if (categoryError) throw categoryError;

        const allCategories = Array.from(new Set(
          categoryData.map(item => item.category).filter(Boolean) as string[]
        )).sort(); // Sort categories alphabetically
        setUniqueCategories(allCategories);

      } catch (err) {
        console.error('Error fetching initial data:', err);
        setError('Failed to load initial filters');
      } finally {
         // Loading will be set to false after fetching changelogs
      }
    }
    fetchData();
  }, []);

  // Fetch repos for selected owner
  useEffect(() => {
    async function fetchRepoNames() {
      if (!selectedOwner) {
        setRepoNames([]);
        setSelectedRepo(null); // Reset repo selection when owner changes/is null
        return;
      }

      // No need to setLoading(true) here, let the main changelog fetch handle it
      try {
        const { data, error } = await supabase
          .from('changelog_entries')
          .select('repo_name')
          .eq('repo_owner', selectedOwner)
          .not('repo_name', 'is', null)
          .order('repo_name');

        if (error) throw error;

        const uniqueRepos = Array.from(new Set(
          data.map(item => item.repo_name).filter(Boolean) as string[]
        ));
        setRepoNames(uniqueRepos);
        setSelectedRepo(null); // Reset repo selection when owner changes

      } catch (err) {
        console.error('Error fetching repo names:', err);
        // Optionally set an error state specific to repo fetching if needed
      }
    }

    fetchRepoNames();
  }, [selectedOwner]);

  // Fetch changelogs based on filters
  useEffect(() => {
    async function fetchChangelogs() {
      // Only proceed if we have potentially loaded owners (even if owner list is empty)
      // And prevent fetching if owner is selected but repo names haven't loaded yet
      if (repoOwners === null || (selectedOwner && repoNames === null)) {
         // console.log("Skipping fetch: Filters not ready");
         return;
      }

      setLoading(true);
      setError(null); // Clear previous errors

      try {
        let query = supabase
          .from('changelog_entries')
          .select('*')
          .order('published_at', { ascending: false });

        if (activeFilter) {
          query = query.eq('category', activeFilter);
        }

        // Filter by owner only if an owner is actually selected
        if (selectedOwner) {
          query = query.eq('repo_owner', selectedOwner);
          // Filter by repo only if an owner AND a repo are selected
          if (selectedRepo) {
            query = query.eq('repo_name', selectedRepo);
          }
        }


        // Add search query condition if needed
        // if (searchQuery) {
        //   query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
        // }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        setChangelogs(data || []);
      } catch (err) {
        console.error('Error fetching changelogs:', err);
        setError('Failed to load changelogs. Please try adjusting filters or refresh.');
        setChangelogs([]); // Clear data on error
      } finally {
        setLoading(false);
      }
    }

    fetchChangelogs();
  // Depend on repoOwners having been loaded, selectedOwner, selectedRepo, and activeFilter
  }, [repoOwners, selectedOwner, selectedRepo, repoNames, activeFilter]); // Include repoNames to refetch when they load for a selected owner


  // Check if owner dropdown should be disabled (only one owner and it's selected)
   const isOwnerDropdownDisabled = repoOwners.length <= 1 && !!selectedOwner;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Title */}
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Public Changelog</h1>

      {/* Filters Section */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Repository Owner Filter */}
          <div>
            <label htmlFor="repo-owner" className="block text-sm font-medium text-gray-700 mb-1">
              Repository Owner
            </label>
            <select
              id="repo-owner"
              name="repo-owner"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out disabled:bg-gray-100 disabled:cursor-not-allowed"
              value={selectedOwner || ''}
              onChange={(e) => setSelectedOwner(e.target.value || null)}
              disabled={isOwnerDropdownDisabled}
            >
              {/* Add a default "All Owners" option if needed, or handle null selection */}
               {repoOwners.length > 1 && <option value="">All Owners</option>}
               {repoOwners.map(owner => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
             {repoOwners.length === 0 && !loading && (
                 <p className="text-xs text-gray-500 mt-1">No owners found.</p>
             )}
          </div>

          {/* Repository Name Filter */}
          <div>
            <label htmlFor="repo-name" className="block text-sm font-medium text-gray-700 mb-1">
              Repository
            </label>
            <select
              id="repo-name"
              name="repo-name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out disabled:bg-gray-100 disabled:cursor-not-allowed"
              value={selectedRepo || ''}
              onChange={(e) => setSelectedRepo(e.target.value || null)}
              disabled={!selectedOwner || repoNames.length === 0} // Disable if no owner selected or no repos for the owner
            >
              <option value="">All Repositories</option>
              {repoNames.map(repo => (
                <option key={repo} value={repo}>
                  {repo}
                </option>
              ))}
            </select>
            {selectedOwner && repoNames.length === 0 && !loading && (
                <p className="text-xs text-gray-500 mt-1">No repositories found for this owner.</p>
            )}
            {!selectedOwner && (
                <p className="text-xs text-gray-500 mt-1">Select an owner first.</p>
            )}
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3">
             <label className="block text-sm font-medium text-gray-700 mb-2">
                 Category
             </label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setActiveFilter(null)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition duration-150 ease-in-out ${
                  activeFilter === null
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {uniqueCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveFilter(category)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition duration-150 ease-in-out ${
                    activeFilter === category
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
               {uniqueCategories.length === 0 && !loading && (
                 <p className="text-xs text-gray-500">No categories found.</p>
             )}
            </div>
          </div>
           {/* Search Input (Future) */}
          {/* <div className="md:col-span-3">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              name="search"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
              placeholder="Search title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div> */}
        </div>
      </div>

      {/* Content Area */}
      <div>
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-16">
             {/* Simple Spinner - replace with <Loader2 className="h-8 w-8 animate-spin text-indigo-600" /> if using lucide-react */}
             <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-lg text-gray-600">Loading Changelogs...</span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-16 bg-red-50 border border-red-200 rounded-lg p-6">
             {/* <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" /> */}
             <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <h3 className="text-xl font-medium text-red-800 mb-2">Oops! Something went wrong.</h3>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && changelogs.length === 0 && (
          <div className="text-center py-16 bg-gray-50 border border-gray-200 rounded-lg p-6">
            {/* <Inbox className="mx-auto h-12 w-12 text-gray-400 mb-4" /> */}
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-1.414 1.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-1.414-1.414A1 1 0 006.586 13H4"></path></svg>
            <h3 className="text-xl font-medium text-gray-700 mb-2">No Changelogs Found</h3>
            <p className="text-gray-500">
              {activeFilter || selectedOwner || selectedRepo
                ? 'No changelogs match your current filters.'
                : 'There are no changelogs to display yet.'}
            </p>
          </div>
        )}

        {/* Changelog List */}
        {!loading && !error && changelogs.length > 0 && (
          <div className="space-y-6">
            {changelogs.map((log) => (
              <div key={log.id} className="bg-white shadow-lg rounded-xl p-6 border border-gray-100 hover:shadow-xl transition duration-300 ease-in-out">
                 <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-4">
                   <div className="mb-3 sm:mb-0">
                     <h2 className="text-2xl font-semibold text-gray-900 mb-1">{log.title}</h2>
                     <p className="text-sm text-gray-500">
                      Published on {format(parseISO(log.published_at), 'MMMM d, yyyy')}
                     </p>
                   </div>
                   <div className="flex-shrink-0 flex flex-wrap items-center gap-2">
                     <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getCategoryBadgeClasses(log.category)}`}>
                       {/* <Tag className="h-3 w-3 mr-1.5" /> Optional icon */}
                       {log.category}
                     </span>
                     {log.version && (
                       <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                         {/* <GitBranch className="h-3 w-3 mr-1.5" /> Optional icon */}
                         v{log.version}
                       </span>
                     )}
                   </div>
                 </div>

                 {log.repo_owner && log.repo_name && (
                    <div className="mb-4 text-sm text-gray-500">
                      Repository: <span className="font-medium text-gray-700">{log.repo_owner}/{log.repo_name}</span>
                    </div>
                  )}

                <div className="prose prose-indigo max-w-none text-gray-700">
                  {log.description ? (
                    <ReactMarkdown>{log.description}</ReactMarkdown>
                  ) : (
                     <p className="text-gray-500 italic">No description provided.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}