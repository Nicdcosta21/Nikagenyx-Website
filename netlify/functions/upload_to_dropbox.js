const fetch = require('node-fetch');
const Busboy = require('busboy');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Only POST allowed' };
  }

  const busboy = Busboy({ headers: event.headers });
  return new Promise((resolve, reject) => {
    let fileBuffer = null;
    let fileName = null;
    let docName = "document"; // default if not passed

    busboy.on('field', (name, val) => {
      if (name === 'doc_name') {
        docName = val.toLowerCase().trim();
      }
    });

    busboy.on('file', (_, file, info) => {
      fileName = info.filename;
      const chunks = [];
      file.on('data', (chunk) => chunks.push(chunk));
      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on('finish', async () => {
      try {
        const uploadRes = await fetch('https://content.dropboxapi.com/2/files/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.DROPBOX_TOKEN}`,
            'Content-Type': 'application/octet-stream',
            'Dropbox-API-Arg': JSON.stringify({
              path: `/employees/${fileName}`,
              mode: 'add',
              autorename: true,
              mute: false
            })
          },
          body: fileBuffer
        });

        const uploadData = await uploadRes.json();

        const linkRes = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.DROPBOX_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ path: uploadData.path_display })
        });

        const linkData = await linkRes.json();
        const directLink = linkData.url.replace('?dl=0', '?raw=1');

        resolve({
          statusCode: 200,
          body: JSON.stringify({ url: directLink, name: docName })
        });
      } catch (err) {
        reject({ statusCode: 500, body: JSON.stringify({ error: err.message }) });
      }
    });

    busboy.write(event.body, event.isBase64Encoded ? 'base64' : 'binary');
    busboy.end();
  });
};
