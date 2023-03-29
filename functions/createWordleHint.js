// ./functions/createWordleHint.js
const { Octokit } = require("@octokit/rest");
const axios = require("axios");
const openai = require("openai");

exports.handler = async (event, context) => {
    try {
      // Replace with your GitHub Personal Access Token and OpenAI API Key
      const accessToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
      const openaiApiKey = process.env.OPENAI_API_KEY;
  
      // Replace with your repo's owner and name
      const repoOwner = "imJarrad";
      const repoName = "Just-a-Hint";
  
      // Get the daily Wordle answer (using the correct Wordle API)
      // Format the date to use in the API URL
      const date = new Date();
      const formattedDate = date.toISOString().slice(0, 10);
  
      // This makes a request to the Wordle API to get the daily answer
      const wordleResponse = await axios.get(`https://www.nytimes.com/svc/wordle/v2/${formattedDate}.json`);
      const wordleAnswer = wordleResponse.data.solution;
  
      // Get a hint from ChatGPT for the Wordle answer
      // This function will be defined to call the ChatGPT API with the Wordle answer
      const hint = await getHintFromChatGPT(wordleAnswer);
  
      // Create the contents of the .mdx file
      // Generate the file name based on today's date and the .mdx extension
      const fileName = `${formattedDate}-wordle-hint.mdx`;
  
      // Assemble the file contents using the hint and the date
      const fileContents = 
        `---
        title: Wordle Hint for ${formattedDate}
        date: ${formattedDate}
        ---
        # Wordle Hint for ${formattedDate}
        Here's a hint to help you solve today's Wordle: **${hint}**
        `;

    // Initialize the Octokit library with your GitHub Personal Access Token
    const octokit = new Octokit({ auth: accessToken });

    // Create the .mdx file in the GitHub repository
    await octokit.repos.createOrUpdateFileContents({
      owner: imJarrad,
      repo: Just-a-Hint,
      path: `_posts/${fileName}`,
      message: `Add Wordle hint for ${formattedDate}`,
      content: Buffer.from(fileContents).toString("base64"),
      committer: {
        name: repoOwner,
        email: "jarradmclean@gmail.com",
      },
      author: {
        name: repoOwner,
        email: "jarradmclean@gmail.com",
      },
    });

    return {
      statusCode: 200,
      body: "File created successfully",
    };
  } catch (error) {
    console.error("Error creating file:", error);
    return {
      statusCode: 500,
      body: "Error creating file",
    };
  }
};

// This function calls the ChatGPT API with the Wordle answer and returns a hint
async function getHintFromChatGPT(word) {
  openai.apiKey = process.env.OPENAI_API_KEY;

  const prompt = `Write a hint for the Wordle word: ${word}`;
  const response = await openai.Completion.create({
    engine: "davinci-codex",
    prompt: prompt,
    max_tokens: 50,
    n: 1,
    stop: null,
    temperature: 0.7,
  });

  return response.choices[0].text.trim();
}
