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

  // Create a readable stream from the buffer
  const reqStream = new Readable();
  reqStream.push(bodyBuffer);
  reqStream.push(null);

  // Attach headers to the stream for formidable
  reqStream.headers = event.headers;

  return new Promise((resolve) => {
    const form = new IncomingForm({ maxFileSize: 1024 * 1024 });

    form.parse(reqStream, (err, fields, files) => {
      if (err) {
        console.error("❌ Form parse failed:", err);
        return resolve({
          statusCode: 500,
          body: JSON.stringify({ error: "Form parse failed", message: err.message }),
        });
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
