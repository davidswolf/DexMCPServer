#!/usr/bin/env node

/**
 * Test script to verify full-text search finds Michael StClaire
 * when searching for "recruiter screen interview at Anthropic"
 */

import { getConfig } from './dist/config.js';
import { DexClient } from './dist/dex-client.js';
import { FullTextSearchIndex } from './dist/search/full-text-index.js';

async function main() {
  console.log('Testing full-text search for Michael StClaire...\n');

  try {
    // Initialize
    const config = getConfig();
    const client = new DexClient(config);
    const searchIndex = new FullTextSearchIndex(config.searchCacheTTLMinutes);

    // Refresh index (loads all contacts, notes, reminders)
    console.log('Loading and indexing all contact data...');
    await searchIndex.refreshIndex(client);
    const stats = searchIndex.getMemoryStats();
    console.log(`Indexed ${stats.contactCount} contacts, ${stats.documentCount} documents (~${stats.estimatedSizeMB.toFixed(2)} MB)\n`);

    // Test query
    const query = 'recruiter screen interview at Anthropic';
    console.log(`Searching for: "${query}"\n`);

    const results = searchIndex.search(query, {
      maxResults: 10,
      minConfidence: 30, // Lower threshold to catch more results
    });

    console.log(`Found ${results.length} results:\n`);

    if (results.length === 0) {
      console.log('❌ No results found');

      // Try alternative queries
      console.log('\n\nTrying alternative queries...\n');

      const altQueries = [
        'Anthropic',
        'recruiter screen',
        'interview',
        'Michael StClaire',
        'StClaire'
      ];

      for (const altQuery of altQueries) {
        const altResults = searchIndex.search(altQuery, {
          maxResults: 3,
          minConfidence: 30,
        });
        console.log(`"${altQuery}": ${altResults.length} results`);
        if (altResults.length > 0) {
          altResults.forEach((r, i) => {
            const name = `${r.contact.first_name} ${r.contact.last_name}`.trim();
            console.log(`  ${i + 1}. ${name} (${r.confidence}% confidence)`);
          });
        }
      }
      return;
    }

    // Display results
    results.forEach((result, index) => {
      const name = `${result.contact.first_name} ${result.contact.last_name}`.trim();
      console.log(`${index + 1}. ${name} (${result.confidence}% confidence)`);
      console.log(`   Job: ${result.contact.job_title || 'N/A'}`);
      console.log(`   Email: ${result.contact.emails?.[0]?.email || 'N/A'}`);
      console.log(`   Matches found in:`);

      result.matchContext.forEach(match => {
        console.log(`     - ${match.documentType} [${match.field}]:`);
        console.log(`       "${match.snippet}"`);
      });
      console.log();
    });

    // Check if Michael StClaire is in the results
    const foundMichael = results.some(r => {
      const name = `${r.contact.first_name} ${r.contact.last_name}`.toLowerCase();
      return name.includes('michael') && name.includes('stclaire');
    });

    if (foundMichael) {
      console.log('✅ SUCCESS: Michael StClaire was found in the results!');
    } else {
      console.log('❌ FAILURE: Michael StClaire was NOT found in the results');
      console.log('\nSearching specifically for "Michael StClaire"...');

      const michaelResults = searchIndex.search('Michael StClaire', {
        maxResults: 5,
        minConfidence: 30,
      });

      if (michaelResults.length > 0) {
        console.log(`Found ${michaelResults.length} results for "Michael StClaire":`);
        michaelResults.forEach((r, i) => {
          const name = `${r.contact.first_name} ${r.contact.last_name}`.trim();
          console.log(`  ${i + 1}. ${name} (${r.confidence}% confidence)`);
        });
      } else {
        console.log('Michael StClaire not found in the database');
      }
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
