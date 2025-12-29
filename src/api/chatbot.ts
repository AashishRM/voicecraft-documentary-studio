import OpenAI from "openai";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export const APIChatWithHuggingFace = async (
  messages: ChatMessage[],
  apiKey?: string
): Promise<string> => {
  // Get API key from parameter, environment variable, or localStorage
  const huggingFaceApiKey = 
    apiKey || 
    import.meta.env.VITE_HUGGINGFACE_API_KEY || 
    localStorage.getItem('huggingface_api_key') || 
    '';

  if (!huggingFaceApiKey) {
    throw new Error("Hugging Face API key is required. Please set VITE_HUGGINGFACE_API_KEY in your .env file or store it in localStorage as 'huggingface_api_key'");
  }

  // Using Qwen model from Hugging Face
  const model = "Qwen/Qwen2.5-7B-Instruct";
  
  // System prompt to ensure Nepali Devanagari output
  const systemPrompt = "तपाईं एक सहायक सहायक हुनुहुन्छ। सधैं देवनागरी नेपाली लिपिमा (नेपाली) जवाफ दिनुहोस्। नेपाली भाषामा विस्तृत र विस्तृत विवरणहरू प्रदान गर्नुहोस्। मात्र देवनागरी लिपि वर्णहरू प्रयोग गर्नुहोस्।";
  
  // Convert messages to OpenAI format
  // Limit conversation history to last 10 messages
  const recentMessages = messages.slice(-10);
  
  // Build messages array with system prompt
  const formattedMessages = [
    {
      role: "system" as const,
      content: systemPrompt,
    },
    ...recentMessages.filter(msg => msg.role !== "system").map(msg => ({
      role: (msg.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
      content: msg.content,
    })),
  ];

  try {
    // Create OpenAI client pointing to Hugging Face router
    const client = new OpenAI({
      baseURL: "https://router.huggingface.co/v1",
      apiKey: huggingFaceApiKey,
      dangerouslyAllowBrowser: true,
    });

    // Use OpenAI-compatible chat completions API
    const completion = await client.chat.completions.create({
      model: model,
      messages: formattedMessages,
      max_tokens: 500,
      temperature: 0.7,
    });

    // Extract the response text
    const generatedText = completion.choices[0]?.message?.content || "";
    
    if (!generatedText) {
      throw new Error("No response generated from the model");
    }

    return generatedText.trim() || "माफ गर्नुहोस्, मैले प्रतिक्रिया उत्पादन गर्न सकिन। कृपया पुनः प्रयास गर्नुहोस्।";
  } catch (error: any) {
    console.error("Hugging Face API Error:", error);
    
    // Handle specific error types
    if (error.status === 404) {
      throw new Error(`Model "${model}" not found. Please check the model name.`);
    }
    
    if (error.status === 503) {
      throw new Error("Model is currently loading. Please wait 30-60 seconds and try again.");
    }
    
    if (error.status === 429) {
      throw new Error("Rate limit exceeded. Please wait a moment before trying again.");
    }
    
    if (error.status === 401 || error.status === 403) {
      throw new Error("Invalid API key. Please check your Hugging Face API key.");
    }
    
    if (error.message) {
      throw error;
    }
    
    throw new Error(error.message || "Failed to get response from chatbot");
  }
};
