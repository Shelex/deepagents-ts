import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { LanguageModelLike } from "@langchain/core/language_models/base";

export function getDefaultModel(): ChatAnthropic {
    return new ChatAnthropic({
        modelName: "claude-3-5-sonnet-20241022",
        maxTokens: 64000,
        temperature: 0,
    });
}

export function getLocalLMStudio(): LanguageModelLike {
    process.env.OPENAI_API_KEY = "lm-studio";

    return new ChatOpenAI({
        modelName: "mlx-community/llama-3.2-3b-instruct:2",
        openAIApiKey: "lm-studio",
        configuration: {
            baseURL: "http://localhost:1234/v1",
        },
        maxTokens: 512,
        temperature: 0.3,
    });
}
