const fetch = require("node-fetch");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  const token = "r8_UYwueEtdEaZw23jXir2TpULqJxBDAA44ZhikM";
  const body = JSON.parse(event.body);
  const { emp_id, uploaded_image_base64, reference_image_base64, prediction_id } = body;

  try {
    // 🔁 Polling Mode
    if (prediction_id) {
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction_id}`, {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      });
      const pollData = await pollRes.json();
      return {
        statusCode: 200,
        body: JSON.stringify(pollData),
      };
    }

    // 🧠 Start Prediction
    if (!uploaded_image_base64 || !reference_image_base64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Both base64 images are required." }),
      };
    }

    const startRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "cbebce49ce6469d1f32dc433efef3bb7d8d7f5a03874d16b9fd785f4f15f4c41",
        input: {
          img1: `data:image/jpeg;base64,${uploaded_image_base64}`,
          img2: `data:image/jpeg;base64,${reference_image_base64}`,
        },
      }),
    });

    const data = await startRes.json();

    if (startRes.status !== 201 || !data?.id) {
      console.error("🚫 Prediction error:", data);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Failed to start prediction", details: data }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "submitted",
        prediction_id: data.id,
        prediction: data,
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
