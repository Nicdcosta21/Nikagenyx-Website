const fetch = require('node-fetch');
const Busboy = require('busboy');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const busboy = Busboy({ headers: event.headers });
  const fileBuffers = [];

  return new Promise((resolve, reject) => {
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      const chunks = [];
      file.on('data', (chunk) => chunks.push(chunk));
      file.on('end', async () => {
        const buffer = Buffer.concat(chunks);

        try {
          const dropboxRes = await fetch('https://content.dropboxapi.com/2/files/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.DROPBOX_TOKEN}`,
              'Content-Type': 'application/octet-stream',
              'Dropbox-API-Arg': JSON.stringify({
                path: `/employees/${filename}`,
                mode: 'add',
                autorename: true,
                mute: false
              })
            },
            body: buffer
          });

          const dropboxData = await dropboxRes.json();

          // Generate a temporary download link
          const shareRes = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.DROPBOX_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: dropboxData.path_display })
          });

          const shareData = await shareRes.json();
          resolve({
            statusCode: 200,
            body: JSON.stringify({ url: shareData.url.replace('?dl=0', '?raw=1'), name: filename })
          });
        } catch (err) {
          reject({ statusCode: 500, body: JSON.stringify({ error: 'Upload failed', details: err.message }) });
        }
      });
    });

    busboy.write(event.body, event.isBase64Encoded ? 'base64' : 'binary');
    busboy.end();
  });
};
