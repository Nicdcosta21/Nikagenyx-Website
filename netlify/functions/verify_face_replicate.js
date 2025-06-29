const fetch = require('node-fetch');

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ message: "Method Not Allowed" }) };
  }

  const token = "r8_UYwueEtdEaZw23jXir2TpULqJxBDAA44ZhikM"; // Your latest token
  const { emp_id, uploaded_image_base64, reference_image_base64, prediction_id } = JSON.parse(event.body);

  try {
    // 🔁 Polling mode
    if (prediction_id) {
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction_id}`, {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json"
        }
      });

      const pollData = await pollRes.json();
      return {
        statusCode: 200,
        body: JSON.stringify(pollData)
      };
    }

    // 🧠 Start prediction
    if (!uploaded_image_base64 || !reference_image_base64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Both base64 images are required." })
      };
    }

    const startRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "fb2d48e857b6c011fd9855f44f3412a9fd50d822ff14b743d0b99e4506d0c26f",
        input: {
          img1: uploaded_image_base64,
          img2: reference_image_base64
        }
      })
    });

    const data = await startRes.json();

    if (startRes.status !== 201 || !data?.id) {
      console.error("🚫 Failed to start prediction:", data);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Failed to start prediction", details: data })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "submitted",
        prediction_id: data.id,
        prediction: data
      })
    };

  } catch (err) {
    console.error("❌ Server error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal error", error: err.message })
    };
  }
};
