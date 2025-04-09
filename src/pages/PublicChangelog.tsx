import React from 'react';
import { format } from 'date-fns';

const SAMPLE_CHANGELOGS = [
  {
    id: 1,
    date: new Date(),
    content: '# What\'s New\n\n- Added support for real-time collaboration\n- Fixed bug in authentication flow\n- Improved performance of search functionality',
  },
  {
    id: 2,
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    content: '# Previous Updates\n\n- Introduced dark mode support\n- Added new API endpoints for analytics\n- Enhanced error handling across the application',
  },
];

export function PublicChangelog() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Changelog</h1>
        <p className="mt-2 text-gray-600">
          Keep track of all the latest updates and improvements.
        </p>
      </div>

      <div className="space-y-8">
        {SAMPLE_CHANGELOGS.map((log) => (
          <div key={log.id} className="bg-white shadow rounded-lg p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {format(log.date, 'MMMM d, yyyy')}
              </h2>
            </div>
            <div className="prose prose-indigo">
              <pre className="whitespace-pre-wrap text-sm text-gray-700">{log.content}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}