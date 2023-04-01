const { Octokit } = require("@octokit/core");
const { Base64 } = require("js-base64");
const axios = require("axios");
const fs = require('fs/promises');

const octokit = new Octokit({ auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN });

const repoOwner = "imJarrad";
const repoName = "Just-a-Hint";

// Function to check if a file exists for the given date
async function checkFileExists(date) {
  try {
    const fileData = await octokit.repos.getContent({
      owner: repoOwner,
      repo: repoName,
      path: `src/pages/blog/posts/Wordle_hint_${date}.mdx`,
    });

    return fileData.data;
  } catch (error) {
    if (error.status === 404) {
      return null;
    } else {
      console.error("Error fetching file data:", error);
      throw error;
    }
  }
}

// Call the Wordle API to get the answer for the given date
async function getWordleSolution(date) {
    try {
      const response = await axios.get(`https://www.nytimes.com/svc/wordle/v2/${date}.json`);
      return response.data;
    } catch (error) {
      console.error("Error fetching Wordle data:", error);
      throw error;
    }
  }

// Function to create a new post with the Wordle solution
async function createPost(date, solution) {
  const content = `---\ntitle: "Wordle hint - ${date}"\n---\n\n${solution}`;
  const base64Content = Base64.encode(content);

  await octokit.repos.createOrUpdateFileContents({
    owner: repoOwner,
    repo: repoName,
    path: `src/pages/blog/posts/Wordle_hint_${date}.mdx`,
    message: `Add Wordle hint for ${date}`,
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
}


// Tie it all together
exports.handler = async function () {
  const date = new Date().toISOString().slice(0, 10);
  const fileExists = await checkFileExists(date);

  if (fileExists) {
    console.log("File already exists.");
  } else {
    const wordleSolution = await getWordleSolution(date);

    if (!wordleSolution) {
      console.log(`No Wordle solution for ${date}`);
    } else {
      await createPost(date, wordleSolution);
    }
  }
};
