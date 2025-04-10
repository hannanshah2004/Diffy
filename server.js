import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { Octokit } from '@octokit/rest';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

// Import the changelog generator functions
import {
  getRepositoryInfo,
  getRecentCommits,
  getAllCommitsInBatches,
  generateChangelog,
  saveChangelog,
  processAllBatches
} from './scripts/changelog-functions.js';

// Load environment variables
dotenv.config();

// Environment Variable Checks for non-GitHub variables
// GitHub token will now come from the client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 3001;

if (!supabaseUrl || !supabaseKey || !openaiApiKey) {
  console.error('Missing required environment variables (Supabase, OpenAI).');
  process.exit(1);
}

// Initialize API clients that don't require user-provided credentials
const openai = new OpenAI({ apiKey: openaiApiKey });
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Changelog API server is running!' });
});

// Changelog generation endpoint
app.post('/api/generate-changelog', async (req, res) => {
  try {
    const {
      mode = 'recent',
      commitCount = 10,
      batchSize = 10,
      maxEntries = 10,
      version = null,
      repoOwner,
      repoName,
      githubToken, // Get token from request
      dryRun = false
    } = req.body;

    // Validate required parameters
    if (!repoOwner || !repoName) {
      return res.status(400).json({
        success: false,
        message: 'Repository owner and name are required'
      });
    }

    // Validate GitHub token
    if (!githubToken) {
      return res.status(400).json({
        success: false,
        message: 'GitHub token is required'
      });
    }

    console.log(`Starting changelog generation in ${mode} mode for ${repoOwner}/${repoName}...`);

    // Initialize GitHub client with the provided token
    const octokit = new Octokit({ auth: githubToken });

    // Test the token by fetching repository info
    try {
      const repoInfo = await getRepositoryInfo(octokit, repoOwner, repoName);

      if (!repoInfo) {
        return res.status(404).json({
          success: false,
          message: `Failed to fetch repository info for ${repoOwner}/${repoName}. Please check the repository name and your access permissions.`
        });
      }

      // Generate changelog based on mode
      let result;
      if (mode === 'recent') {
        // Recent mode: single changelog
        const commits = await getRecentCommits(octokit, repoOwner, repoName, commitCount);

        if (commits.length === 0) {
          return res.status(404).json({
            success: false,
            message: `No commits found in GitHub repo ${repoOwner}/${repoName}`
          });
        }

        const changelog = await generateChangelog(openai, commits);

        if (!changelog) {
          return res.status(500).json({
            success: false,
            message: 'Failed to generate changelog with OpenAI'
          });
        }

        const savedEntry = await saveChangelog(
          supabase, 
          changelog, 
          version, 
          null, 
          dryRun, 
          { owner: repoOwner, name: repoName }
        );

        if (!savedEntry) {
          return res.status(500).json({
            success: false,
            message: 'Failed to save changelog entry to database'
          });
        }

        result = {
          mode: 'recent',
          repoInfo,
          commitsAnalyzed: commits.length,
          entry: savedEntry
        };
      } else {
        // Comprehensive mode: multiple changelogs
        const batches = await getAllCommitsInBatches(octokit, repoOwner, repoName, batchSize, maxEntries);

        if (batches.length === 0) {
          return res.status(404).json({
            success: false,
            message: `No commits found in GitHub repo ${repoOwner}/${repoName}`
          });
        }

        const versionPrefix = version || `${repoInfo.name}-history`;
        const results = await processAllBatches(
          octokit, 
          openai, 
          supabase, 
          batches, 
          versionPrefix, 
          dryRun,
          { owner: repoOwner, name: repoName }
        );

        result = {
          mode: 'comprehensive',
          repoInfo,
          batchCount: batches.length,
          successfulBatches: results.length,
          entries: results
        };
      }

      res.json({
        success: true,
        ...result
      });
      
    } catch (githubError) {
      console.error('GitHub API error:', githubError);
      return res.status(401).json({
        success: false,
        message: 'Failed to authenticate with GitHub. Please check your token and permissions.',
        error: githubError.message
      });
    }
  } catch (error) {
    console.error('Error generating changelog:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating changelog',
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Changelog API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
}); 