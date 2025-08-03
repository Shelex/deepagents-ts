import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";

export interface Todo {
    content: string;
    status: "pending" | "in_progress" | "completed";
}

export interface Files {
    [fileName: string]: string;
}

export function fileReducer(
    left: Files | null,
    right: Files | null
): Files | null {
    if (!left) {
        return right;
    }

    if (!right) {
        return left;
    }

    return { ...left, ...right };
}

export const DeepAgentState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (currentState, updateValue) =>
            currentState.concat(updateValue),
        default: () => [],
    }),
    todos: Annotation<Todo[]>({
        reducer: (currentState, updateValue) => updateValue || currentState,
        default: () => [],
    }),
    files: Annotation<Record<string, string>>({
        reducer: (currentState, updateValue) => ({
            ...currentState,
            ...updateValue,
        }),
        default: () => ({}),
    }),
});

export type DeepAgentStateType = typeof DeepAgentState.State;
