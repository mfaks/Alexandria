import io
import os
from typing import List, Optional
from PyPDF2 import PdfReader
from bson import json_util
import certifi
from dotenv import load_dotenv
from fastapi import Cookie, Depends, FastAPI, File, Form, HTTPException, Response, UploadFile, logger
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import httpx
from jsonschema import ValidationError
from pydantic import BaseModel
from pymongo import MongoClient
from bson import ObjectId
from sentence_transformers import SentenceTransformer
import uvicorn
from datetime import datetime
from bson.binary import Binary
import fitz

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")
client = MongoClient(MONGODB_URL, tlsCAFILE=certifi.where())
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME")
db = client[MONGODB_DB_NAME]
MONGODB_COLLECTION = os.getenv("MONGODB_COLLECTION")
collection = db[MONGODB_COLLECTION]

GO_BACKEND_URL = os.getenv("GO_BACKEND_URL")

openai_api_key = os.getenv("OPENAI_API_KEY")


class Document(BaseModel):
    title: str
    authors: List[str]
    description: Optional[str] = None
    categories: List[str]
    isPublic: bool


class ChatMessage(BaseModel):
    role: str
    content: str


async def get_user_info(gothic_session: Optional[str] = Cookie(None)):
    if not gothic_session:
        raise HTTPException(status_code=401, detail="Not authenticated")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{GO_BACKEND_URL}/user/info",
            cookies={"gothic_session": gothic_session}
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=401, detail="Invalid or expired session")

    return response.json()

model = SentenceTransformer('all-MiniLM-L6-v2')


@app.post("/upload_document/")
async def upload_document(
    file: UploadFile = File(...),
    document: str = Form(...),
    user_info: dict = Depends(get_user_info)
):
    try:
        document_data = json_util.loads(document)

        validated_document = Document(**document_data)

        file_content = await file.read()

        pdf_document = fitz.open(stream=file_content, filetype="pdf")
        first_page = pdf_document.load_page(0)
        pix = first_page.get_pixmap(matrix=fitz.Matrix(2, 2))
        thumbnail = pix.tobytes("png")

        document_to_insert = {
            **validated_document.dict(),
            "fileName": file.filename,
            "user_email": user_info["email"],
            "lastUpdated": datetime.now(),
            "fileContent": Binary(file_content),
            "fileSize": len(file_content),
            "thumbnailUrl": Binary(thumbnail)
        }

        result = collection.insert_one(document_to_insert)

        return {"message": "Document uploaded successfully", "id": str(result.inserted_id)}
    except json_util.JSONDecodeError as e:
        raise HTTPException(
            status_code=400, detail=f"Invalid JSON for document data: {str(e)}")
    except ValidationError as e:
        raise HTTPException(
            status_code=422, detail=f"Validation error in document data: {str(e)}")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/user_documents/")
async def get_user_documents(user_info: dict = Depends(get_user_info)):
    user_documents = collection.find({"user_email": user_info["email"]})
    return [{
        "_id": str(doc["_id"]),
        "title": doc.get("title"),
        "authors": doc.get("authors"),
        "description": doc.get("description"),
        "categories": doc.get("categories"),
        "fileName": doc.get("fileName"),
        "lastUpdated": doc.get("lastUpdated"),
        "isPublic": doc.get("isPublic"),
        "fileSize": doc.get("fileSize"),
        "thumbnailUrl": f"/thumbnail/{str(doc['_id'])}" if "thumbnailUrl" in doc else None,
    } for doc in user_documents]


@app.get("/thumbnail/{document_id}")
async def get_thumbnail(document_id: str, user_info: dict = Depends(get_user_info)):
    document = collection.find_one(
        {"_id": ObjectId(document_id), "user_email": user_info["email"]})
    if not document or "thumbnailUrl" not in document:
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    return Response(content=document["thumbnailUrl"], media_type="image/png")


@app.put("/update_document/{document_id}")
async def update_document(
    document_id: str,
    document: str = Form(...),
    file: Optional[UploadFile] = File(None),
    user_info: dict = Depends(get_user_info)
):
    try:
        document_data = json_util.loads(document)
        validated_document = Document(**document_data)

        update_data = {
            **validated_document.dict(),
            "lastUpdated": datetime.now()
        }

        if file:
            file_content = await file.read()
            update_data["fileContent"] = Binary(file_content)
            update_data["fileSize"] = len(file_content)
            update_data["fileName"] = file.filename

            pdf_document = fitz.open(stream=file_content, filetype="pdf")
            first_page = pdf_document.load_page(0)
            pix = first_page.get_pixmap(matrix=fitz.Matrix(2, 2))
            thumbnail = pix.tobytes("png")
            update_data["thumbnailUrl"] = Binary(thumbnail)

        result = collection.update_one(
            {"_id": ObjectId(document_id), "user_email": user_info["email"]},
            {"$set": update_data}
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=404, detail="Document not found or user not authorized")

        return {"message": "Document updated successfully"}
    except json_util.JSONDecodeError as e:
        raise HTTPException(
            status_code=400, detail=f"Invalid JSON for document data: {str(e)}")
    except ValidationError as e:
        raise HTTPException(
            status_code=422, detail=f"Validation error in document data: {str(e)}")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}")


@app.delete("/delete_document/{document_id}")
async def delete_document(document_id: str, user_info: dict = Depends(get_user_info)):
    result = collection.delete_one(
        {"_id": ObjectId(document_id), "user_email": user_info["email"]})

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404, detail="Document not found or user not authorized")

    return {"message": "Document deleted successfully"}


@app.post("/chat_with_pdf/{pdf_id}")
async def chat_with_pdf(pdf_id: str, messages: List[ChatMessage], user_info: dict = Depends(get_user_info)):
    pdf = collection.find_one(
        {"_id": ObjectId(pdf_id), "user_email": user_info["email"]})
    if not pdf:
        raise HTTPException(status_code=404, detail="PDF not found")

    api_messages = [{"role": msg.role, "content": msg.content}
                    for msg in messages]
    api_messages.insert(0, {"role": "system", "content": f"You are an AI assistant answering questions about the following document: {
                        pdf['text'][:1000]}..."})

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {openai_api_key}"},
            json={
                "model": "gpt-3.5-turbo",
                "messages": api_messages
            }
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=500, detail="Error communicating with OpenAI API")

    return response.json()


@app.get("/user_document/{document_id}")
async def get_thumbnail(document_id: str, user_info: dict = Depends(get_user_info)):
    document = collection.find_one(
        {"_id": ObjectId(document_id), "user_email": user_info["email"]})
    if not document or "thumbnailUrl" not in document:
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    return Response(content=document["thumbnailUrl"], media_type="image/png")


@app.get("/download_document/{document_id}")
async def download_document(document_id: str, user_info: dict = Depends(get_user_info)):
    document = collection.find_one(
        {"_id": ObjectId(document_id), "user_email": user_info["email"]}
    )
    if not document:
        raise HTTPException(
            status_code=404, detail="Document not found or user not authorized")

    file_content = document.get("fileContent")
    if not file_content:
        raise HTTPException(status_code=404, detail="File content not found")

    filename = document.get("fileName", "document.pdf")

    return StreamingResponse(
        io.BytesIO(file_content),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0", port=8000)
