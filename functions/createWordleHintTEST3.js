const axios = require("axios");
const { Base64 } = require("js-base64");
const { Octokit } = require("@octokit/rest");
const date = new Date().toISOString().split("T")[0];

const repoOwner = "imJarrad";
const repoName = "Just-a-Hint";
const filePath = `src/pages/blog/posts/Wordle_hint_${date}.mdx`;
const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

const octokit = new Octokit({
  auth: token,
});

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

async function fetchWordleSolution() {
  try {
    const response = await axios.get(`https://www.nytimes.com/svc/wordle/v2/${date}.json`);
    return response.data;
  } catch (error) {
    console.error("Error fetching Wordle data:", error);
    throw error;
  }
}

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

exports.handler = async function (event, context) {
  const fileExists = await checkFileExists();
  if (fileExists) {
    console.log("File already exists.");
    return { statusCode: 400, body: "File already exists." };
  }

  const wordleSolution = await fetchWordleSolution();
  if (!wordleSolution || !wordleSolution.solution) {
    console.log(`No Wordle solution for ${date}`);
    return { statusCode: 400, body: `No Wordle solution for ${date}` };
  }

  const content = `---\ntitle: "Wordle Hint for ${date}"\ndate: "${date}"\n---\n\n${wordleSolution.solution}`;
  await createPost(content);

  return { statusCode: 200, body: "Wordle hint post created successfully." };
};
