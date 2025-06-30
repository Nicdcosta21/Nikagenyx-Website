const { IncomingForm } = require("formidable-serverless");
const { Readable } = require("stream");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  // Convert body buffer into a readable stream
  const bodyBuffer = event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : Buffer.from(event.body);

  // Create a readable stream from buffer for formidable
  const reqStream = new Readable();
  reqStream.push(bodyBuffer);
  reqStream.push(null); // End of stream

  return new Promise((resolve) => {
    const form = new IncomingForm({ maxFileSize: 1024 * 1024 }); // 1MB limit

    form.parse(reqStream, (err, fields, files) => {
      if (err) {
        console.error("❌ Form parse failed:", err);
        return resolve({
          statusCode: 500,
          body: JSON.stringify({ error: "Form parse failed", message: err.message }),
        });
      }

      // For debugging/demo: return fields and uploaded file names
      return resolve({
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
