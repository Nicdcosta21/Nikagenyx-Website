const fetch = require('node-fetch');

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" })
    };
  }

  try {
    const { emp_id, uploaded_image_base64, reference_image_base64 } = JSON.parse(event.body);

    if (!uploaded_image_base64 || !reference_image_base64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Both base64 images are required." }),
      };
    }

    // 🔍 Clean the base64 inputs (strip data:image headers)
    const cleanUploaded = uploaded_image_base64.replace(/^data:image\/\w+;base64,/, "");
    const cleanReference = reference_image_base64.replace(/^data:image\/\w+;base64,/, "");

    console.log(`👤 Starting face match for: ${emp_id}`);
    console.log(`📸 Uploaded Image (first 30 chars): ${cleanUploaded.slice(0, 30)}`);
    console.log(`🧾 Reference Image (first 30 chars): ${cleanReference.slice(0, 30)}`);

    const res = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: "Token r8_25i8Vqts10lqAb4D597LcmD3kqIxGc43kOg5h",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "fb2d48e857b6c011fd9855f44f3412a9fd50d822ff14b743d0b99e4506d0c26f",
        input: {
          img1: cleanUploaded,
          img2: cleanReference
        }
      })
    });

    const prediction = await res.json();

    console.log("📥 Replicate response:", JSON.stringify(prediction, null, 2));

    if (res.status !== 201 || !prediction?.id || !prediction?.urls?.get) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "❌ Failed to start prediction.",
          error: prediction.error || "Unknown error",
          full_response: prediction
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "submitted",
        prediction_id: prediction.id,
        prediction: prediction
      }),
    };

  } catch (err) {
    console.error("❌ Server exception:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "❌ Internal server error",
        error: err.message,
        stack: err.stack
      }),
    };
  }
};

