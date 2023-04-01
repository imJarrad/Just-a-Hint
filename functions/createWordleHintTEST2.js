const fs = require("fs").promises;
const axios = require("axios");
const { Base64 } = require("js-base64");
const date = new Date().toISOString().split("T")[0];

async function checkFileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
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

async function createPost(filePath, content) {
  try {
    await fs.writeFile(filePath, content);
    console.log(`File created: ${filePath}`);
  } catch (error) {
    console.error("Error creating post:", error);
  }
}

exports.handler = async function (event, context) {
  const filePath = `src/pages/blog/posts/Wordle_hint_${date}.mdx`;

  const fileExists = await checkFileExists(filePath);
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
  await createPost(filePath, content);

  return { statusCode: 200, body: "Wordle hint created successfully." };
};
