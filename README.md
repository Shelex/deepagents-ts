## This is an unofficial port of the [hwchase17/deepagents](https://github.com/hwchase17/deepagents) Python package to TypeScript

# 🧠🤖Deep Agents

Using an LLM to call tools in a loop is the simplest form of an agent.
This architecture, however, can yield agents that are “shallow” and fail to plan and act over longer, more complex tasks.
Applications like “Deep Research”, "Manus", and “Claude Code” have gotten around this limitation by implementing a combination of four things:
a **planning tool**, **sub agents**, access to a **file system**, and a **detailed prompt**.

<img src="deep_agents.png" alt="deep agent" width="600"/>

`deepagents` is a Typescript package that implements these in a general purpose way so that you can easily create a Deep Agent for your application.

**Acknowledgements: This project was primarily inspired by Claude Code, and initially was largely an attempt to see what made Claude Code general purpose, and make it even more so.**

## Installation

```bash
npm install deepagents
```

## Usage

> NB! This part of documentation is not fully migrated

See [src/examples/research/agent.ts](src/examples/research/agent.ts) for a more complex example.

The agent created with `createDeepAgent` is just a LangGraph graph - so you can interact with it (streaming, human-in-the-loop, memory, studio)
in the same way you would any LangGraph agent.

## Creating a custom deep agent

There is an option argument with three properties you can pass to `createDeepAgent` to create your own custom deep agent.

### `tools` (Required)

This should be a list of functions or LangChain `@tool` objects.
The agent (and any subagents) will have access to these tools.

### `instructions` (Required)

This will serve as part of the prompt of the deep agent.
Note that there is a [built in system prompt](#built-in-prompt) as well, so this is not the _entire_ prompt the agent will see.

### `subagents` (Optional)

This can be used to specify any custom subagents this deep agent will have access to.
You can read more about why you would want to use subagents [here](#sub-agents)
`subagents` should be a list of dictionaries, where each dictionary follow this schema:

```js
export interface SubAgent {
    name: string;
    description: string;
    prompt: string;
    tools?: string[];
}
```

-   **name**: This is the name of the subagent, and how the main agent will call the subagent
-   **description**: This is the description of the subagent that is shown to the main agent
-   **prompt**: This is the prompt used for the subagent
-   **tools**: This is the list of tools that the subagent has access to. By default will have access to all tools passed in, as well as all built-in tools.

To use it looks like:

```js
import { createDeepAgent, SubAgent } from "deepagents";

const researchSubAgent: SubAgent = {
    name: "research-agent",
    description: "Used to research more in depth questions...",
    prompt: subResearchPrompt,
    tools: ["internet_search"],
};
const agent = createDeepAgent({
    instructions: researchInstructions,
    subagents: [researchSubAgent],
    tools: [internetSearch],
});
```

### `model` (Optional)

By default, `deepagents` will use local LM Studio. If you want to use a different model,
you can pass a [LangChain model object](https://js.langchain.com/docs/integrations/chat/).

## Deep Agent Details

The below components are built into `deepagents` and helps make it work for deep tasks off-the-shelf.

### System Prompt

`deepagents` comes with a [built-in system prompt](src/prompts.ts). This is relatively detailed prompt that is heavily based on and inspired by [attempts](https://github.com/kn1026/cc/blob/main/claudecode.md) to [replicate](https://github.com/asgeirtj/system_prompts_leaks/blob/main/Anthropic/claude-code.md)
Claude Code's system prompt. It was made more general purpose than Claude Code's system prompt.
This contains detailed instructions for how to use the built-in planning tool, file system tools, and sub agents.
Note that part of this system prompt [can be customized](#promptprefix--required-)

Without this default system prompt - the agent would not be nearly as successful at going as it is.
The importance of prompting for creating a "deep" agent cannot be understated.

### Planing Tool

`deepagents` comes with a built-in planning tool. This planning tool is very simple and is based on ClaudeCode's TodoWrite tool.
This tool doesn't actually do anything - it is just a way for the agent to come up with a plan, and then have that in the context to help keep it on track.

### File System Tools

`deepagents` comes with four built-in file system tools: `ls`, `edit_file`, `read_file`, `write_file`.
These do not actually use a file system - rather, they mock out a file system using LangGraph's State object.
This means you can easily run many of these agents on the same machine without worrying that they will edit the same underlying files.

Right now the "file system" will only be one level deep (no sub directories).

These files can be passed in (and also retrieved) by using the `files` key in the LangGraph State object.

```js
import { createDeepAgent } from "deepagents";

const agent = createDeepAgent({
    instructions: researchInstructions,
    subagents: [critiqueSubAgent, researchSubAgent],
    tools: [internetSearch],
});

const result = await agent.invoke({
    messages: [new HumanMessage("what is langchain?")],
    files: [{"README.md": "# Deep Agents\n\nThis is a README file for the deep agents example."}],
});

# Access any files afterwards like this
result.files
```

### Sub Agents

`deepagents` comes with the built-in ability to call sub agents (based on Claude Code).
It has access to a `general-purpose` subagent at all times - this is a subagent with the same instructions as the main agent and all the tools that is has access to.
You can also specify [custom sub agents](#subagents--optional-) with their own instructions and tools.

Sub agents are useful for ["context quarantine"](https://www.dbreunig.com/2025/06/26/how-to-fix-your-context.html#context-quarantine) (to help not pollute the overall context of the main agent)
as well as custom instructions.

## Roadmap

-   [ ] Allow users to customize full system prompt
-   [ ] Code cleanliness (type hinting, docstrings, formating)
-   [ ] Allow for more of a robust virtual filesystem
-   [ ] Create an example of a deep coding agent built on top of this
-   [ ] Benchmark the example of [deep research agent](src/examples/research/agent.ts)
-   [ ] Add human-in-the-loop support for tools
