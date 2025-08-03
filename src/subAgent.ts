import { tool, type StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { DeepAgentState, DeepAgentStateType } from "./state.js";
import { ToolMessage, HumanMessage } from "@langchain/core/messages";
import { TASK_DESCRIPTION_PREFIX, TASK_DESCRIPTION_SUFFIX } from "./prompts.js";
import { LanguageModelLike } from "@langchain/core/language_models/base";

export interface SubAgent {
    name: string;
    description: string;
    prompt: string;
    tools?: string[];
}

export function createTaskTool(
    tools: StructuredTool[],
    instructions: string,
    subagents: SubAgent[],
    model: LanguageModelLike,
    stateAnnotation?: typeof DeepAgentState
) {
    const agents: Record<string, any> = {
        "general-purpose": createReactAgent({
            llm: model,
            tools,
            messageModifier: instructions,
            stateSchema: stateAnnotation,
        }),
    };

    const toolsByName = tools.reduce((tools, tool) => {
        const toolName = tool.name ?? tool.description ?? "unknown_tool";
        tools[toolName] = tool;
        return tools;
    }, {} as Record<string, StructuredTool>);

    for (const agent of subagents) {
        let agentTools: StructuredTool[];
        if (agent.tools) {
            agentTools = agent.tools.map((t) => toolsByName[t]);
        } else {
            agentTools = tools as StructuredTool[];
        }

        agents[agent.name] = createReactAgent({
            llm: model,
            tools: agentTools,
            messageModifier: agent.prompt,
            stateSchema: stateAnnotation,
        });
    }

    const otherAgentsString = subagents
        .map((agent) => `- ${agent.name}: ${agent.description}`)
        .join("\\n");

    return tool(
        async (
            input: { description: string; subagent_type: string },
            config
        ) => {
            const { description, subagent_type } = input;
            const state = config?.configurable?.state as DeepAgentStateType;

            if (!(subagent_type in agents)) {
                return `Error: invoked agent of type ${subagent_type}, the only allowed types are [${Object.keys(
                    agents
                )
                    .map((k) => `\`${k}\``)
                    .join(", ")}]`;
            }

            const subAgent = agents[subagent_type];
            const newState = {
                ...state,
                messages: [new HumanMessage({ content: description })],
            };

            const result = await subAgent.invoke(newState);

            return {
                files: result.files || {},
                messages: [
                    new ToolMessage({
                        content:
                            result.messages[result.messages.length - 1].content,
                        tool_call_id: config?.configurable?.tool_call_id || "",
                    }),
                ],
            };
        },
        {
            name: "task",
            description:
                TASK_DESCRIPTION_PREFIX.replace(
                    "{other_agents}",
                    otherAgentsString
                ) + TASK_DESCRIPTION_SUFFIX,
            schema: z.object({
                description: z.string(),
                subagent_type: z.string(),
            }),
        }
    );
}
