import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { DeepAgentStateType, Todo } from "./state.js";
import { ToolMessage } from "@langchain/core/messages";
import {
    WRITE_TODOS_DESCRIPTION,
    EDIT_DESCRIPTION,
    TOOL_DESCRIPTION,
} from "./prompts.js";

export const writeTodos = tool(
    async (input: { todos: Todo[] }, config) => {
        const state = config?.configurable?.state as DeepAgentStateType;
        if (!state) {
            throw new Error("State not available in tool execution");
        }

        state.todos = input.todos;

        return {
            todos: input.todos,
            messages: [
                new ToolMessage({
                    content: `Updated todo list to ${JSON.stringify(
                        input.todos
                    )}`,
                    tool_call_id: config?.configurable?.tool_call_id || "",
                }),
            ],
        };
    },
    {
        name: "write_todos",
        description: WRITE_TODOS_DESCRIPTION,
        schema: z.object({
            todos: z.array(
                z.object({
                    content: z.string(),
                    status: z.enum(["pending", "in_progress", "completed"]),
                })
            ),
        }),
    }
);

export const ls = tool(
    async (input: {}, config) => {
        const state = config?.configurable?.state as DeepAgentStateType;
        const files = state?.files || {};
        return Object.keys(files);
    },
    {
        name: "ls",
        description: "List all files",
        schema: z.object({}),
    }
);

export const readFile = tool(
    async (
        input: {
            file_path: string;
            offset?: number;
            limit?: number;
        },
        config
    ) => {
        const state = config?.configurable?.state as DeepAgentStateType;
        const mockFilesystem = state?.files || {};
        const { file_path, offset = 0, limit = 2000 } = input;

        if (!(file_path in mockFilesystem)) {
            return `Error: File '${file_path}' not found`;
        }

        const content = mockFilesystem[file_path];

        // Handle empty file
        if (!content || content.trim() === "") {
            return "System reminder: File exists but has empty contents";
        }

        // Split content into lines
        const lines = content.split("\n");

        // Apply line offset and limit
        const startIdx = offset;
        const endIdx = Math.min(startIdx + limit, lines.length);

        // Handle case where offset is beyond file length
        if (startIdx >= lines.length) {
            return `Error: Line offset ${offset} exceeds file length (${lines.length} lines)`;
        }

        // Format output with line numbers (cat -n format)
        const resultLines: string[] = [];
        for (let i = startIdx; i < endIdx; i++) {
            let lineContent = lines[i];

            // Truncate lines longer than 2000 characters
            if (lineContent.length > 2000) {
                lineContent = lineContent.substring(0, 2000);
            }

            // Line numbers start at 1, so add 1 to the index
            const lineNumber = i + 1;
            resultLines.push(
                `${lineNumber.toString().padStart(6)}\\t${lineContent}`
            );
        }

        return resultLines.join("\\n");
    },
    {
        name: "read_file",
        description: TOOL_DESCRIPTION,
        schema: z.object({
            file_path: z.string(),
            offset: z.number().optional(),
            limit: z.number().optional(),
        }),
    }
);

export const writeFile = tool(
    async (input: { file_path: string; content: string }, config) => {
        const state = config?.configurable?.state as DeepAgentStateType;
        const files = state?.files || {};
        files[input.file_path] = input.content;

        return {
            files,
            messages: [
                new ToolMessage({
                    content: `Updated file ${input.file_path}`,
                    tool_call_id: config?.configurable?.tool_call_id || "",
                }),
            ],
        };
    },
    {
        name: "write_file",
        description: "Write to a file.",
        schema: z.object({
            file_path: z.string(),
            content: z.string(),
        }),
    }
);

export const editFile = tool(
    async (
        input: {
            file_path: string;
            old_string: string;
            new_string: string;
            replace_all?: boolean;
        },
        config
    ) => {
        const state = config?.configurable?.state as DeepAgentStateType;
        const mockFilesystem = state?.files || {};
        const {
            file_path,
            old_string,
            new_string,
            replace_all = false,
        } = input;

        // Check if file exists in mock filesystem
        if (!(file_path in mockFilesystem)) {
            return `Error: File '${file_path}' not found`;
        }

        // Get current file content
        const content = mockFilesystem[file_path];

        // Check if old_string exists in the file
        if (!content.includes(old_string)) {
            return `Error: String not found in file: '${old_string}'`;
        }

        // If not replace_all, check for uniqueness
        if (!replace_all) {
            const occurrences = (
                content.match(
                    new RegExp(
                        old_string.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&"),
                        "g"
                    )
                ) || []
            ).length;
            if (occurrences > 1) {
                return `Error: String '${old_string}' appears ${occurrences} times in file. Use replace_all=true to replace all instances, or provide a more specific string with surrounding context.`;
            } else if (occurrences === 0) {
                return `Error: String not found in file: '${old_string}'`;
            }
        }

        const newContent = replace({
            replaceAll: replace_all,
            content,
            current: old_string,
            next: new_string,
            filePath: file_path,
        });

        // Update the mock filesystem
        mockFilesystem[file_path] = newContent;

        return {
            files: mockFilesystem,
            messages: [
                new ToolMessage({
                    content: `Updated file ${file_path}`,
                    tool_call_id: config?.configurable?.tool_call_id || "",
                }),
            ],
        };
    },
    {
        name: "edit_file",
        description: EDIT_DESCRIPTION,
        schema: z.object({
            file_path: z.string(),
            old_string: z.string(),
            new_string: z.string(),
            replace_all: z.boolean().optional(),
        }),
    }
);

const replace = (options: {
    replaceAll: boolean;
    content: string;
    current: string;
    next: string;
    filePath: string;
}) => {
    if (!options.replaceAll) {
        console.log(`Replacing string in '${options.filePath}'`);
        return options.content.replace(options.current, options.next);
    }

    const newContent = options.content.replaceAll(
        options.current,
        options.next
    );
    const replacementCount = (
        options.content.match(
            new RegExp(
                options.current.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&"),
                "g"
            )
        ) || []
    ).length;

    console.log(
        `Successfully replaced ${replacementCount} instance(s) of the string in '${options.filePath}'`
    );

    return newContent;
};
