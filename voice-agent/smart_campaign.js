import { searchUserInternetData } from './search.js';
import { analyzeUserDataAndGeneratePrompt } from './analyze.js';

// Entry point for starting the smart multimodal process
async function runSmartCampaign(userName, phone) {
    console.log(`🚀 Starting Smart Campaign for: ${userName} (${phone})`);

    // Step 1: Search the web for context on the user
    const searchData = await searchUserInternetData(userName);

    if (searchData.length === 0) {
        console.warn("⚠️ No data found on the internet. Proceeding with default generic approach.");
    }

    // Step 2: Analyze data and generate dynamic tone/script
    const analysis = await analyzeUserDataAndGeneratePrompt(userName, searchData);

    console.log("\n=======================================================");
    console.log(`🎯 TARGET TONE: ${analysis.tone}`);
    console.log("=======================================================");
    console.log(`📝 GENERATED PROMPT FOR VOICE AGENT:\n${analysis.prompt}`);
    console.log("=======================================================\n");

    // Step 3: Trigger Outbound Call (Placeholder for now)
    console.log(`📞 [Future Feature] Agent is now ready to call ${phone} using the generated custom prompt!`);

    /*
     * To integrate with calling:
     * 1. Save this custom prompt to the database or pass it directly to `voice.js`.
     * 2. Call `initiateOutboundCall(phone, streamUrl)`.
     */
}

// Check if running directly
if (process.argv[1] && process.argv[1].endsWith('smart_campaign.js')) {
    const args = process.argv.slice(2);
    const targetName = args[0] || "John Doe";
    const targetPhone = args[1] || "+1234567890";

    runSmartCampaign(targetName, targetPhone);
}

export { runSmartCampaign };
