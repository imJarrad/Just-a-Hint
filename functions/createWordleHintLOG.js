const axios = require("axios");
const { Octokit } = require("@octokit/rest");

// Function to check if a file exists for the given date
async function checkFileExists(octokit, repoOwner, repoName, date) {
    try {
      const response = await octokit.repos.getContent({
        owner: repoOwner,
        repo: repoName,
        path: `src/pages/blog/posts/Wordle_hint_${date}.mdx`,
      });
      if (response.status === 200) {
        return true;
      }
      return false;
    } catch (error) {
      if (error.status === 404) {
        return false;
      }
      console.error("Error checking file existence:", error);
      console.error("Error object:", error);
      throw error;
    }
}

// Call the Wordle API to get the answer for the given date
async function fetchWordleSolution(date) {
  try {
    const response = await axios.get(`https://www.nytimes.com/svc/wordle/v2/${date}.json`);
    return response.data;
  } catch (error) {
    console.error("Error fetching Wordle data:", error);
    throw error;
  }
}

// Function to create a new post with the Wordle solution
async function createPost(octokit, repoOwner, repoName, date, wordleSolution) {
    try {
      const hintFileContent = `---
  title: "Wordle hint - ${date}"
  ---
  
  ${wordleSolution}
  `;
  
      const base64Content = Buffer.from(hintFileContent).toString("base64");
  
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
        // Add the following line to make the function create a new file
        // or update the file if it already exists
        sha: fileExists ? fileExists.sha : undefined,
      });
      
  
      console.log(`Created post for ${date} with Wordle solution: ${wordleSolution}`);
    } catch (error) {
      console.error("Error creating post:", error);
      throw error;
    }
  }

exports.handler = async (event, context) => {
    try {
      // Initialize Octokit with GitHub access token
      const accessToken = process.env.GITHUB_ACCESS_TOKEN;
      const octokit = new Octokit({ auth: accessToken });
  
      // Repository owner and name
      const repoOwner = "imJarrad";
      const repoName = "Just-a-Hint";
  
      // Get today's date in ISO format
      const today = new Date().toISOString().slice(0, 10);
  
      // Check if the file exists for today's date
      const fileExists = await checkFileExists(octokit, repoOwner, repoName, today);
  
      // If the file already exists, return an error message
      if (fileExists) {
        console.log("File for today's date already exists");
        return {
          statusCode: 400,
          body: JSON.stringify({
            message: "File for today's date already exists",
          }),
        };
      }
  
      // If the file does not exist, fetch Wordle solution for today's date and create a new post
      const wordleSolution = await fetchWordleSolution(today);
      console.log("Wordle solution fetched:", wordleSolution);
      await createPost(octokit, repoOwner, repoName, today, wordleSolution);
  
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "File created successfully",
        }),
      };
    } catch (error) {
      console.error("Error in main function:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }
  };
  

