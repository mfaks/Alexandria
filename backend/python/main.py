import io
import json
import logging
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
from jsonschema import ValidationError
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pydantic import BaseModel
from pymongo import MongoClient
from bson import ObjectId
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential
import uvicorn
from datetime import datetime
from bson.binary import Binary
import fitz
from openai import OpenAI, RateLimitError
import numpy as np
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()

ATLAS_CONNECTION_STRING = os.getenv("ATLAS_CONNECTION_STRING")
mongo_client = MongoClient(ATLAS_CONNECTION_STRING, tlsCAFile=certifi.where())
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME")
db = mongo_client[MONGODB_DB_NAME]
MONGODB_COLLECTION = os.getenv("MONGODB_COLLECTION")
collection = db[MONGODB_COLLECTION]

GO_BACKEND_URL = os.getenv("GO_BACKEND_URL")

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
embeddings = OpenAIEmbeddings()

vector_store = MongoDBAtlasVectorSearch(collection, embeddings, index_name="vector_index")

class Document(BaseModel):
    title: str
    authors: List[str]
    description: Optional[str] = None
    categories: List[str]
    isPublic: bool


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


class SearchQuery(BaseModel):
    query: str
    top_k: int = 5


llm = OpenAI()


@app.get("/user_info/")
async def get_user_info(gothic_session: Optional[str] = Cookie(None)):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{GO_BACKEND_URL}/user/info",
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


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.post("/upload_document/")
async def upload_document(
    file: UploadFile = File(...),
    document: str = Form(...),
    user_info: dict = Depends(get_user_info)
):
    try:
        logger.info(f"Starting document upload for user: {user_info['email']}")
        document_data = json_util.loads(document)
        validated_document = Document(**document_data)

        file_content = await file.read()
        logger.info(f"File read successfully: {file.filename}")

        pdf_document = fitz.open(stream=file_content, filetype="pdf")
        first_page = pdf_document.load_page(0)
        pix = first_page.get_pixmap(matrix=fitz.Matrix(2, 2))
        thumbnail = pix.tobytes("png")
        logger.info("Thumbnail created successfully")

        pdf_reader = PdfReader(io.BytesIO(file_content))
        pdf_text = extract_text_from_pdf(pdf_reader)
        logger.info("Text extracted from PDF")

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
        chunks = text_splitter.split_text(pdf_text)
        logger.info(f"Text split into {len(chunks)} chunks")

        logger.info("Starting embedding generation")
        chunk_embeddings = []
        for i, chunk in enumerate(chunks):
            try:
                embedding = embeddings.embed_query(chunk)
                chunk_embeddings.append(embedding)
                logger.info(f"Embedding generated for chunk {i+1}/{len(chunks)}")
            except RateLimitError as e:
                logger.error(f"Rate limit error while generating embedding for chunk {i+1}: {str(e)}")
                raise
            except Exception as e:
                logger.error(f"Error generating embedding for chunk {i+1}: {str(e)}")
                raise

        document_to_insert = {
            **validated_document.dict(),
            "fileName": file.filename,
            "user_email": user_info["email"],
            "lastUpdated": datetime.now(),
            "fileContent": Binary(file_content),
            "fileSize": len(file_content),
            "thumbnailUrl": Binary(thumbnail),
            "text_content": pdf_text,
            "chunks": [
                {"text": chunk, "embedding": embedding}
                for chunk, embedding in zip(chunks, chunk_embeddings)
            ]
        }
        
        collection.insert_one(document_to_insert)
        logger.info("Document inserted into database successfully")

        return {"message": "Document uploaded and indexed successfully"}
    except RateLimitError as e:
        logger.error(f"Rate limit error during document upload: {str(e)}")
        return {"error": f"Rate limit exceeded: {str(e)}"}
    except Exception as e:
        logger.error(f"Error during document upload: {str(e)}")
        return {"error": f"Internal server error: {str(e)}"}



@app.get("/user_documents/")
async def get_user_documents(request: Request, user_info: dict = Depends(get_user_info)):
    user_documents = collection.find({"user_email": user_info["email"]})
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
async def get_thumbnail(document_id: str, user_info: dict = Depends(get_user_info)):
    document = collection.find_one(
        {"_id": ObjectId(document_id), "user_email": user_info["email"]}
    )
    return Response(content=document["thumbnailUrl"], media_type="image/png")


@app.get("/public_documents/")
async def get_public_documents(request: Request):
    public_documents = collection.find({"isPublic": True})
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

            pdf_reader = PdfReader(io.BytesIO(file_content))
            pdf_text = extract_text_from_pdf(pdf_reader, max_pages=5)
            update_data["text_content"] = pdf_text

            embedding = embeddings.embed_query(pdf_text)
            update_data["embedding"] = embedding

        result = collection.update_one(
            {"_id": ObjectId(document_id), "user_email": user_info["email"]},
            {"$set": update_data}
        )

        return {"message": "Document updated successfully"}
    except Exception as e:
        return {"error": f"Internal server error: {str(e)}"}


@app.delete("/delete_document/{document_id}")
async def delete_document(document_id: str, user_info: dict = Depends(get_user_info)):
    result = collection.delete_one(
        {"_id": ObjectId(document_id), "user_email": user_info["email"]})

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


@app.post("/chat_with_pdf/{pdf_id}")
async def chat_with_pdf(pdf_id: str, chat_request: ChatRequest, user_info: dict = Depends(get_user_info)):
    try:
        pdf = collection.find_one({"_id": ObjectId(pdf_id), "user_email": user_info["email"]})
        if not pdf:
            raise HTTPException(status_code=404, detail="PDF not found")

        user_message = next((msg.content for msg in reversed(chat_request.messages) if msg.role == "user"), None)
        if not user_message:
            raise HTTPException(status_code=400, detail="No user message found")

        retriever = vector_store.as_retriever(search_kwargs={"k": 3})
        llm = ChatOpenAI(model_name="gpt-3.5-turbo", streaming=True)

        qa_chain = RetrievalQA.from_chain_type(
            llm,
            retriever=retriever,
            chain_type_kwargs={
                "prompt": PromptTemplate(
                    template="""
                    Use the following pieces of context to answer the question at the end. 
                    If you don't know the answer, just say that you don't know, don't try to make up an answer.

                    {context}

                    Question: {question}
                    Answer:""",
                    input_variables=["context", "question"]
                )
            }
        )

        async def event_generator():
            try:
                response = await qa_chain.ainvoke({"query": user_message})
                yield f"data: {response['result']}\n\n"
            except Exception as e:
                yield f"data: Error: {str(e)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/search_documents/")
async def search_documents(search_query: SearchQuery, user_info: dict = Depends(get_user_info)):
    try:
        results = vector_store.similarity_search_with_score(
            search_query.query, k=search_query.top_k)

        return [
            {
                "_id": str(doc.metadata.get("_id")),
                "title": doc.metadata.get("title"),
                "description": doc.metadata.get("description"),
                "similarity_score": score
            } for doc, score in results
        ]
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
