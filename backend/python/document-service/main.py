import io
import os
from typing import List, Optional
from PyPDF2 import PdfReader
from bson import json_util
import certifi
from dotenv import load_dotenv
from fastapi import Cookie, Depends, FastAPI, File, Form, HTTPException, Response, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import httpx
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pydantic import BaseModel
from pymongo import MongoClient
from bson import ObjectId
import uvicorn
from datetime import datetime
from bson.binary import Binary
import fitz
from openai import OpenAI
from langchain_openai import OpenAIEmbeddings
from langchain_mongodb import MongoDBAtlasVectorSearch

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://alexandriadev.us"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ATLAS_CONNECTION_STRING = os.getenv("ATLAS_CONNECTION_STRING")
mongo_client = MongoClient(ATLAS_CONNECTION_STRING, tlsCAFile=certifi.where())
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME")
db = mongo_client[MONGODB_DB_NAME]
MONGODB_COLLECTION = os.getenv("MONGODB_COLLECTION")
collection = db[MONGODB_COLLECTION]

GO_BACKEND_URL = os.getenv("GO_BACKEND_URL")

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
embeddings = OpenAIEmbeddings()

vector_store = MongoDBAtlasVectorSearch(
    collection, embeddings, index_name="alexandria_vector_index")

class Document(BaseModel):
    title: str
    authors: List[str]
    description: Optional[str] = None
    categories: List[str]
    isPublic: bool

class SearchQuery(BaseModel):
    query: str
    top_k: int = 5

llm = OpenAI()

@app.get("/user/info")
async def get_user_info(gothic_session: Optional[str] = Cookie(None)):
    async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
        response = await client.get(
            "https://alexandriadev.us/user/info",
            cookies={"gothic_session": gothic_session}
        )

    user_info = response.json()

    return {
        "email": user_info.get("email")
    }

def extract_text_from_pdf(pdf_reader):
    pdf_text = ""
    for page in pdf_reader.pages:
        pdf_text += page.extract_text()
    return pdf_text

@app.post("/upload_document")
async def upload_document(
    file: UploadFile = File(...),
    document: str = Form(...),
    user_info: dict = Depends(get_user_info)
):
    document_data = json_util.loads(document)
    validated_document = Document(**document_data)

    file_content = await file.read()

    pdf_document = fitz.open(stream=file_content, filetype="pdf")
    first_page = pdf_document.load_page(0)
    pix = first_page.get_pixmap(matrix=fitz.Matrix(2, 2))
    thumbnail = pix.tobytes("png")

    pdf_reader = PdfReader(io.BytesIO(file_content))
    pdf_text = extract_text_from_pdf(pdf_reader)

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, chunk_overlap=150)
    chunks = text_splitter.split_text(pdf_text)

    document_embedding = embeddings.embed_query(pdf_text)

    document_to_insert = {
        **validated_document.dict(),
        "fileName": file.filename,
        "user_email": user_info["email"],
        "lastUpdated": datetime.now(),
        "fileContent": Binary(file_content),
        "fileSize": len(file_content),
        "thumbnailUrl": Binary(thumbnail),
        "text_content": pdf_text,
        "document_embedding": document_embedding,
        "chunks": chunks
    }

    collection.insert_one(document_to_insert)

    return {"message": "Document uploaded and indexed successfully"}

@app.get("/user_documents")
async def get_user_documents(request: Request, user_info: dict = Depends(get_user_info)):
    user_documents = list(collection.find({"user_email": user_info["email"]}))
    base_url = str(request.base_url)
    
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
        "thumbnailUrl": f"{base_url}thumbnail/{str(doc['_id'])}" if "thumbnailUrl" in doc else None,
        "user_email": doc.get("user_email"),
    } for doc in user_documents]

@app.get("/thumbnail/{document_id}")
async def get_thumbnail(document_id: str):
    document = collection.find_one({"_id": ObjectId(document_id)})
    if document and "thumbnailUrl" in document:
        return Response(content=document["thumbnailUrl"], media_type="image/png")
    else:
        raise HTTPException(status_code=404, detail="Thumbnail not found")

@app.get("/public_documents")
async def get_public_documents(request: Request):
    public_documents = list(collection.find({"isPublic": True}))
    base_url = str(request.base_url)
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
        "thumbnailUrl": f"{base_url}thumbnail/{str(doc['_id'])}" if "thumbnailUrl" in doc else None,
        "user_email": doc.get("user_email"),
    } for doc in public_documents]

@app.put("/update_document/{document_id}")
async def update_document(
    document_id: str,
    document: str = Form(...),
    file: Optional[UploadFile] = File(None),
    user_info: dict = Depends(get_user_info)
):
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

        pdf_reader = PdfReader(io.BytesIO(file_content))
        pdf_text = extract_text_from_pdf(pdf_reader)
        update_data["text_content"] = pdf_text

        document_embedding = embeddings.embed_query(pdf_text)
        update_data["document_embedding"] = document_embedding

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000, chunk_overlap=150)
        chunks = text_splitter.split_text(pdf_text)
        update_data["chunks"] = chunks

    collection.update_one(
        {"_id": ObjectId(document_id), "user_email": user_info["email"]},
        {"$set": update_data}
    )

    return {"message": "Document updated successfully"}

@app.delete("/delete_document/{document_id}")
async def delete_document(document_id: str, user_info: dict = Depends(get_user_info)):
    collection.delete_one({"_id": ObjectId(document_id),
                          "user_email": user_info["email"]})

    return {"message": "Document deleted successfully"}

@app.get("/download_document/{document_id}")
async def download_document(document_id: str, user_info: dict = Depends(get_user_info)):
    document = collection.find_one(
        {"_id": ObjectId(document_id), "user_email": user_info["email"]}
    )

    file_content = document.get("fileContent")

    return StreamingResponse(
        io.BytesIO(file_content),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{document.get("fileName", "document.pdf")}"'
        }
    )

@app.post("/search_documents")
async def search_documents(search_query: SearchQuery, request: Request, user_info: dict = Depends(get_user_info)):
    query_embedding = embeddings.embed_query(search_query.query)

    vector_search_query = [
        {
            "$vectorSearch": {
                "index": "alexandria_vector_index",
                "path": "document_embedding",
                "queryVector": query_embedding,
                "numCandidates": 100,
                "limit": search_query.top_k
            }},
        {
            "$project": {
                "score": {"$meta": "vectorSearchScore"},
                "title": 1,
                "authors": 1,
                "description": 1,
                "categories": 1,
                "fileName": 1,
                "thumbnailUrl": 1,
                "lastUpdated": 1,
                "isPublic": 1,
                "user_email": 1,
                "_id": 1
            }
        }
    ]

    results = list(collection.aggregate(vector_search_query))

    base_url = str(request.base_url)
    return [
        {
            "_id": str(doc["_id"]),
            "title": doc["title"],
            "authors": doc["authors"],
            "description": doc.get("description"),
            "categories": doc["categories"],
            "fileName": doc["fileName"],
            "thumbnailUrl": f"{base_url}thumbnail/{str(doc['_id'])}",
            "lastUpdated": doc["lastUpdated"],
            "isPublic": doc["isPublic"],
            "user_email": doc["user_email"],
            "similarity_score": doc["score"]
        } for doc in results
    ]
        
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)