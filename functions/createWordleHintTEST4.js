// createWordleHint.js
const axios = require("axios");
const { Base64 } = require("js-base64");
const { Octokit } = require("@octokit/rest");

const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;
const repoOwner = "imJarrad";
const repoName = "Just-a-Hint";

const octokit = new Octokit({
  auth: token,
});

const { OpenAIApi, Configuration } = require("openai");
const openaiConfig = new Configuration({ apiKey: openaiApiKey });
const openai = new OpenAIApi(openaiConfig);

const date = new Date().toISOString().split("T")[0];

const filePath = `src/pages/blog/posts/Wordle_hint_${date}.mdx`;


// Check if file already exists
async function checkFileExists() {
  try {
    await octokit.rest.repos.getContent({
      owner: repoOwner,
      repo: repoName,
      path: filePath,
    });
    return true;
  } catch (error) {
    if (error.status === 404) {
      return false;
    }
    console.error("Error checking file existence:", error);
    throw error;
  }
}

// Fetch Wordle solution from NYTimes API
async function fetchWordleSolution() {
  try {
    const response = await axios.get(`https://www.nytimes.com/svc/wordle/v2/${date}.json`);
    return response.data;
  } catch (error) {
    console.error("Error fetching Wordle data:", error);
    throw error;
  }
}

// Send prompt to GPT3.5, get a hint back
async function getHintFromChatGPT(word) {
  try {
    const prompt = `Write a very ambiguous Wordle hint for the word '${word}'. Your hint should be creative, vague and at least 10 words long. If the hint is less than 8 words, rewrite it until it is at least 10 words long. Do NOT use the word '${word}'.`;
    const response = await openai.createCompletion({
      model: "gpt-3.5-turbo",
      prompt: prompt,
      max_tokens: 100,
      n: 1,
      stop: null,
      temperature: 0.5,
    });

    return response.data.choices[0].text.trim();
  } catch (error) {
    console.error("Error getting hint from ChatGPT:", error);
    throw error;
  }
}

// Creates a new post in GitHub repo
async function createPost(content) {
  try {
    const base64Content = Base64.encode(content);
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: repoOwner,
      repo: repoName,
      path: filePath,
      message: `Create Wordle_hint_${date}.mdx`,
      content: base64Content,
    });
    console.log(`File created: ${filePath}`);
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
}

// Tie it all together
exports.handler = async function (event, context) {
  
   //Check response from checkFileExists() to see if file already exists.  
  // If it does, return 400 error and exit.
  const fileExists = await checkFileExists();
  if (fileExists) {
    console.log("File already exists.");
    return { statusCode: 400, body: "File already exists." };
  }

  // Grab Wordle Solution
  // If no solution, return 400 error and exit.
  const wordleSolution = await fetchWordleSolution();
  if (!wordleSolution || !wordleSolution.solution) {
    console.log(`No Wordle solution for ${date}`);
    return { statusCode: 400, body: `No Wordle solution for ${date}` };
  }

  // Pass that solution to getHintFromChatGPT(), get a hint back
  const wordleHint = await getHintFromChatGPT(wordleSolution.solution);
  
  // Assemble some markdown content
  const content = `---\ntitle: "Wordle Hint for ${date}"\ndate: "${date}"\n---\n\n${wordleHint}`;
  
  // Send that content to createPost()
  await createPost(content);

  // Return confirmation
  return { statusCode: 200, body: "Wordle hint post created successfully." };
};
