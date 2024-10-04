from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
from dotenv import load_dotenv
from openai import OpenAI
from langchain_openai import OpenAIEmbeddings
from pymongo import MongoClient
import certifi
import json
from fastapi.responses import StreamingResponse
from bson import ObjectId

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

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
embeddings = OpenAIEmbeddings()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

@app.post("/chat_with_pdf/{pdf_id}")
async def chat_with_pdf(pdf_id: str, chat_request: ChatRequest):
    object_id = ObjectId(pdf_id)
    document = collection.find_one({"_id": object_id})
    if not document:
        raise HTTPException(status_code=404, detail="PDF not found")

    user_message = next((msg.content for msg in reversed(chat_request.messages) if msg.role == "user"), None)
    if not user_message:
        raise HTTPException(status_code=400, detail="No user message provided")

    user_embedding = embeddings.embed_query(user_message)

    pipeline = [
        {
            "$vectorSearch": {
                "index": "alexandria_vector_index",
                "path": "document_embedding",
                "queryVector": user_embedding,
                "numCandidates": 1000,
                "limit": 5
            }
        },
        {
            "$match": {
                "_id": object_id
            }
        },
        {
            "$project": {
                "title": 1,
                "authors": 1,
                "description": 1,
                "chunks": 1,
                "score": {"$meta": "vectorSearchScore"}
            }
        }
    ]
    
    search_results = list(collection.aggregate(pipeline))

    if not search_results:
        selected_chunks = document.get('chunks', [])[:5]
    else:
        document = search_results[0]
        selected_chunks = document.get('chunks', [])[:5]
    
    context = "\n\n".join(selected_chunks)

    pdf_info = f"Title: {document['title']}\nAuthors: {', '.join(document['authors'])}\nDescription: {document.get('description', 'No description available')}"

    async def event_generator():
        yield f"data: {json.dumps({'type': 'context', 'content': context})}\n\n"

        messages = [
            {"role": "system", "content": f"You are a helpful assistant. Use the provided context to answer the user's question about the following PDF:\n\n{pdf_info}"},
            {"role": "user", "content": f"Context: {context}\n\nQuestion: {user_message}"}
        ]

        stream = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            stream=True
        )

        for chunk in stream:
            if chunk.choices[0].delta.content is not None:
                yield f"data: {json.dumps({'type': 'answer', 'content': chunk.choices[0].delta.content})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)