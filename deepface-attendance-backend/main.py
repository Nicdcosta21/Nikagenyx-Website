from fastapi import FastAPI, UploadFile, File, Form
from deepface import DeepFace
import os, io, shutil
from PIL import Image

app = FastAPI()

@app.post("/verify")
async def verify_face(emp_id: str = Form(...), file: UploadFile = File(...)):
    # Save the uploaded image temporarily
    contents = await file.read()
    img_path = f"temp_{emp_id}.jpg"
    with open(img_path, "wb") as f:
        f.write(contents)

    reference_path = f"known_faces/{emp_id}.jpg"
    if not os.path.exists(reference_path):
        return {"status": "error", "message": "Reference image not found."}

    try:
        result = DeepFace.verify(img1_path=img_path, img2_path=reference_path)
        return {
            "verified": result["verified"],
            "distance": result["distance"]
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        os.remove(img_path)
