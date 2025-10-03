#!/usr/bin/env node

/**
 * Test various search queries to verify fuzzy matching works
 */

import { getConfig } from './dist/config.js';
import { DexClient } from './dist/dex-client.js';
import { FullTextSearchIndex } from './dist/search/full-text-index.js';

async function testQuery(searchIndex: FullTextSearchIndex, query: string, expectMichael: boolean = true) {
  const results = searchIndex.search(query, {
    maxResults: 5,
    minConfidence: 30,
  });

  const foundMichael = results.some(r => {
    const name = `${r.contact.first_name} ${r.contact.last_name}`.toLowerCase();
    return name.includes('michael') && name.includes('stclaire');
  });

  const status = foundMichael === expectMichael ? '✅' : '❌';
  console.log(`${status} "${query}"`);
  console.log(`   Found ${results.length} results, Michael StClaire: ${foundMichael ? 'YES' : 'NO'}`);

  if (results.length > 0 && results.length <= 3) {
    results.forEach((r, i) => {
      const name = `${r.contact.first_name} ${r.contact.last_name}`.trim();
      console.log(`   ${i + 1}. ${name} (${r.confidence}%)`);
    });
  }
  console.log();
}

async function main() {
  console.log('Testing full-text search with various queries...\n');

  const config = getConfig();
  const client = new DexClient(config);
  const searchIndex = new FullTextSearchIndex(config.searchCacheTTLMinutes);

  console.log('Loading index...');
  await searchIndex.refreshIndex(client);
  console.log('Index loaded!\n');

  // Test queries that should find Michael StClaire
  console.log('Queries that SHOULD find Michael StClaire:\n');

  await testQuery(searchIndex, 'recruiter screen interview at Anthropic', true);
  await testQuery(searchIndex, 'Anthropic recruiter', true);
  await testQuery(searchIndex, 'Technical Sourcer', true);
  await testQuery(searchIndex, 'Michael StClaire', true);
  await testQuery(searchIndex, 'StClaire', true);
  await testQuery(searchIndex, 'recruiter position Anthropic', true);

  // Test queries that might or might not find Michael
  console.log('\nOther interesting queries:\n');

  await testQuery(searchIndex, 'interview', false);
  await testQuery(searchIndex, 'Anthropic', false);
  await testQuery(searchIndex, 'sourcer', false);
}

main();
