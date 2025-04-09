#!/usr/bin/env ts-node

import { Octokit } from '@octokit/rest';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { ChangelogEntry as FrontendChangelogEntry } from '../src/types'; // Import the frontend type

// Load environment variables
dotenv.config();

// Environment Variable Checks
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const githubToken = process.env.GITHUB_TOKEN;
const repoOwner = process.env.GITHUB_REPO_OWNER;
const repoName = process.env.GITHUB_REPO_NAME;

if (!supabaseUrl || !supabaseKey || !openaiApiKey || !githubToken || !repoOwner || !repoName) {
  console.error('Missing required environment variables (Supabase, OpenAI, GitHub Token/Repo details).');
  process.exit(1);
}

// Initialize clients
const octokit = new Octokit({ auth: githubToken });
const openai = new OpenAI({ apiKey: openaiApiKey });
const supabase = createClient(supabaseUrl, supabaseKey);

// Parse command line arguments
const args = process.argv.slice(2);
let version: string | null = null;
let commitCount = 10; // Default: fetch last 10 commits

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--version' && args[i + 1]) {
    version = args[i + 1];
    i++;
  } else if (args[i] === '--count' && args[i + 1]) {
    const count = parseInt(args[i + 1], 10);
    if (!isNaN(count) && count > 0) {
      commitCount = count;
    }
    i++;
  }
}

interface Commit {
  sha: string;
  date: string | null;
  message: string;
  body?: string; // Commit body might not always be separate
  author_name: string | null;
  author_email: string | null;
}

interface ChangelogOutput {
  title: string;
  description: string;
  category: string;
}

// Define a more specific type for the data returned by Supabase insert+select
// Acknowledge that Supabase client might return optional fields even if DB schema says NOT NULL
type InsertedChangelogEntry = Omit<FrontendChangelogEntry, 'published_at'> & {
  id: string;
  published_at?: string; // Explicitly mark as potentially optional from client perspective
};

/**
 * Get commit history from GitHub API
 */
async function getCommitHistory(owner: string, repo: string, count: number): Promise<Commit[]> {
  try {
    console.log(`Fetching last ${count} commits from ${owner}/${repo}...`);
    const { data: commitsData } = await octokit.repos.listCommits({
      owner,
      repo,
      per_page: count,
    });

    return commitsData.map(commit => ({
      sha: commit.sha,
      date: commit.commit.author?.date || commit.commit.committer?.date || null,
      message: commit.commit.message.split('\n')[0], // Use first line as message
      body: commit.commit.message.includes('\n') ? commit.commit.message.substring(commit.commit.message.indexOf('\n') + 1) : '',
      author_name: commit.commit.author?.name || commit.author?.login || null,
      author_email: commit.commit.author?.email || null,
    }));
  } catch (error) {
    console.error(`Error fetching GitHub history for ${owner}/${repo}:`, error);
    return [];
  }
}

/**
 * Generate changelog using OpenAI
 */
async function generateChangelog(commits: Commit[]): Promise<ChangelogOutput | null> {
  if (commits.length === 0) {
    console.error('No commits fetched from GitHub');
    return null;
  }

  // Prepare commit text for OpenAI, handling potential null values
  const commitText = commits.map(commit => {
    const author = commit.author_name || 'Unknown Author';
    const date = commit.date ? new Date(commit.date).toISOString() : 'Unknown Date';
    return `${commit.sha.substring(0, 7)} - ${date} - ${author}: ${commit.message}\n${commit.body || ''}`;
  }).join('\n\n');

  try {
    const prompt = `
You are a developer tool that helps generate user-facing changelogs for software projects.
Please analyze these git commits fetched from GitHub and generate a professional changelog entry.

Here are the recent commits:

${commitText}

Create a user-friendly changelog with the following:
1. A concise title that summarizes the main changes.
2. A brief description explaining the key updates in user-friendly terms (use Markdown).
3. Categorize the change as one of: "New Feature", "Enhancement", "Bug Fix", "Breaking Change", "Performance", "Documentation", or "Other".
4. Focus only on what would be relevant and meaningful to end-users.
5. Ignore purely internal changes (e.g., chore, ci, refactor) or minor fixes that don't affect the user experience, unless they are significant.
6. Format the output as compact JSON with fields: title, description, category.

JSON output:
`;

    console.log('Sending prompt to OpenAI...');
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that creates professional software changelogs from GitHub commits."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 600, // Increased slightly for potentially longer descriptions
      response_format: { type: "json_object" } // Request JSON output directly
    });

    const content = response.choices[0].message.content?.trim() || '';
    console.log('Received OpenAI response.');

    if (!content) {
      console.error('OpenAI returned empty content.');
      return null;
    }

    try {
      const parsedJson = JSON.parse(content);
      // Basic validation of the expected structure
      if (parsedJson.title && parsedJson.description && parsedJson.category) {
        return parsedJson as ChangelogOutput;
      } else {
        console.error('Parsed JSON from OpenAI is missing required fields (title, description, category):', parsedJson);
        return null;
      }
    } catch (error: unknown) {
      console.error('Failed to parse OpenAI response as JSON:', content);
      console.error('Error details:', error);
      return null;
    }
  } catch (error) {
    console.error('Error generating changelog with OpenAI:', error);
    return null;
  }
}

/**
 * Save the changelog to the database
 */
async function saveChangelog(changelog: ChangelogOutput, version: string | null): Promise<InsertedChangelogEntry | null> {
  try {
    const entryToInsert = {
      title: changelog.title,
      description: changelog.description,
      category: changelog.category,
      version: version || null,
    };

    console.log('Saving to Supabase...', entryToInsert);
    const { data, error } = await supabase
      .from('changelog_entries')
      .insert([entryToInsert])
      .select()
      .single<InsertedChangelogEntry>(); // Use the refined type here

    if (error) {
      console.error('Error saving to Supabase:', error);
      return null;
    }

    if (!data || !data.id) {
        console.error('Supabase insert did not return valid data with an ID.', data);
        return null;
    }

    console.log('Supabase insert successful.');
    return data;
  } catch (error) {
    console.error('Error saving changelog to database:', error);
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    const commits = await getCommitHistory(repoOwner, repoName, commitCount);

    if (commits.length === 0) {
      console.error(`No commits found in GitHub repo ${repoOwner}/${repoName}.`);
      process.exit(1);
    }

    console.log(`Generating changelog from ${commits.length} commits...`);
    const changelog = await generateChangelog(commits);

    if (!changelog) {
      console.error('Failed to generate changelog');
      process.exit(1);
    }

    console.log('\nGenerated Changelog Data:');
    console.log(JSON.stringify(changelog, null, 2));

    console.log('\nSaving to database...');
    const savedEntry = await saveChangelog(changelog, version);

    if (savedEntry) {
      console.log('\nSuccessfully saved changelog entry to database!');
      console.log(`ID: ${savedEntry.id}`);
      console.log(`Title: ${savedEntry.title}`);
      console.log(`Category: ${savedEntry.category}`);
      // Safely handle potentially undefined published_at
      const publishedDate = savedEntry.published_at ? new Date(savedEntry.published_at).toLocaleString() : 'N/A';
      console.log(`Published At: ${publishedDate}`);
    } else {
      console.error('Failed to save changelog to database or received invalid data');
      process.exit(1);
    }
  } catch (error) {
    console.error('An unexpected error occurred:', error);
    process.exit(1);
  }
}

// Run the script
main(); 