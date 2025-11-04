# AI Therapy Chatbot

An empathetic chatbot that analyzes emotions and sarcasm in real-time to provide supportive, therapeutic responses. I built this to explore emotion AI and natural language processing while creating something that could genuinely help people feel heard.

**The core idea**: Type a message → AI detects your emotion and sarcasm → Generates empathetic therapeutic response → Tracks your emotional patterns over time.

---

## Tech Stack

**Frontend**
- React 19 with TypeScript
- Vite
- Tailwind CSS
- Framer Motion (animations)
- Radix UI (accessible components)

**Backend**
- FastAPI (Python)
- Hugging Face Transformers (emotion detection)
- DeepSeek API (sarcasm detection + responses)
- RoBERTa model (28 emotion classifications)

---

## Key Features

**Emotion Detection**
- Real-time analysis of 28 different emotions using a fine-tuned RoBERTa model
- Confidence scoring for each prediction (0-100%)
- Color-coded emotion badges for visual feedback
- Handles nuanced emotions like "remorse" vs "embarrassment"

**Sarcasm Detection**
- Uses DeepSeek's reasoning model to identify sarcastic messages
- Provides contextual explanations for why something was flagged
- Adjusts therapeutic response tone based on sarcasm

**Therapeutic Responses**
- AI generates validating, empathetic replies in 3 sentences or less
- Asks open-ended questions to encourage reflection
- Maintains conversation history for context-aware responses
- Adapts tone based on detected emotions

**Multi-Conversation Management**
- Create and switch between multiple conversation threads
- Each conversation tracks overall sentiment trend
- Persistent conversation history
- Mobile-responsive sidebar for easy navigation

---

## What I Learned

**Emotion AI & NLP**
- Working with pre-trained transformer models (RoBERTa) and understanding how they classify text
- The challenge of handling 28 nuanced emotion categories vs simple positive/negative sentiment
- Why context matters in emotion detection (same words can express different emotions)
- How sarcasm detection needs reasoning capabilities beyond pattern matching

**Full-Stack Development**
- Building a responsive chat interface with React that feels smooth and instant
- Optimistic UI updates - showing messages before API responses to improve perceived performance
- State management for multi-conversation workflows
- WebSocket alternatives (polling vs server-sent events) and why I chose REST for this project

**UX Design**
- Color psychology - mapping emotions to colors that intuitively make sense
- The importance of loading states and visual feedback when AI processing takes time
- Mobile-first responsive design with collapsible sidebars
- Balancing information density (showing emotion data without overwhelming users)

**API Integration**
- Handling different AI providers (Hugging Face vs DeepSeek) with different response formats
- Error handling when models take too long or fail
- Rate limiting considerations and API cost optimization

---

## Getting Started

**Prerequisites**
```
Python 3.9+
Node.js 18+
```

**Installation**

1. Clone the repo
```bash
git clone https://github.com/tgollick/ai-therapy-chatbot.git
cd ai-therapy-chatbot
```

2. Backend setup
```bash
python -m venv env
source env/bin/activate  # Windows: env\Scripts\activate
pip install -r requirments.txt
uvicorn main:app --reload
```

3. Frontend setup
```bash
cd web_application
npm install
npm run dev
```

4. Environment variables (optional - currently hardcoded for testing)

Create `.env` in the root directory:
```env
DEEPSEEK_API_KEY=your_key_here
```

Visit `http://localhost:5173`

The backend runs on `http://localhost:8000` with auto-generated docs at `/docs`

---

## Project Structure

```
therapy-chatbot/
├── main.py                      # FastAPI server
├── requirments.txt
│
├── emotion_detection/
│   └── emotion_detection.py     # RoBERTa 28-emotion classifier
│
├── sarcasm_detection/
│   └── sarcasm_detection.py     # DeepSeek sarcasm analysis
│
├── therapy_response/
│   └── therapy_response.py      # AI response generation
│
└── web_application/
    ├── src/
    │   ├── App.tsx              # Main chat interface
    │   ├── components/ui/       # Reusable UI components
    │   └── lib/utils.ts
    └── package.json
```

---

## How It Works

**1. Message Analysis**
- User sends message → Simultaneously analyzed by emotion and sarcasm detectors
- Emotion model returns label + confidence (e.g., "nervousness" at 87%)
- Sarcasm detector provides boolean + reasoning

**2. Response Generation**
- DeepSeek receives: user message + emotion context + sarcasm flag + conversation history
- Generates 3-sentence response that validates feelings and asks open-ended question
- Response adapts tone based on detected emotion/sarcasm

**3. UI Updates**
- Optimistic rendering: message appears immediately
- Loading states for sentiment analysis (spinners on badges)
- Color-coded emotion badges update when analysis completes
- Conversation list updates with overall sentiment

**Emotion Color System**:
- Positive (joy, love): Teal
- Sad (grief, disappointment): Blue
- Angry (annoyance, disapproval): Rose
- Anxious (fear, nervousness): Amber
- Neutral/Complex: Slate

---

## Challenges Faced + Solutions

**Challenge**: First API request took 5+ seconds due to model loading

**Solution**: Model loads at module import time (~2-3 seconds) rather than on first request. Subsequent requests are under 1 second. Considered model caching but decided startup time was acceptable for a demo project.

**Challenge**: Handling 28 emotions felt overwhelming in the UI

**Solution**: Grouped emotions by color families and only show the top predicted emotion. Confidence percentage helps users understand prediction quality. Also added tooltips for sarcasm reasoning to keep the main UI clean.

**Challenge**: Sarcasm detection was inconsistent with simple pattern matching

**Solution**: Switched to DeepSeek's reasoning model which provides context-aware analysis. The model explains *why* something is sarcastic, making false positives much easier to spot and debug.

**Challenge**: Managing multiple conversations in React state was getting messy

**Solution**: Simplified state management by keeping conversations as an array sorted by timestamp. Each conversation owns its messages. No need for complex state management libraries since the data flow is straightforward.

**Challenge**: Mobile sidebar was either always open or always hidden

**Solution**: Implemented responsive behavior - sidebar auto-closes after selecting a conversation on mobile, but stays open on desktop. Added smooth animations with Framer Motion to make transitions feel natural.

---

## API Reference

**POST** `/api/chat`

Request:
```json
{
  "message": "I'm feeling really stressed about my exams",
  "conversation_history": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi! How can I help you today?" }
  ]
}
```

Response:
```json
{
  "response": "I hear that exam stress can be overwhelming...",
  "emotion": {
    "label": "nervousness",
    "confidence": 87.3
  },
  "sarcasm": {
    "sarcastic": false,
    "reason": "The message expresses genuine concern..."
  }
}
```

---

## Troubleshooting

**Backend won't start**
- Make sure virtual environment is activated
- Try `pip install --break-system-packages` if you get permission errors

**Frontend can't connect to backend**
- Check backend is running on port 8000
- If backend is on different port, update URL in `App.tsx` line 238

**Slow first response**
- Normal - emotion model loads on first import (~2-3 seconds)
- Subsequent responses are much faster

**CORS errors**
- Backend allows all origins by default for development
- For production, restrict in `main.py`

---

## Contact

**Thomas Gollick**
- Email: thomasgollick@gmail.com
- LinkedIn: [linkedin.com/in/thomasgollick](https://linkedin.com/in/thomasgollick)
- GitHub: [github.com/tgollick](https://github.com/tgollick)

Currently seeking full-time software development roles in the UK. Open to any position with the experience to join an amazing team and learn!

---

## License

Personal portfolio project feel free to use any code! Please send me a message if you want to chat. I love talking about this stuff and all the bugs I cried over for ages xD

---

**MANY THANKS HOPE YOU LIKE THE PROJECT!** :) :)
