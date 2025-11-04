from transformers import pipeline
from typing import Tuple

# Loading the emotion detection model from Hugging Face
# Doing this at module level so we only load it once
classifier = pipeline(
    task="text-classification",
    model="SamLowe/roberta-base-go_emotions",
    top_k=None  # Gets all emotions with scores
)

# List of emotions we consider negative which is super useful when handling sarcasm
NEGATIVE_EMOTIONS = {
    'anger', 'annoyance', 'disgust', 'fear', 'sadness',
    'disappointment', 'disapproval', 'embarrassment', 'remorse', 'grief'
}

def get_top_emotion(
    message: str,
    threshold: float = 0.5,
    exclude_neutral: bool = True,
    sarcasm: bool = False
) -> Tuple[str, float]:
    outputs = classifier([message])[0]
    sorted_outputs = sorted(outputs, key=lambda x: x['score'], reverse=True)

    # For sarcastic messages, look for negative emotions first
    if sarcasm:
        for entry in sorted_outputs:
            if entry['label'] in NEGATIVE_EMOTIONS:
                return entry['label'], entry['score'] * 100
        # If no negative emotions found, use the second highest emotion
        # (since the top one might be positive but the message is sarcastic)
        if len(sorted_outputs) > 1:
            fallback = sorted_outputs[1]
            return fallback['label'], fallback['score'] * 100

    # Normal case take the top emotion, but avoid low confidence neutral to ensure not too many neutral replies
    top = sorted_outputs[0]
    if exclude_neutral and top['label'] == 'neutral' and top['score'] < threshold:
        for candidate in sorted_outputs[1:]:
            if candidate['label'] != 'neutral':
                top = candidate
                break

    return top['label'], top['score'] * 100