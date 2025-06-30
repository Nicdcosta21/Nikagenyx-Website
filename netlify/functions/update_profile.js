const { IncomingForm } = require("formidable");
const { Readable } = require("stream");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  // Convert bodyBuffer to a stream for formidable.parse()
  const bodyBuffer = event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : Buffer.from(event.body);

  const mockReq = new Readable();
  mockReq.push(bodyBuffer);
  mockReq.push(null); // end of stream
  mockReq.headers = event.headers;
  mockReq.method = event.httpMethod;
  mockReq.url = event.path;

  return new Promise((resolve) => {
    const form = new IncomingForm({ maxFileSize: 1024 * 1024, allowEmptyFiles: true });

    form.parse(mockReq, async (err, fields, files) => {
      if (err) {
        console.error("❌ Form parse failed:", err);
        return resolve({
          statusCode: 500,
          body: JSON.stringify({ error: "Form parse failed", message: err.message }),
        });
      }

      // Your usual DB update logic here using fields and files

      resolve({
        statusCode: 200,
        body: JSON.stringify({ message: "Profile updated successfully", fields, files }),
      });
    });
  });
};
