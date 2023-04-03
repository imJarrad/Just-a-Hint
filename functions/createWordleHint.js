// createWordleHint.js
const axios = require("axios");
const { Base64 } = require("js-base64");
const { Octokit } = require("@octokit/rest");
const { format } = require("date-fns");


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

let targetDate = new Date()
let targetDateString = targetDate.toISOString().split("T")[0];


let filePath = `src/pages/blog/posts/Wordle_hint_${targetDateString}.mdx`;


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
    const response = await axios.get(`https://www.nytimes.com/svc/wordle/v2/${targetDateString}.json`);
    return response.data;
  } catch (error) {
    console.error("Error fetching Wordle data:", error);
    throw error;
  }
}

// Send prompt to GPT3, get a hint back
async function getHintFromChatGPT(word){
  try {
    const prompt = `Write a very ambiguous Wordle hint for the word '${word}'. Your hint should be creative, vague and at least 10 words long. If the hint is less than 8 words, rewrite it until it is at least 10 words long. Do NOT use the word '${word}'.`;
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 100,
      n: 1,
      stop: null,
      temperature: 0.7,
    });

    if (response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].text.trim();
    } else {
      console.error("Error: No choices found in the API response:", response);
      console.log("Choices array content:", response.data.choices); // Log the content of the choices array
      throw new Error("No choices found in the API response");
    }
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
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
      message: `Create Wordle_hint_${targetDateString}.mdx`,
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
  let hasSolution = true;
  
  while (hasSolution) {
    // Check response from checkFileExists() to see if file already exists.  
    const fileExists = await checkFileExists();
    if (fileExists) {
      console.log("File already exists.");

      // Increment the date by 1 day
      targetDate.setDate(targetDate.getDate() + 1);
      targetDateString = targetDate.toISOString().split("T")[0];
      filePath = `src/pages/blog/posts/Wordle_hint_${targetDateString}.mdx`;

      // Continue to the next iteration of the loop
      continue;
    }


  // Grab Wordle Solution
  // If no solution, set hasSolution to false and exit the loop.
  const wordleSolution = await fetchWordleSolution();
    if (!wordleSolution || !wordleSolution.solution) {
      console.log(`No Wordle solution for ${targetDateString}`);
      hasSolution = false;
      continue;
    }

  // Pass that solution to getHintFromChatGPT(), get a hint back
  const wordleHint = await getHintFromChatGPT(wordleSolution.solution);
  

  // Assemble some markdown content
  let nlDate = format(targetDate, "eeee, dd MMMM yyyy");

  const content = `---
  layout: '../../../layouts/Post.astro'
  title: Wordle Hint for ${nlDate}
  description: A Hint for the daily Wordle on ${nlDate}
  publishDate: ${targetDateString}
  featuredImage: '/src/assets/images/genericwordle.webp'
  excerpt: 'Wordle Hint for Today...'
  tags: ['Wordle Hint']
  ---

  We get it, you’ve been up since the crack of dawn. You’re staring at your screen, trying desperately to get that coveted green row of letters. 

  What the heck could it be!??
  I’ve normally figured it out by now!
  I can’t let Aunty Margaret beat me again… 

  You’ve pored over dictionaries, thesauruses, and even that weird, dusty Scrabble book your Grandma had.

  And STILL, you just can’t get it. 

  Well, we have the answer, and we’re you’re friends, so we wrote you a hint for today’s Wordle.
  Not the answer! just a hint. 

  Ready?<br /><br />

  ----

  Our Hint for the Wordle on ${nlDate}:

  **${wordleHint}**

  ----

  Ok, we'll see you again tomorrow, 

  Just a Hint Team.
  `;

  
  // Send that content to createPost()
  await createPost(content);

    // Increment the date by 1 day
    targetDate.setDate(targetDate.getDate() + 1);
    targetDateString = targetDate.toISOString().split("T")[0];
    filePath = `src/pages/blog/posts/Wordle_hint_${targetDateString}.mdx`;
  }

  // Return confirmation
  return { statusCode: 200, body: "Wordle hint post created successfully." };
};
