import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

interface DocEntry {
  id: string;
  title: string;
  keywords: string[];
  content: string;
}

const knowledgeBase: DocEntry[] = [
  {
    id: "doc-1",
    title: "Password Reset Guide",
    keywords: ["password", "reset", "forgot", "credentials", "locked"],
    content:
      "To reset your password: 1) Go to Settings > Security > Reset Password. " +
      "2) Click 'Send Reset Link'. 3) Check your email for the reset link (expires in 24 hours). " +
      "4) If you don't receive the email, check your spam folder. " +
      "Note: After 5 failed login attempts, the account is temporarily locked for 30 minutes.",
  },
  {
    id: "doc-2",
    title: "Billing & Subscription Management",
    keywords: [
      "billing",
      "payment",
      "subscription",
      "invoice",
      "plan",
      "upgrade",
      "downgrade",
      "charge",
      "refund",
    ],
    content:
      "Billing is managed under Settings > Billing. You can update payment methods, " +
      "view/download invoices, change subscription plans, and set up auto-renewal. " +
      "For billing disputes, create a support ticket with priority 'high'. " +
      "Enterprise customers should contact their dedicated account manager. " +
      "Refunds are processed within 5-7 business days.",
  },
  {
    id: "doc-3",
    title: "Troubleshooting Login & App Crashes",
    keywords: [
      "login",
      "crash",
      "error",
      "stuck",
      "loading",
      "authentication",
      "sign in",
      "access",
      "crashing",
    ],
    content:
      "Common login/crash solutions: 1) Clear browser cache and cookies. " +
      "2) Try incognito/private browsing. 3) Use a supported browser (Chrome, Firefox, Edge, Safari). " +
      "4) Check the service status page for outages. 5) Disable browser extensions if app crashes after login. " +
      "6) For SSO users, verify identity provider configuration. " +
      "If the issue persists, create a support ticket with browser/OS details.",
  },
  {
    id: "doc-4",
    title: "API Rate Limits",
    keywords: ["api", "rate", "limit", "throttle", "429", "request", "quota"],
    content:
      "API rate limits by plan: Free — 100 req/hour, Pro — 1,000 req/hour, " +
      "Enterprise — 10,000 req/hour. A 429 status code indicates rate limiting. " +
      "Implement exponential backoff in your integration. " +
      "Contact support to request a temporary rate limit increase for data migrations.",
  },
  {
    id: "doc-5",
    title: "Data Export",
    keywords: ["export", "data", "download", "backup", "csv", "json"],
    content:
      "To export data: Go to Settings > Data Management > Export. " +
      "Supported formats: CSV, JSON, PDF. Large exports are processed asynchronously — " +
      "you'll receive an email when ready. Export history is available for 30 days. " +
      "Enterprise plans support scheduled automatic exports.",
  },
  {
    id: "doc-6",
    title: "SSO Configuration",
    keywords: ["sso", "single sign-on", "saml", "okta", "identity", "provider", "azure"],
    content:
      "SSO is available on Pro and Enterprise plans. Supported providers: Okta, Azure AD, " +
      "Google Workspace, OneLogin. Setup: Go to Settings > Security > SSO and upload your " +
      "IdP metadata XML or enter configuration manually. " +
      "Enterprise plans can enforce SSO for all team members.",
  },
  {
    id: "doc-7",
    title: "Account & Team Management",
    keywords: ["account", "team", "member", "invite", "role", "permission", "admin"],
    content:
      "Manage your team under Settings > Team. Admins can invite/remove members, " +
      "assign roles (admin, member, viewer), and set permissions. " +
      "Role changes take effect immediately. Removing a member revokes access " +
      "but preserves their data for 30 days.",
  },
];

function scoreDocument(doc: DocEntry, queryTerms: string[]): number {
  let score = 0;
  for (const keyword of doc.keywords) {
    for (const term of queryTerms) {
      if (keyword.includes(term) || term.includes(keyword)) {
        score += 1;
      }
      if (keyword === term) {
        score += 2;
      }
    }
  }
  const titleLower = doc.title.toLowerCase();
  for (const term of queryTerms) {
    if (titleLower.includes(term)) {
      score += 1;
    }
  }
  return score;
}

const searchDocsSchema = z.object({
  query: z.string(),
});

// @ts-ignore — TS2589: LangChain's Zod generics cause deep type instantiation
export const searchDocsTool = new DynamicStructuredTool({
  name: "searchDocs",
  description:
    "Search the product documentation knowledge base for relevant articles. " +
    "Takes a 'query' string parameter. " +
    "Use this to answer product questions, troubleshoot issues, or find guides.",
  schema: searchDocsSchema,
  func: async ({ query }: z.infer<typeof searchDocsSchema>) => {
    const queryTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t: string) => t.length > 2);

    if (queryTerms.length === 0) {
      return JSON.stringify({
        results: [],
        message: "Query too vague. Please provide more specific search terms.",
      });
    }

    const scored = knowledgeBase
      .map((doc) => ({ ...doc, score: scoreDocument(doc, queryTerms) }))
      .filter((doc) => doc.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (scored.length === 0) {
      return JSON.stringify({
        results: [],
        message: `No documentation found for "${query}". A support ticket may be needed.`,
      });
    }

    return JSON.stringify({
      results: scored.map(({ id, title, content }) => ({ id, title, content })),
      message: `Found ${scored.length} relevant article(s).`,
    });
  },
});
