/**
 * Fetches repository information to get total commit count
 */
export async function getRepositoryInfo(octokit, owner, repo) {
  try {
    console.log(`Fetching repository information for ${owner}/${repo}...`);
    const { data } = await octokit.repos.get({
      owner,
      repo
    });

    return {
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      defaultBranch: data.default_branch,
      createdAt: data.created_at,
      pushedAt: data.pushed_at,
      // Note: GitHub doesn't provide total commit count via REST API directly
    };
  } catch (error) {
    console.error(`Error fetching repository info for ${owner}/${repo}:`, error);
    return null;
  }
}

/**
 * Get commit history from GitHub API for recent commits
 */
export async function getRecentCommits(octokit, owner, repo, count) {
  try {
    console.log(`Fetching last ${count} commits from ${owner}/${repo}...`);
    const { data: commitsData } = await octokit.repos.listCommits({
      owner,
      repo,
      per_page: count,
    });

    return commitsData.map(formatCommit);
  } catch (error) {
    console.error(`Error fetching GitHub history for ${owner}/${repo}:`, error);
    return [];
  }
}

/**
 * Get all commits in batches
 */
export async function getAllCommitsInBatches(octokit, owner, repo, batchSize, maxEntries) {
  try {
    console.log(`Fetching commits from ${owner}/${repo} in batches of ${batchSize}...`);
    
    let allBatches = [];
    let page = 1;
    let hasMoreCommits = true;
    let totalCommits = 0;
    
    // Set a high per_page value to minimize API calls
    // GitHub limits to 100 per page max
    const perPage = Math.min(batchSize, 100);
    
    while (hasMoreCommits && allBatches.length < maxEntries) {
      console.log(`Fetching page ${page} of commits...`);
      
      const { data: commitsData } = await octokit.repos.listCommits({
        owner,
        repo,
        per_page: perPage,
        page: page,
      });
      
      if (commitsData.length === 0) {
        hasMoreCommits = false;
        break;
      }
      
      totalCommits += commitsData.length;
      
      // Format commits to our internal structure
      const formattedCommits = commitsData.map(formatCommit);
      
      // Add this batch to our collection
      const currentBatch = { 
        commits: formattedCommits,
        batchNumber: page,
        fromDate: formattedCommits[formattedCommits.length - 1].date,
        toDate: formattedCommits[0].date
      };
      
      allBatches.push(currentBatch);
      
      // Move to next page
      page++;
      
      // If we don't have a complete batch, we've reached the end
      if (commitsData.length < perPage) {
        hasMoreCommits = false;
      }
      
      // If we've reached max entries, stop
      if (allBatches.length >= maxEntries) {
        console.log(`Reached maximum number of batches (${maxEntries})`);
        break;
      }
    }
    
    console.log(`Fetched a total of ${totalCommits} commits in ${allBatches.length} batches`);
    return allBatches;
  } catch (error) {
    console.error(`Error fetching all commits from ${owner}/${repo}:`, error);
    return [];
  }
}

/**
 * Helper to format a commit from GitHub API to our internal structure
 */
function formatCommit(commit) {
  return {
    sha: commit.sha,
    date: commit.commit.author?.date || commit.commit.committer?.date || null,
    message: commit.commit.message.split('\n')[0], // Use first line as message
    body: commit.commit.message.includes('\n') ? commit.commit.message.substring(commit.commit.message.indexOf('\n') + 1) : '',
    author_name: commit.commit.author?.name || commit.author?.login || null,
    author_email: commit.commit.author?.email || null,
  };
}

/**
 * Generate changelog using OpenAI
 */
export async function generateChangelog(openai, commits, batchInfo = null) {
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

  // Add batch information for comprehensive mode
  let batchDescription = '';
  if (batchInfo) {
    const fromDate = batchInfo.fromDate ? new Date(batchInfo.fromDate).toLocaleDateString() : 'unknown date';
    const toDate = batchInfo.toDate ? new Date(batchInfo.toDate).toLocaleDateString() : 'unknown date';
    batchDescription = `\nThis is batch #${batchInfo.batchNumber} covering commits from ${fromDate} to ${toDate}.`;
  }

  try {
    const prompt = `
You are a developer tool that helps generate user-facing changelogs for software projects.
Please analyze these git commits fetched from GitHub and generate a professional changelog entry.${batchDescription}

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
        return parsedJson;
      } else {
        console.error('Parsed JSON from OpenAI is missing required fields (title, description, category):', parsedJson);
        return null;
      }
    } catch (error) {
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
export async function saveChangelog(supabase, changelog, version, dateRange = null, dryRun = false, repoInfo = null) {
  try {
    const entryToInsert = {
      title: changelog.title,
      description: changelog.description,
      category: changelog.category,
      version: version || null,
      // Add repository information if available
      ...(repoInfo && { 
        repo_owner: repoInfo.owner || repoInfo.fullName?.split('/')[0],
        repo_name: repoInfo.name || repoInfo.fullName?.split('/')[1]
      }),
      // If we have a date range, add it to the metadata
      ...(dateRange && { 
        metadata: JSON.stringify({
          date_range: dateRange
        }) 
      })
    };

    console.log('Saving to Supabase...', entryToInsert);
    
    if (dryRun) {
      console.log('DRY RUN: Would save this entry to database');
      // Return a mock entry for the console output
      return {
        id: 'dry-run-id',
        ...entryToInsert,
        published_at: new Date().toISOString()
      };
    }
    
    const { data, error } = await supabase
      .from('changelog_entries')
      .insert([entryToInsert])
      .select()
      .single();

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
 * Processes a batch of commits and generates a changelog entry
 */
export async function processBatch(octokit, openai, supabase, batch, batchNumber, totalBatches, versionPrefix, dryRun = false, repoInfo = null) {
  console.log(`Processing batch ${batchNumber}/${totalBatches} with ${batch.commits.length} commits...`);
  
  // Generate a version string if needed
  const batchVersion = versionPrefix 
    ? `${versionPrefix}-batch-${batchNumber}` 
    : `batch-${batchNumber}`;
  
  // Create a date range for this batch
  const dateRange = {
    from: batch.fromDate ? new Date(batch.fromDate).toISOString() : null,
    to: batch.toDate ? new Date(batch.toDate).toISOString() : null
  };
  
  // Generate changelog for this batch
  const changelog = await generateChangelog(
    openai,
    batch.commits, 
    { batchNumber, fromDate: dateRange.from, toDate: dateRange.to }
  );
  
  if (!changelog) {
    console.error(`Failed to generate changelog for batch ${batchNumber}`);
    return null;
  }
  
  console.log(`Generated changelog for batch ${batchNumber}:`);
  console.log(JSON.stringify(changelog, null, 2));
  
  // Save changelog to database with batch-specific version
  const savedEntry = await saveChangelog(supabase, changelog, batchVersion, dateRange, dryRun, repoInfo);
  
  if (savedEntry) {
    console.log(`Successfully saved changelog for batch ${batchNumber} with ID: ${savedEntry.id || 'N/A'}`);
    return savedEntry;
  } else {
    console.error(`Failed to save changelog for batch ${batchNumber}`);
    return null;
  }
}

/**
 * Processes all batches in series (to avoid OpenAI rate limits)
 */
export async function processAllBatches(octokit, openai, supabase, batches, versionPrefix, dryRun = false, repoInfo = null) {
  const totalBatches = batches.length;
  console.log(`Processing ${totalBatches} batches...`);
  
  const results = [];
  
  for (let i = 0; i < batches.length; i++) {
    const batchNumber = i + 1;
    const result = await processBatch(octokit, openai, supabase, batches[i], batchNumber, totalBatches, versionPrefix, dryRun, repoInfo);
    
    if (result) {
      results.push(result);
    }
    
    // Add a small delay between batches to avoid rate limits
    if (i < batches.length - 1) {
      const delay = 1000; // 1 second delay
      console.log(`Waiting ${delay}ms before processing next batch...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return results;
} 