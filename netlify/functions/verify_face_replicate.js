const fetch = require("node-fetch");

exports.handler = async (event) => {
  console.log("📌 Function triggered: verify_face_replicate");

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  try {
    const token = "r8_UYwueEtdEaZw23jXir2TpULqJxBDAA44ZhikM";
    const { emp_id, uploaded_image_base64, reference_image_base64, prediction_id } = JSON.parse(event.body);

    if (prediction_id) {
      console.log(`🔁 Polling Replicate for prediction_id: ${prediction_id}`);
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction_id}`, {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      });

      const pollData = await pollRes.json();
      console.log("📥 Polling response:", pollData);
      return {
        statusCode: 200,
        body: JSON.stringify(pollData),
      };
    }

    // Validate
    if (!uploaded_image_base64 || !reference_image_base64) {
      console.error("❌ Missing base64 inputs.");
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Both base64 images are required." }),
      };
    }

    // Start prediction
    console.log("🧠 Sending to Replicate...");
    const startRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "9258be7df5239c1f38c9a667f6e0c9cb3a45e3e6520bbd7400e5c9cf4d697b24",
        input: {
          img1: `data:image/jpeg;base64,${uploaded_image_base64}`,
          img2: `data:image/jpeg;base64,${reference_image_base64}`,
        },
      }),
    });

    const data = await startRes.json();
    console.log("📤 Replicate submission response:", data);

    if (startRes.status !== 201 || !data?.id) {
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
    console.error("❌ Exception:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal error", error: err.message }),
    };
  }
};
