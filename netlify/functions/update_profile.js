const { IncomingForm } = require("formidable");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const bodyBuffer = event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : Buffer.from(event.body);

  return new Promise((resolve) => {
    const form = new IncomingForm({ maxFileSize: 1024 * 1024 });

    form.parse(
      {
        headers: event.headers,
        method: event.httpMethod,
        url: event.path,
        buffer: bodyBuffer,
      },
      (err, fields, files) => {
        if (err) {
          return resolve({
            statusCode: 500,
            body: JSON.stringify({ error: "Form parse failed", message: err.message }),
          });
        }
        return resolve({
          statusCode: 200,
          body: JSON.stringify({ fields, files }),
        });
      }
    );
  });
};
