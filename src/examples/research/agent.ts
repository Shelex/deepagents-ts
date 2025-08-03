import { createDeepAgent, SubAgent } from "../../index";

import { tool } from "@langchain/core/tools";
import { HumanMessage } from "@langchain/core/messages";
import { z } from "zod";

const internetSearch = tool(
    async (input: {
        query: string;
        max_results?: number;
        topic?: "general" | "news" | "finance";
        include_raw_content?: boolean;
    }) => {
        const {
            query,
            max_results = 5,
            topic = "general",
            include_raw_content = false,
        } = input;

        //TODO mocked
        console.log(
            `Running mocked internet search for query: ${query}, topic: ${topic}`
        );
        return {
            results: [
                {
                    title: `Search result for: ${query}`,
                    url: "https://example.com",
                    content: `Mock search content for query: ${query}`,
                    raw_content: include_raw_content ?? "Raw content here...",
                },
            ],
        };
    },
    {
        name: "internet_search",
        description: "Run a web search",
        schema: z.object({
            query: z.string(),
            max_results: z.number().optional(),
            topic: z.enum(["general", "news", "finance"]).optional(),
            include_raw_content: z.boolean().optional(),
        }),
    }
);

const subResearchPrompt = `You are a dedicated researcher. Your job is to conduct research based on the users questions.

Conduct thorough research and then reply to the user with a detailed answer to their question

only your FINAL answer will be passed on to the user. They will have NO knowledge of anything expect your final message, so your final report should be your final message!`;

const researchSubAgent: SubAgent = {
    name: "research-agent",
    description:
        "Used to research more in depth questions. Only give this researcher one topic at a time. Do not pass multiple sub questions to this researcher. Instead, you should break down a large topic into the necessary components, and then call multiple research agents in parallel, one for each sub question.",
    prompt: subResearchPrompt,
    tools: ["internet_search"],
};

const subCritiquePrompt = `You are a dedicated editor. You are being tasked to critique a report.

You can find the report at \`final_report.md\`.

You can find the question/topic for this report at \`question.txt\`.

The user may ask for specific areas to critique the report in. Respond to the user with a detailed critique of the report. Things that could be improved.

You can use the search tool to search for information, if that will help you critique the report

Do not write to the \`final_report.md\` yourself.

Things to check:
- Check that each section is appropriately named
- Check that the report is written as you would find in an essay or a textbook - it should be text heavy, do not let it just be a list of bullet points!
- Check that the report is comprehensive. If any paragraphs or sections are short, or missing important details, point it out.
- Check that the article covers key areas of the industry, ensures overall understanding, and does not omit important parts.
- Check that the article deeply analyzes causes, impacts, and trends, providing valuable insights
- Check that the article closely follows the research topic and directly answers questions
- Check that the article has a clear structure, fluent language, and is easy to understand.`;

const critiqueSubAgent: SubAgent = {
    name: "critique-agent",
    description:
        "Used to critique the final report. Give this agent some information about how you want it to critique the report.",
    prompt: subCritiquePrompt,
};

const researchInstructions = `You are an expert researcher. Your job is to conduct thorough research, and then write a polished report.

The first thing you should do is to write the original user question to \`question.txt\` so you have a record of it.

Use the research-agent to conduct deep research. It will respond to your questions/topics with a detailed answer.

When you think you have enough information to write a final report, write it to \`final_report.md\`

You can call the critique-agent to get a critique of the final report. After that (if needed) you can do more research and edit the \`final_report.md\`
You can do this however many times you want until you are satisfied with the result.

Only edit the file once at a time (if you call this tool in parallel, there may be conflicts).

Here are instructions for writing the final report:

CRITICAL: Make sure the answer is written in the same language as the human messages! If you make a todo plan - you should note in the plan what language the report should be in so you don't forget!
Note: the language the report should be in is the language the QUESTION is in, not the language/country that the question is ABOUT.

Please create a detailed answer to the overall research brief that:
1. Is well-organized with proper headings (# for title, ## for sections, ### for subsections)
2. Includes specific facts and insights from the research
3. References relevant sources using [Title](URL) format
4. Provides a balanced, thorough analysis. Be as comprehensive as possible, and include all information that is relevant to the overall research question. People are using you for deep research and will expect detailed, comprehensive answers.
5. Includes a "Sources" section at the end with all referenced links

You have access to a few tools.

## \`internet_search\`

Use this to run an internet search for a given query. You can specify the number of results, the topic, and whether raw content should be included.`;

const agent = createDeepAgent({
    instructions: researchInstructions,
    subagents: [critiqueSubAgent, researchSubAgent],
    tools: [internetSearch],
});

async function main() {
    try {
        const result = await agent.invoke({
            messages: [new HumanMessage("what is langchain?")],
        });

        console.log("\n✅ Agent Response:");
        const lastMessage = result.messages[result.messages.length - 1];
        console.log(lastMessage?.content);

        console.log("\n📁 Files created:", Object.keys(result.files || {}));
        console.log("📋 Todos:", result.todos?.length || 0);
    } catch (error) {
        console.error("Error running agent:", error);
    }
}

(async () => {
    await main();
})();

export { agent };
