const fetch = require('node-fetch');

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ message: "Method Not Allowed" }) };
  }

  try {
    const { emp_id, uploaded_image_base64, reference_image_base64 } = JSON.parse(event.body);

    if (!uploaded_image_base64 || !reference_image_base64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Both base64 images are required." }),
      };
    }

    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN || "r8_25i8Vqts10lqAb4D597LcmD3kqIxGc43kOg5h"}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "fb2d48e857b6c011fd9855f44f3412a9fd50d822ff14b743d0b99e4506d0c26f",
        input: {
          img1: uploaded_image_base64,
          img2: reference_image_base64
        }
      }),
    });

    const data = await response.json();

    if (response.status !== 201 || !data?.urls?.get) {
      console.error("🚫 Replicate API error:", data);
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Failed to start prediction",
          details: data
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "submitted",
        prediction: data,
        prediction_id: data.id,
      }),
    };
  } catch (err) {
    console.error("❌ Server error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal error", error: err.message }),
    };
  }
};
