from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List
from fastapi.middleware.cors import CORSMiddleware
import logging, traceback

# This imports the function that handles all the AI therapy logic
from therapy_response.therapy_response import therapeutic_response

logging.basicConfig(level=logging.INFO)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Not suitable for production environment but going to be left this way to make it easier to test my program
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Defines structure for messages in conversation history
class HistoryMessage(BaseModel):
    role: str
    content: str

# Defines structure for incoming chat requests from frontend
class ChatRequest(BaseModel):
    message: str
    conversation_history: List[HistoryMessage] = Field(default_factory=list)

# Defines structure for responses sent back to frontend
class ChatResponse(BaseModel):
    response: str
    sarcasm: Dict[str, Any]
    emotion: Dict[str, Any]

# Main endpoint that processes user messages and returns therapeutic responses
@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    try:
        if not req.message.strip():
            raise HTTPException(status_code=400, detail="Empty message")

        # Convert Pydantic objects to simple dicts for the therapy function
        history_for_function = []
        if req.conversation_history:
            for msg_pydantic in req.conversation_history:
                history_for_function.append({"role": msg_pydantic.role, "content": msg_pydantic.content})

        # Process the message through our therapy module
        out = therapeutic_response(
            req.message,
            conversation_history=history_for_function
        )
        return ChatResponse(
            response=out["response"],
            sarcasm=out["sarcasm"],
            emotion=out["emotion"],
        )
    except Exception as e:
        logging.error(f"Error in chat_endpoint: {str(e)}")
        logging.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"An internal server error occurred: {str(e)}")