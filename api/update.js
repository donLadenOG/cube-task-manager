const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

module.exports = async (req, res) => {
  const { cube, task, date } = req.body;
  const owner = 'donLadenOG'; // Replace with your GitHub username
  const repo = 'cube-task-manager';
  const path = 'data/cube-data.json';

  if (!cube || !task || !date) {
    return res.status(400).json({ error: 'Missing cube, task, or date' });
  }

  try {
    let data;
    try {
      const { data: fileData } = await octokit.repos.getContent({ owner, repo, path });
      data = JSON.parse(Buffer.from(fileData.content, 'base64').toString());
    } catch (err) {
      if (err.status === 404) {
        data = [];
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path,
          message: 'Initialize cube-data.json',
          content: Buffer.from('[]').toString('base64'),
        });
      } else {
        throw err;
      }
    }

    let cubeEntry = data.find(entry => entry.Cube === cube);
    if (!cubeEntry) {
      cubeEntry = { Cube: cube, Order: data.length, Tasks: { Prepped: null, Cleaned: null } };
      data.push(cubeEntry);
    }

    if (task === 'Prepped') {
      cubeEntry.Tasks.Prepped = date;
    } else if (task === 'Cleaned') {
      cubeEntry.Tasks.Cleaned = date;
    } else {
      return res.status(400).json({ error: `Invalid task: ${task}` });
    }

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `Update ${cube} ${task} on ${date}`,
      content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'),
      sha: data.sha || (await octokit.repos.getContent({ owner, repo, path })).data.sha,
    });

    res.status(200).json({ message: 'Task updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};