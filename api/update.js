export default async (req, res) => {
  const { Octokit } = await import('@octokit/rest');
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const { cube, task, date } = req.body;
  const owner = 'donLadenOG'; // Replace with your GitHub username
  const repo = 'cube-task-manager';
  const path = 'data/cube-data.json';

  if (!cube || !task || !date) {
    console.error('Missing parameters:', { cube, task, date });
    return res.status(400).json({ error: 'Missing cube, task, or date' });
  }

  try {
    let fileData;
    try {
      console.log('Fetching file:', { owner, repo, path });
      fileData = await octokit.repos.getContent({ owner, repo, path });
      console.log('File fetched:', fileData.data.sha);
    } catch (err) {
      console.error('Get content error:', err);
      if (err.status === 404) {
        console.log('File not found, initializing:', path);
        fileData = await octokit.repos.createOrUpdateFileContents({
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

    const data = fileData.data.content
      ? JSON.parse(Buffer.from(fileData.data.content, 'base64').toString())
      : [];

    let cubeEntry = data.find(entry => entry.Cube === cube);
    if (!cubeEntry) {
      console.log('Creating new cube entry:', cube);
      cubeEntry = { Cube: cube, Order: data.length, Tasks: { Prepped: null, Cleaned: null } };
      data.push(cubeEntry);
    }

    if (task === 'Prepped') {
      cubeEntry.Tasks.Prepped = date;
    } else if (task === 'Cleaned') {
      cubeEntry.Tasks.Cleaned = date;
    } else {
      console.error('Invalid task:', task);
      return res.status(400).json({ error: `Invalid task: ${task}` });
    }

    console.log('Updating file with data:', JSON.stringify(data, null, 2));
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `Update ${cube} ${task} on ${date}`,
      content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'),
      sha: fileData.data.sha,
    });

    console.log('Update successful:', { cube, task, date });
    res.status(200).json({ message: 'Task updated successfully' });
  } catch (err) {
    console.error('Update error:', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
};
