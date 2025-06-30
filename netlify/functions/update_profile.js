exports.handler = async (event) => {
  console.log("Received event:", event);

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Minimal function works",
      isBase64Encoded: event.isBase64Encoded,
      bodySample: event.body?.substring(0, 100),
    }),
  };
};
