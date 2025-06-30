const { IncomingForm } = require("formidable-serverless");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  // Decode body according to encoding flag
  const bodyBuffer = event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : Buffer.from(event.body);

  return new Promise((resolve) => {
    const form = new IncomingForm({ maxFileSize: 1024 * 1024 }); // max 1MB

    form.parse(
      {
        headers: event.headers,
        method: event.httpMethod,
        url: event.path,
        rawBody: bodyBuffer,
      },
      (err, fields, files) => {
        if (err) {
          console.error("❌ Form parse failed:", err);
          return resolve({
            statusCode: 500,
            body: JSON.stringify({ error: "Form parse failed", message: err.message }),
          });
        }
        // Return parsed fields and file names for debugging/demo
        return resolve({
          statusCode: 200,
          body: JSON.stringify({
            message: "Form parsed successfully",
            fields,
            files: Object.keys(files),
          }),
        });
      }
    );
  });
};
