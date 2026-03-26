import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

let ticketCounter = 1000;

const createTicketSchema = z.object({
  title: z.string(),
  priority: z.enum(["low", "medium", "high"]),
});

// @ts-ignore — TS2589: LangChain's Zod generics cause deep type instantiation
export const createTicketTool = new DynamicStructuredTool({
  name: "createTicket",
  description:
    "Create a support ticket for issues that cannot be resolved through documentation alone, " +
    "or when the user explicitly requests a ticket. " +
    "Takes 'title' (string) and 'priority' ('low' | 'medium' | 'high') parameters. " +
    "Returns the new ticket ID and details.",
  schema: createTicketSchema,
  func: async ({ title, priority }: z.infer<typeof createTicketSchema>) => {
    ticketCounter++;
    const ticketId = `TKT-${ticketCounter}`;

    if (title.trim().length === 0) {
      return JSON.stringify({
        success: false,
        error: "Ticket title cannot be empty.",
      });
    }

    return JSON.stringify({
      success: true,
      ticketId,
      title,
      priority,
      status: "open",
      assignedTo: "support-queue",
      createdAt: new Date().toISOString(),
      message: `Support ticket ${ticketId} created successfully with ${priority} priority.`,
    });
  },
});
