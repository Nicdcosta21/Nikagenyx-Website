const { IncomingForm } = require("formidable");
const { Readable } = require("stream");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  const bodyBuffer = event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : Buffer.from(event.body);

  const reqStream = new Readable();
  reqStream.push(bodyBuffer);
  reqStream.push(null);

  reqStream.headers = event.headers;

  return new Promise((resolve) => {
    const form = new IncomingForm({ maxFileSize: 1024 * 1024 }); // max 1MB

    form.parse(reqStream, (err, fields, files) => {
      if (err) {
        console.error("❌ Form parse failed:", err);
        return resolve({
          statusCode: 500,
          body: JSON.stringify({ error: "Form parse failed", message: err.message }),
        });
      }

      // Validate all uploaded files (if any) have size > 0 and <= 1MB
      for (const key in files) {
        const file = files[key];
        if (file.size === 0) {
          return resolve({
            statusCode: 400,
            body: JSON.stringify({ message: `Uploaded file "${key}" is empty.` }),
          });
        }
        if (file.size > 1024 * 1024) {
          return resolve({
            statusCode: 400,
            body: JSON.stringify({ message: `Uploaded file "${key}" exceeds 1MB.` }),
          });
        }
      }

      resolve({
        statusCode: 200,
        body: JSON.stringify({
          message: "Form parsed successfully",
          fields,
          files: Object.keys(files),
        }),
      });
    });
  });
};
