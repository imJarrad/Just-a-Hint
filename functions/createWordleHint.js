// ./functions/createWordleHint.js
const { Octokit } = require("@octokit/rest");
const axios = require("axios");
const { Configuration, OpenAIApi } = require("openai");

const openaiApiKey = process.env.OPENAI_API_KEY;
const openaiConfig = new Configuration({ apiKey: openaiApiKey });
const openai = new OpenAIApi(openaiConfig);



// This function will call the Wordle API to get the answer for the given date
async function fetchWordle(date) {
  try {
    const response = await axios.get(`https://www.nytimes.com/svc/wordle/v2/${date.toISOString().slice(0, 10)}.json`);
    return response.data;
  } catch (error) {
    console.error("Error fetching Wordle data:", error);
    throw error;
  }
}

// This function will call the OpenAI ChatGPT API to write a hint for the given word
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

// This function will assemble the content for the new hint file
function createHintFileContent(date, hint) {
  const dateString = date.toISOString().slice(0, 10);
  return `---
title: Wordle Hint for ${dateString}
date: ${dateString}
---

# Wordle Hint for ${dateString}

Here's a hint to help you solve today's Wordle: **${hint}**`;
}

// This is the main function that calls the other little async functions
// It grabs the list of existing hints, finds the next date without a hint, and then calls the Wordle API to get the answer
// Then it calls the ChatGPT API to write a hint, and it creates a new .mdx file with the hint
exports.handler = async (event) => {
  try {
    const accessToken = process.env.GITHUB_ACCESS_TOKEN;
    const octokit = new Octokit({ auth: accessToken });

    const repoOwner = "imJarrad";
    const repoName = "Just-a-Hint";

    const existingHints = await getExistingHints(octokit, repoOwner, repoName);

    const currentDate = new Date();
    let nextDate = new Date(currentDate);
    let foundDate = false;

    while (!foundDate) {
      nextDate.setDate(nextDate.getDate() + 1);
      if (!existingHints.includes(`Wordle hint - ${nextDate.toISOString().slice(0, 10)}.mdx`)) {
        foundDate = true;
      }
    }

    const wordleResponse = await fetchWordle(nextDate);
    if (wordleResponse.status === "ERROR") {
      throw new Error("Wordle API returned an error: " + JSON.stringify(wordleResponse));
    }
    
    const hint = await getHintFromChatGPT(wordleResponse.solution);
     

    const hintFileContent = createHintFileContent(nextDate, hint);
    const base64Content = Buffer.from(hintFileContent).toString("base64");

    const commitResponse = await octokit.repos.createOrUpdateFileContents({
      owner: repoOwner,
      repo: repoName,
      path: `src/pages/blog/posts/Wordle hint - ${nextDate.toLocaleString('default', { month: 'long' })} ${nextDate.getDate()}.mdx`,
      message: `Add Wordle hint for ${nextDate.toISOString().slice(0, 10)}`,
      content: base64Content,
      committer: {
        name: "imJarrad",
        email: "jarradmclean@gmail.com",
      },
      author: {
        name: "imJarrad",
        email: "jarradmclean@gmail.com",
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Hint file created successfully",
        hintDate: nextDate.toISOString().slice(0, 10),
      }),
    };
  } catch (error) {
    console.error("Error creating file:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};