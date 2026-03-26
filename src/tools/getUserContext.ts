import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

interface UserContext {
  userId: string;
  name: string;
  plan: "free" | "pro" | "enterprise";
  role: "admin" | "member" | "viewer";
  recentActivity: string[];
}

const mockUsers: Record<string, UserContext> = {
  "user-1": {
    userId: "user-1",
    name: "Alice Johnson",
    plan: "enterprise",
    role: "admin",
    recentActivity: [
      "Visited billing page (2 hours ago)",
      "Updated payment method (1 day ago)",
      "Contacted support about invoice discrepancy (2 days ago)",
    ],
  },
  "user-2": {
    userId: "user-2",
    name: "Bob Smith",
    plan: "free",
    role: "member",
    recentActivity: [
      "Failed login attempts x3 (30 minutes ago)",
      "Password reset requested (1 hour ago)",
      "Viewed help documentation (1 hour ago)",
    ],
  },
  "user-3": {
    userId: "user-3",
    name: "Carol Davis",
    plan: "pro",
    role: "admin",
    recentActivity: [
      "API usage spike detected (1 hour ago)",
      "Added 5 new team members (3 hours ago)",
      "Upgraded from free plan (1 week ago)",
    ],
  },
  "user-4": {
    userId: "user-4",
    name: "Dan Martinez",
    plan: "enterprise",
    role: "member",
    recentActivity: [
      "App crash reported after login (10 minutes ago)",
      "Cleared browser cache (15 minutes ago)",
      "Submitted feedback form (1 day ago)",
    ],
  },
};

const getUserContextSchema = z.object({
  userId: z.string(),
});

// @ts-ignore — TS2589: LangChain's Zod generics cause deep type instantiation
export const getUserContextTool = new DynamicStructuredTool({
  name: "getUserContext",
  description:
    "Retrieve context about a specific user including their plan level, role, " +
    "and recent activity. Takes a 'userId' string parameter. " +
    "Use this to personalize responses and determine ticket priority.",
  schema: getUserContextSchema,
  func: async ({ userId }: z.infer<typeof getUserContextSchema>) => {
    const user = mockUsers[userId];

    if (!user) {
      return JSON.stringify({
        found: false,
        error: `No user found with ID "${userId}". Valid test IDs: user-1, user-2, user-3, user-4.`,
      });
    }

    return JSON.stringify({
      found: true,
      ...user,
    });
  },
});
