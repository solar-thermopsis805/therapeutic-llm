"use client";

import type React from "react";
import { useState, useRef, useEffect, FormEvent } from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  X,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Types for handling the sentiment analysis data
// Had to create this to properly structure the emotions and sarcasm results from the API
type UserSentimentData = {
  emotionLabel: string;
  emotionConfidence: number;
  sarcasmDetected: boolean;
  sarcasmReason: string;
  isLoading: boolean; // Tracks whether the API has responded yet
};

// Extending the message type to include sentiment analysis
type MessageWithSentiment = {
  id: string; // Unique ID for each message
  content: string;
  role: "user" | "assistant";
  sentiment?: UserSentimentData; // Only user messages have sentiment data
};

// Main conversation structure to keep things organised
type Conversation = {
  id: string;
  title: string;
  messages: MessageWithSentiment[];
  overallSentiment: string; // Calculated from all emotion labels
  timestamp: Date;
};

// Structure for API responses
type ApiChatResponse = {
  response: string; // Assistant's reply
  sarcasm: {
    sarcastic: boolean;
    reason: string;
  };
  emotion: {
    label: string;
    confidence: number; // Between 0-100 from backend
  };
};

// Format for sending conversation history to the API
type HistoryMessagePayload = {
  role: "user" | "assistant";
  content: string;
};

// Utility function to make text look nicer
function capitaliseFirstLetter(str: string) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default function TherapeuticChatbot() {
  // Core state variables for the chat application
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(
    null
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null); // For auto scrolling to newest messages
  const inputRef = useRef<HTMLInputElement>(null);

  // Form input state
  const [input, setInput] = useState("");
  const [messagesWithSentiment, setMessagesWithSentiment] = useState<
    MessageWithSentiment[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // Auto scroll when new messages come in
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesWithSentiment]);

  // Focus the input field when switching conversations
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeConversation]);

  // Creates a new chat session the starting point for all conversations
  const startNewConversation = () => {
    const newId = Date.now().toString();
    const newConversation: Conversation = {
      id: newId,
      title: `Conversation ${conversations.length + 1}`,
      messages: [],
      overallSentiment: "neutral",
      timestamp: new Date(),
    };

    setConversations((prev) =>
      [newConversation, ...prev].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    );
    setActiveConversation(newId);
    setMessagesWithSentiment([]);
    setInput("");

    // Handle sidebar visibility based on screen size
    if (!sidebarOpen && window.innerWidth >= 768) {
      setSidebarOpen(true);
    } else if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  // Updates conversation data including overall sentiment analysis
  const updateConversation = (
    id: string,
    updatedMessages = messagesWithSentiment
  ) => {
    setConversations((prevConversations) =>
      prevConversations
        .map((conv) => {
          if (conv.id === id) {
            const emotionLabels = updatedMessages
              .filter(
                (m) =>
                  m.role === "user" && m.sentiment && !m.sentiment.isLoading
              )
              .map((m) => m.sentiment!.emotionLabel);

            let overallSentiment = "neutral";
            if (emotionLabels.length > 0) {
              const sentimentCounts: Record<string, number> = {};
              emotionLabels.forEach((label) => {
                if (label && label !== "Error" && label !== "Analyzing...") {
                  // Skip temporary states
                  sentimentCounts[label] = (sentimentCounts[label] || 0) + 1;
                }
              });
              if (Object.keys(sentimentCounts).length > 0) {
                // Find most frequent emotion
                overallSentiment = Object.entries(sentimentCounts).sort(
                  (a, b) => b[1] - a[1]
                )[0][0];
              }
            }
            return {
              ...conv,
              messages: updatedMessages,
              overallSentiment,
              timestamp: new Date(),
            };
          }
          return conv;
        })
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
    );
  };

  // Loads a conversation when selected from the sidebar
  const switchConversation = (id: string) => {
    setActiveConversation(id);
    const conversation = conversations.find((c) => c.id === id);
    if (conversation) {
      setMessagesWithSentiment(conversation.messages);
    } else {
      setMessagesWithSentiment([]);
    }
    setInput("");

    // Close sidebar on mobile after selecting a conversation
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  // Removes a conversation
  const deleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedConversations = conversations.filter((c) => c.id !== id);
    setConversations(
      updatedConversations.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    );

    if (activeConversation === id) {
      setActiveConversation(null);
      setMessagesWithSentiment([]);
      if (updatedConversations.length > 0) {
        // Switch to the most recent remaining conversation
        switchConversation(updatedConversations[0].id);
      }
    }
  };

  // Main function for sending messages and handling API responses
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || !activeConversation) return; // Ensure there's an active conversation

    const userInputText = input;
    setInput("");

    // Prepare conversation history for the API
    const historyForAPI: HistoryMessagePayload[] = messagesWithSentiment.map(
      (msg) => ({
        role: msg.role,
        content: msg.content,
      })
    );

    const userMessageId = `user-${Date.now()}`;
    const newUserMessage: MessageWithSentiment = {
      id: userMessageId,
      content: userInputText,
      role: "user",
      sentiment: {
        emotionLabel: "Analyzing...",
        emotionConfidence: 0,
        sarcasmDetected: false,
        sarcasmReason: "Analyzing...",
        isLoading: true,
      },
    };

    // Optimistically add user message improves UX by showing message immediately
    const currentMessagesForUI = [...messagesWithSentiment, newUserMessage];
    setMessagesWithSentiment(currentMessagesForUI);

    // Update the conversation in the sidebar list
    if (activeConversation) {
      updateConversation(activeConversation, currentMessagesForUI);
    }

    setIsLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userInputText,
          conversation_history: historyForAPI,
        }),
      });

      if (!response.ok) {
        let errorDetail = `API Error: ${response.statusText} (${response.status})`;
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || errorDetail;
        } catch (jsonError) {
          console.warn("Could not parse error JSON from API:", jsonError);
        }
        throw new Error(errorDetail);
      }

      const data: ApiChatResponse = await response.json();

      // Update user message with actual sentiment analysis from API
      const updatedMessagesWithRealSentiment = currentMessagesForUI.map((msg) =>
        msg.id === userMessageId
          ? {
              ...msg,
              sentiment: {
                emotionLabel: data.emotion.label,
                emotionConfidence: data.emotion.confidence,
                sarcasmDetected: data.sarcasm.sarcastic,
                sarcasmReason: data.sarcasm.reason,
                isLoading: false,
              },
            }
          : msg
      );

      const assistantMessage: MessageWithSentiment = {
        id: `assistant-${Date.now()}`,
        content: data.response,
        role: "assistant",
      };

      const finalMessages = [
        ...updatedMessagesWithRealSentiment,
        assistantMessage,
      ];
      setMessagesWithSentiment(finalMessages);

      if (activeConversation) {
        updateConversation(activeConversation, finalMessages);
      }
    } catch (error) {
      console.error("Failed to get therapeutic response:", error);
      const errorMessageContent =
        error instanceof Error
          ? error.message
          : "Could not connect to the assistant.";

      const errorAssistantMessage: MessageWithSentiment = {
        id: `error-asst-${Date.now()}`,
        content: `Sorry, I encountered an error: ${errorMessageContent}`,
        role: "assistant",
      };

      // Handle errors by updating UI to show error states
      setMessagesWithSentiment((prevMsgs) => {
        const msgsWithUserError = prevMsgs.map((m) => {
          if (m.id === userMessageId) {
            return {
              ...m,
              sentiment: {
                ...(m.sentiment || ({} as UserSentimentData)),
                emotionLabel: "Error",
                emotionConfidence: 0,
                sarcasmDetected: false,
                sarcasmReason: "Analysis failed",
                isLoading: false,
              },
            };
          }
          return m;
        });
        return [...msgsWithUserError, errorAssistantMessage];
      });

      // Update conversation in the sidebar
      if (activeConversation) {
        const convMessagesAfterError = messagesWithSentiment.map((m) => {
          if (m.id === userMessageId) {
            return {
              ...m,
              sentiment: {
                ...(m.sentiment || ({} as UserSentimentData)),
                emotionLabel: "Error",
                emotionConfidence: 0,
                sarcasmDetected: false,
                sarcasmReason: "Analysis failed",
                isLoading: false,
              },
            };
          }
          return m;
        });
        updateConversation(activeConversation, [
          ...convMessagesAfterError,
          errorAssistantMessage,
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Maps emotion labels to colour schemes
  // Spent way too long debating these colour choices
  const getSentimentColor = (emotionLabel: string) => {
    if (
      !emotionLabel ||
      emotionLabel === "Analyzing..." ||
      emotionLabel === "Error"
    )
      return "bg-slate-400/90 hover:bg-slate-400";
    const base = emotionLabel.toLowerCase();
    switch (base) {
      case "happy":
      case "joy":
      case "admiration":
      case "amusement":
      case "love":
      case "caring":
      case "optimism":
      case "excitement":
      case "gratitude":
      case "pride":
      case "relief":
        return "bg-teal-500/90 hover:bg-teal-500";
      case "sadness":
      case "grief":
      case "disappointment":
      case "remorse":
      case "embarrassment":
        return "bg-blue-400/90 hover:bg-blue-400";
      case "anger":
      case "annoyance":
      case "disapproval":
        return "bg-rose-400/90 hover:bg-rose-400";
      case "fear":
      case "nervousness":
      case "confusion":
      case "curiosity":
        return "bg-amber-400/90 hover:bg-amber-400";
      case "neutral":
      case "realization":
      case "desire":
        return "bg-slate-400/90 hover:bg-slate-400";
      default:
        return "bg-indigo-400/90 hover:bg-indigo-400";
    }
  };

  // Formats timestamps
  const formatDate = (date: Date) => {
    const now = new Date();
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return "Invalid date";
    }
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  // Generates preview text for conversation list items
  const getConversationPreview = (conversation: Conversation) => {
    const firstUserMessage = conversation.messages.find(
      (m) => m.role === "user"
    );
    if (firstUserMessage) {
      return firstUserMessage.content.length > 30
        ? firstUserMessage.content.substring(0, 30) + "..."
        : firstUserMessage.content;
    }
    return "New chat";
  };

  // Toggles sidebar visibility, very important for mobile responsiveness
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Keeps conversations sorted by timestamp
  useEffect(() => {
    setConversations((prev) =>
      [...prev].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    );
  }, []);

  // The main UI layout
  return (
    <div className="flex h-screen bg-gradient-to-br from-rose-50 to-blue-50">
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-80 border-r border-slate-200 flex flex-col z-20 bg-white/80 backdrop-blur-sm md:relative absolute inset-y-0 left-0 h-full shadow-sm"
            style={{ borderRadius: "0 16px 16px 0" }}
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                  <Heart size={16} className="text-rose-500" />
                </div>
                <h1 className="text-xl font-medium text-slate-700">
                  Healing Chat
                </h1>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="md:hidden text-slate-500"
              >
                <X size={18} />
              </Button>
            </div>
            <div className="p-3">
              <Button
                onClick={startNewConversation}
                className="w-full justify-start gap-2 bg-rose-500 hover:bg-rose-600 text-white"
                style={{ borderRadius: "12px" }}
              >
                <Plus size={16} />
                <span>New Conversation</span>
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto py-2 px-3 space-y-2">
              {conversations.length === 0 ? (
                <div className="text-center p-6 text-slate-500">
                  <p>No conversations yet.</p>
                  <p className="text-sm mt-1">Start a new one to begin.</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      "p-3 rounded-xl cursor-pointer flex flex-col group transition-all duration-200",
                      activeConversation === conversation.id
                        ? "bg-blue-50 border border-blue-100"
                        : "hover:bg-rose-50 border border-transparent hover:border-rose-100"
                    )}
                    onClick={() => switchConversation(conversation.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 font-medium text-slate-700">
                        <MessageSquare
                          size={14}
                          className={
                            activeConversation === conversation.id
                              ? "text-blue-400"
                              : "text-rose-400"
                          }
                        />
                        <span className="truncate max-w-[150px]">
                          {conversation.title}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => deleteConversation(conversation.id, e)}
                      >
                        <Trash2
                          size={14}
                          className="text-slate-400 hover:text-rose-500"
                        />
                      </Button>
                    </div>
                    <div className="mt-1 text-xs text-slate-500 flex justify-between items-center">
                      <span className="truncate">
                        {getConversationPreview(conversation)}
                      </span>
                      <span>
                        {formatDate(new Date(conversation.timestamp))}
                      </span>
                    </div>
                    <div className="mt-2">
                      <Badge
                        className={cn(
                          "text-xs text-white",
                          getSentimentColor(conversation.overallSentiment)
                        )}
                      >
                        {capitaliseFirstLetter(conversation.overallSentiment)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <main
        className={cn(
          "flex-1 flex flex-col h-full relative",
          !sidebarOpen && "w-full"
        )}
      >
        <header className="h-16 border-b border-slate-200 flex items-center px-4 gap-2 bg-white/80 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mr-2 text-slate-600 hover:bg-rose-100 hover:text-rose-600"
          >
            {sidebarOpen ? (
              <PanelLeftClose size={18} />
            ) : (
              <PanelLeft size={18} />
            )}
          </Button>
          <div className="flex-1 flex items-center">
            {activeConversation &&
            conversations.find((c) => c.id === activeConversation) ? (
              <>
                <h2 className="font-medium text-slate-700">
                  {
                    conversations.find((c) => c.id === activeConversation)
                      ?.title
                  }
                </h2>
                <div className="ml-3">
                  <Badge
                    className={cn(
                      "text-white",
                      getSentimentColor(
                        conversations.find((c) => c.id === activeConversation)
                          ?.overallSentiment || "neutral"
                      )
                    )}
                  >
                    {capitaliseFirstLetter(
                      conversations.find((c) => c.id === activeConversation)
                        ?.overallSentiment || "neutral"
                    )}
                  </Badge>
                </div>
              </>
            ) : (
              <h2 className="font-medium text-slate-700">
                Welcome to Healing Chat
              </h2>
            )}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={startNewConversation}
                  variant="ghost"
                  size="icon"
                  className="hover:bg-rose-100 hover:text-rose-600 text-slate-600"
                >
                  <Plus size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>New conversation</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {!activeConversation ||
          (activeConversation && messagesWithSentiment.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-24 h-24 rounded-full bg-rose-100 flex items-center justify-center mb-6">
                <Heart size={40} className="text-rose-500" />
              </div>
              <h3 className="text-2xl font-medium mb-3 text-slate-700">
                {activeConversation
                  ? "Start expressing yourself"
                  : "Welcome to your safe space"}
              </h3>
              <p className="text-slate-600 max-w-md mb-6 leading-relaxed">
                {activeConversation
                  ? "Send a message to begin."
                  : "This is a place where you can express yourself freely. Your thoughts and feelings are valid. I'm here to listen."}
              </p>
              <Button
                onClick={() =>
                  activeConversation
                    ? inputRef.current?.focus()
                    : startNewConversation()
                }
                className="bg-rose-500 hover:bg-rose-600 text-white px-6"
                style={{ borderRadius: "12px" }}
              >
                {activeConversation
                  ? "Start chatting"
                  : "Start a New Conversation"}
              </Button>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              <AnimatePresence initial={false}>
                {messagesWithSentiment.map((message) => (
                  <motion.div
                    key={message.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div className="flex flex-col max-w-[85%]">
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-3 shadow-sm",
                          message.role === "user"
                            ? "bg-slate-700 text-white rounded-tr-none"
                            : "bg-rose-100 text-slate-800 rounded-tl-none"
                        )}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>

                      {message.role === "user" && message.sentiment && (
                        <div className="flex gap-2 mt-1.5 self-end items-center">
                          <TooltipProvider delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className="text-xs font-normal bg-white/80 backdrop-blur-sm cursor-default"
                                >
                                  {message.sentiment.isLoading ? (
                                    <div className="flex items-center gap-1">
                                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                                      <span>Sarcasm...</span>
                                    </div>
                                  ) : (
                                    <span>
                                      {message.sentiment.sarcasmDetected
                                        ? "Sarcastic"
                                        : "Not Sarcastic"}
                                    </span>
                                  )}
                                </Badge>
                              </TooltipTrigger>
                              {!message.sentiment.isLoading &&
                                message.sentiment.sarcasmDetected &&
                                message.sentiment.sarcasmReason &&
                                message.sentiment.sarcasmReason !==
                                  "Analyzing..." && (
                                  <TooltipContent
                                    side="bottom"
                                    className="max-w-xs"
                                  >
                                    <p className="text-xs">
                                      {message.sentiment.sarcasmReason}
                                    </p>
                                  </TooltipContent>
                                )}
                            </Tooltip>
                          </TooltipProvider>

                          <Badge
                            className={cn(
                              "text-xs text-white font-normal",
                              getSentimentColor(message.sentiment.emotionLabel),
                              message.sentiment.isLoading &&
                                "bg-slate-400/90 hover:bg-slate-400"
                            )}
                          >
                            {message.sentiment.isLoading ? (
                              <div className="flex items-center gap-1">
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                <span>Emotion...</span>
                              </div>
                            ) : (
                              <span>
                                {capitaliseFirstLetter(
                                  message.sentiment.emotionLabel
                                )}{" "}
                                {message.sentiment.emotionLabel !== "Error" &&
                                  message.sentiment.emotionLabel !==
                                    "Analyzing..." &&
                                  `${message.sentiment.emotionConfidence.toFixed(
                                    0
                                  )}%`}
                              </span>
                            )}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Chat input area - kept it simple but effective */}
        <div className="border-t border-slate-200 p-4 bg-white/80 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                placeholder={
                  activeConversation
                    ? "Express yourself here..."
                    : "Start or select a conversation"
                }
                className="pr-12 py-6 bg-white border-slate-200 rounded-xl shadow-sm focus-visible:ring-rose-500"
                disabled={isLoading || !activeConversation}
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-9 w-9 rounded-full bg-rose-500 hover:bg-rose-600"
                disabled={isLoading || !input.trim() || !activeConversation}
              >
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <ChevronRight size={18} className="text-white" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
