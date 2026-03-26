import * as readline from "readline";
import * as dotenv from "dotenv";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { createSupportAgent } from "./agent/agent";
import { AgentExecutor } from "langchain/agents";

dotenv.config();

function printBanner(): void {
  console.log("");
  console.log("===========================================");
  console.log("       AI Support Agent (Internal)");
  console.log("===========================================");
  console.log(" Type a message to get support assistance.");
  console.log(" Commands: help | quit");
  console.log("===========================================");
  console.log("");
}

function printHelp(): void {
  console.log("");
  console.log("--- Available Commands ---");
  console.log("  help       Show this help message");
  console.log("  quit       Exit the agent");
  console.log("");
  console.log("--- Example Queries ---");
  console.log('  "How do I reset my password?"');
  console.log('  "The app keeps crashing after login."');
  console.log('  "User user-1 is blocked from billing and this is urgent."');
  console.log('  "Create a support ticket for login issues."');
  console.log("");
  console.log("--- Mock User IDs for Testing ---");
  console.log("  user-1  Alice Johnson (Enterprise, Admin)");
  console.log("  user-2  Bob Smith (Free, Member)");
  console.log("  user-3  Carol Davis (Pro, Admin)");
  console.log("  user-4  Dan Martinez (Enterprise, Member)");
  console.log("");
}

interface IntermediateStep {
  action: {
    tool: string;
    toolInput: Record<string, unknown>;
  };
  observation: string;
}

function displayToolCalls(steps: IntermediateStep[]): void {
  if (!steps || steps.length === 0) return;

  console.log("");
  console.log("  --- Agent Tool Calls ---");
  for (const step of steps) {
    const inputStr = JSON.stringify(step.action.toolInput);
    console.log(`  [${step.action.tool}] called with: ${inputStr}`);

    try {
      const parsed = JSON.parse(step.observation);
      const preview = JSON.stringify(parsed, null, 2)
        .split("\n")
        .slice(0, 6)
        .map((line) => `    ${line}`)
        .join("\n");
      console.log(`  Result (preview):\n${preview}`);
      if (JSON.stringify(parsed, null, 2).split("\n").length > 6) {
        console.log("    ...");
      }
    } catch {
      const truncated =
        step.observation.length > 200
          ? step.observation.slice(0, 200) + "..."
          : step.observation;
      console.log(`  Result: ${truncated}`);
    }
    console.log("  ---");
  }
}

async function runCLI(agent: AgentExecutor): Promise<void> {
  const chatHistory: BaseMessage[] = [];

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = (): void => {
    rl.question("You: ", async (input: string) => {
      const trimmed = input.trim();

      if (!trimmed) {
        askQuestion();
        return;
      }

      if (trimmed.toLowerCase() === "quit" || trimmed.toLowerCase() === "exit") {
        console.log("\nGoodbye!\n");
        rl.close();
        return;
      }

      if (trimmed.toLowerCase() === "help") {
        printHelp();
        askQuestion();
        return;
      }

      try {
        const result = await agent.invoke({
          input: trimmed,
          chat_history: chatHistory,
        });

        displayToolCalls(result.intermediateSteps as IntermediateStep[]);

        console.log(`\nAgent: ${result.output}\n`);

        chatHistory.push(new HumanMessage(trimmed));
        chatHistory.push(new AIMessage(result.output));
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error occurred";

        if (message.includes("API key")) {
          console.error("\nError: Invalid or missing OpenAI API key.");
          console.error("Please check your .env file.\n");
        } else if (message.includes("Rate limit")) {
          console.error("\nError: OpenAI rate limit reached. Please wait and try again.\n");
        } else {
          console.error(`\nError: ${message}\n`);
        }
      }

      askQuestion();
    });
  };

  askQuestion();
}

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY environment variable is required.");
    console.error("");
    console.error("Setup:");
    console.error("  1. Copy .env.example to .env");
    console.error("  2. Add your OpenAI API key to the .env file");
    console.error("");
    process.exit(1);
  }

  printBanner();

  try {
    console.log("Initializing agent...\n");
    const agent = await createSupportAgent();
    console.log("Agent ready. Type 'help' for usage info.\n");
    await runCLI(agent);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to initialize";
    console.error(`Fatal: Could not initialize the agent — ${message}`);
    process.exit(1);
  }
}

main();
