import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { StructuredTool } from "@langchain/core/tools";
import { LanguageModelLike } from "@langchain/core/language_models/base";
import { SubAgent, createTaskTool } from "./subAgent.js";
import { DeepAgentState } from "./state.js";
import { getDefaultModel, getLocalLMStudio } from "./model.js";
import { writeTodos, writeFile, readFile, ls, editFile } from "./tools.js";

const BASE_PROMPT = `You have access to a number of standard tools

## \`write_todos\`

You have access to the \`write_todos\` tools to help you manage and plan tasks. Use these tools VERY frequently to ensure that you are tracking your tasks and giving the user visibility into your progress.
These tools are also EXTREMELY helpful for planning tasks, and for breaking down larger complex tasks into smaller steps. If you do not use this tool when planning, you may forget to do important tasks - and that is unacceptable.

It is critical that you mark todos as completed as soon as you are done with a task. Do not batch up multiple tasks before marking them as completed.

## \`task\`

- When doing web search, prefer to use the \`task\` tool in order to reduce context usage.`;

export interface CreateDeepAgentOptions {
    tools: StructuredTool[];
    instructions: string;
    model?: string | LanguageModelLike;
    subagents?: SubAgent[];
    stateSchema?: typeof DeepAgentState;
}

/**
 * Create a deep agent.
 *
 * This agent will by default have access to a tool to write todos (write_todos),
 * and then four file editing tools: write_file, ls, read_file, edit_file.
 *
 * @param options Configuration options for the deep agent
 * @returns A LangGraph agent
 */
export function createDeepAgent(options: CreateDeepAgentOptions) {
    const {
        tools,
        instructions,
        model,
        subagents = [],
        stateSchema = DeepAgentState,
    } = options;

    const prompt = instructions + BASE_PROMPT;
    const builtInTools = [writeTodos, writeFile, readFile, ls, editFile];

    //TODO: lookup for model that has better tool calling capabilities
    const actualModel = model || getLocalLMStudio() || getDefaultModel();

    const taskTool = createTaskTool(
        [...tools, ...builtInTools],
        instructions,
        subagents,
        actualModel as LanguageModelLike,
        stateSchema
    );

    const allTools = [taskTool, ...builtInTools, ...tools];

    return createReactAgent({
        llm: actualModel as LanguageModelLike,
        tools: allTools,
        messageModifier: prompt,
        stateSchema,
    });
}
