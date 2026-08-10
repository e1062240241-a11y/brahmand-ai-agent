import { searchUserInternetData } from './search.js';
import { analyzeUserProfile } from './analyze.js';

// Entry point for starting the smart search process
async function runSearchAgent(userName) {
    console.log(`🚀 Starting Search Agent for: ${userName}`);

    // Step 1: Search the web for context on the user
    const searchData = await searchUserInternetData(userName);

    if (searchData.length === 0) {
        console.warn("⚠️ No data found on the internet.");
    }

    // Step 2: Analyze data and generate comprehensive user profile
    const profile = await analyzeUserProfile(userName, searchData);

    console.log("\n=======================================================");
    console.log(`🎯 EXTRACTED USER PROFILE`);
    console.log("=======================================================");
    console.log(JSON.stringify(profile, null, 2));
    console.log("=======================================================\n");

    return profile;
}

// Check if running directly
if (process.argv[1] && process.argv[1].endsWith('search_agent.js')) {
    const args = process.argv.slice(2);
    const targetName = args[0] || "John Doe";

    runSearchAgent(targetName);
}

export { runSearchAgent };
