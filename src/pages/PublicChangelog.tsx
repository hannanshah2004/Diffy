import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../lib/supabase';
import { ChangelogEntry } from '../types';

export function PublicChangelog() {
  const [changelogs, setChangelogs] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchChangelogs() {
      try {
        setLoading(true);
        let query = supabase
          .from('changelog_entries')
          .select('*')
          .order('published_at', { ascending: false });

        if (activeFilter) {
          query = query.eq('category', activeFilter);
        }

        if (searchQuery) {
          query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
        }

        const { data, error } = await query;

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

    fetchChangelogs();
  }, [activeFilter, searchQuery]);

  // Get unique categories for filter
  const categories = Array.from(new Set(changelogs.map(log => log.category)));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Changelog</h1>
        <p className="mt-2 text-gray-600">
          Keep track of changes and upgrades to our platform.
        </p>
      </div>

      {/* Search and filters */}
      <div className="mt-8 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search changelogs..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveFilter(null)}
              className={`px-3 py-1 rounded-full text-sm ${
                activeFilter === null
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveFilter(category)}
                className={`px-3 py-1 rounded-full text-sm ${
                  activeFilter === category
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && <div className="text-center py-10">Loading...</div>}

      {/* Error state */}
      {error && <div className="text-center py-10 text-red-500">{error}</div>}

      {/* Empty state */}
      {!loading && !error && changelogs.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          {searchQuery || activeFilter
            ? 'No changelogs found matching your filters.'
            : 'No changelogs available yet.'}
        </div>
      )}

      {/* Changelogs */}
      <div className="space-y-8">
        {changelogs.map((log) => (
          <div key={log.id} className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{log.title}</h2>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {format(parseISO(log.published_at), 'MMMM d, yyyy')}
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
            </div>
            <div className="prose prose-indigo max-w-none">
              {log.description && (
                <ReactMarkdown>{log.description}</ReactMarkdown>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}