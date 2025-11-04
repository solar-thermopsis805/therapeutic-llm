# Essential libraries for the chatbot functionality
import os
import sys
from typing import Tuple, List, Dict, Any

# Sort out the imports path so everything works properly has mad issues with this before but this might not be nesicarry on another PC?
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from openai import OpenAI
import json
from transformers import pipeline

from emotion_detection.emotion_detection import get_top_emotion
from sarcasm_detection.sarcasm_detection import detect_sarcasm

# API setup for DeepSeek again feel free to use these credentials as I have put 5$ on the API key
API_KEY = "sk-4cfe0eda3aa140fb8bc7e2fbf1f6e69e"
BASE_URL = "https://api.deepseek.com"
client = OpenAI(api_key=API_KEY, base_url=BASE_URL)

# Setting up the emotion classifier from Hugging Face
eclassifier = pipeline(
    task="text-classification",
    model="SamLowe/roberta-base-go_emotions",
    top_k=None
)

def therapeutic_response(
    user_input: str,
    conversation_history: List[Dict[str, str]] = None
) -> dict:
    if conversation_history is None:
        conversation_history = []

    # Check if the user is being sarcastic - important for proper response
    sarcasm_info = detect_sarcasm(user_input)
    is_sarcastic = sarcasm_info.get('sarcastic', False)

    # Get the user's emotional state from their message
    emotion_label, emotion_conf = get_top_emotion(
        user_input,
        sarcasm=is_sarcastic
    )

    # Organise the conversation for the AI to understand
    messages_for_llm = []

    # Set the AI personality and response style
    messages_for_llm.append({
        "role": "system",
        "content": (
            "You are a compassionate therapist. Respond in no more than three sentences, "
            "validating the user's feelings and guiding them forward with an open-ended question. "
            "Review the conversation history provided to understand the context and avoid repeating "
            "previous advice or questions unless relevant for clarification."
        ),
    })

    # Give the AI context about the user's current emotional state
    messages_for_llm.append({
        "role": "system",
        "content": (
            f"Context for the LATEST user message (the one you are about to respond to): "
            f"User's emotional tone is '{emotion_label}' ({emotion_conf:.1f}%). "
            f"Sarcasm detected in latest message: {sarcasm_info['sarcastic']}. Reason for sarcasm: {sarcasm_info['reason']}."
        ),
    })

    # Add previous conversation for context
    for entry in conversation_history:
        if entry.get("role") in ["user", "assistant"] and "content" in entry:
            messages_for_llm.append({"role": entry["role"], "content": entry["content"]})

    # Add the user's current message
    messages_for_llm.append({
        "role": "user",
        "content": user_input
    })

    # Send everything to the AI and get a response
    resp = client.chat.completions.create(
        model="deepseek-reasoner",
        messages=messages_for_llm,
        temperature=0.6,
        max_tokens=200,
        stream=False,
    )
    reply = resp.choices[0].message.content.strip()

    # Return the AI response along with emotion and sarcasm analysis
    return {
        "response": reply,
        "sarcasm": sarcasm_info,
        "emotion": {"label": emotion_label, "confidence": emotion_conf},
    }

