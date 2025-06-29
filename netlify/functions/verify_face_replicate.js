// netlify/functions/verify_face_replicate.js

const fetch = require('node-fetch');

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" })
    };
  }

  const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || "r8_UYwueEtdEaZw23jXir2TpULqJxBDAA44ZhikM";
  const { emp_id, uploaded_image_base64, reference_image_base64, prediction_id } = JSON.parse(event.body);

  try {
    // 🔁 Polling existing prediction
    if (prediction_id) {
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction_id}`, {
        headers: {
          Authorization: `Token ${REPLICATE_TOKEN}`,
          "Content-Type": "application/json"
        }
      });

      const pollData = await pollRes.json();
      return {
        statusCode: 200,
        body: JSON.stringify(pollData)
      };
    }

    // 🧠 Start new prediction
    if (!uploaded_image_base64 || !reference_image_base64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Both base64 images are required." })
      };
    }

    const startRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${REPLICATE_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "fb2d48e857b6c011fd9855f44f3412a9fd50d822ff14b743d0b99e4506d0c26f", // skytells-research/deepface
        input: {
          img1: uploaded_image_base64,
          img2: reference_image_base64
        }
      })
    });

    const startData = await startRes.json();

    if (startRes.status !== 201 || !startData?.id || !startData?.urls?.get) {
      console.error("🚫 Failed to start prediction:", JSON.stringify(startData, null, 2));
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Failed to start prediction",
          status: startRes.status,
          details: startData
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "submitted",
        prediction_id: startData.id,
        prediction: startData
      })
    };

  } catch (err) {
    console.error("❌ Internal server error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error", error: err.message })
    };
  }
};
