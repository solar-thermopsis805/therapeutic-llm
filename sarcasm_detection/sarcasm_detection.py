from openai import OpenAI
import json

# API details for Deepseek using their service instead of OpenAI
# There is no issues using this API key as I have loaded it up with 5$ which should be more than enough for testing purposes
API_KEY = "sk-4cfe0eda3aa140fb8bc7e2fbf1f6e69e"
BASE_URL = "https://api.deepseek.com"

# Set up the client with Deepseek credentials
client = OpenAI(api_key=API_KEY, base_url=BASE_URL)

def detect_sarcasm(text: str) -> dict:
    """
    Calls Deepseek to classify sarcasm in `text`.
    Returns a dict: { "sarcastic": bool, "reason": str }.
    """
    # Create the message structure for the API call
    # Giving the model specific instructions on how to respond
    messages = [
        {
            "role": "system",
            "content": (
                "You are a sarcasm-detection assistant. "
                "Given a single sentence, determine whether it is sarcastic. "
                "Respond with STRICT JSON, without any extra keys, markdown formatting, "
                "or explanation outside the JSON. The JSON schema is:\n"
                "{\n"
                '  "sarcastic": <true|false>,\n'
                '  "reason": "<one-sentence justification>"\n'
                "}"
            ),
        },
        {"role": "user", "content": f"Text: \"{text}\""},
    ]

    # Make the actual API call to Deepseek
    resp = client.chat.completions.create(
        model="deepseek-reasoner",
        messages=messages,
        temperature=0,
        stream=False,
    )

    # Extract the text response and clean it up
    content = resp.choices[0].message.content.strip()
    # Clean markdown code blocks if present
    content = content.replace('```json', '').replace('```', '').strip()
    
    # Try to parse the JSON response
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        raise RuntimeError(f"Failed to parse JSON from model:\n{content}")

