import FirecrawlApp from '@mendable/firecrawl-js';
import { config } from './config.js';
import dotenv from 'dotenv';
dotenv.config();

// Create the search capability
export async function searchUserInternetData(query) {
    if (!process.env.FIRECRAWL_API_KEY) {
        console.warn("⚠️ FIRECRAWL_API_KEY is not set. Returning dummy data for search.");
        return [
            { title: 'LinkedIn - John Doe', url: 'https://linkedin.com/in/johndoe', description: 'Senior Software Engineer at XYZ Corp.' },
            { title: 'Twitter - @johndoe', url: 'https://twitter.com/johndoe', description: 'Loves building AI tools and playing cricket.' }
        ];
    }

    try {
        console.log(`🔍 Searching internet for: ${query}`);
        const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

        // Firecrawl search functionality.
        // Note: The specific arguments might need to be adjusted based on firecrawl-js API.
        const searchResponse = await app.search(query, {
             pageOptions: {
                fetchPageContent: true
             }
        });

        if (searchResponse.success) {
            console.log(`✅ Search completed. Found ${searchResponse.data.length} results.`);
            // Extract the most relevant texts from results
            return searchResponse.data.map(item => ({
                title: item.title,
                url: item.url,
                description: item.description,
                content: item.content || item.markdown || item.html || '' // Capture page text if returned
            }));
        } else {
            console.error("❌ Firecrawl search failed:", searchResponse.error);
            return [];
        }
    } catch (error) {
        console.error("❌ Error in searchUserInternetData:", error.message);
        return [];
    }
}
