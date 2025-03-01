import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { z } from "zod";
import { editLandingPagePrompt } from "@/lib/prompts";
import { createVersion } from "@/services/versions";
import { auth } from "@/auth";
import db from "@/db";
import { sanitizeHtml } from "@/lib/sanitize";

export const maxDuration = 100;

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user.id;
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { text, element, fullHtml, gumId, versionId, isDelete } = await req.json();

  const gum = await db.query.gums.findFirst({
    where: (gums, { eq }) => eq(gums.id, gumId),
  });

  if (!gum || gum.userId !== userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const prompt = isDelete
    ? `Remove this element completely from the HTML: ${element.html}`
    : editLandingPagePrompt(text, element.html);

  const { partialObjectStream } = streamObject({
    model: anthropic("claude-3-7-sonnet-20250219") || openai("gpt-4o-mini"),
    temperature: 0.7,
    schema: z.object({
      updatedHtml: z.string().describe("The updated HTML for the element with the requested changes"),
    }),
    prompt,
  });

  let updatedHtml = "";
  for await (const partialObject of partialObjectStream) {
    if (partialObject.updatedHtml) {
      updatedHtml = partialObject.updatedHtml.trim();
    }
  }

  if (!updatedHtml.startsWith("<")) {
    throw new Error("Invalid HTML response from AI");
  }

  // Sanitize the AI-generated HTML, blocking any JavaScript execution vectors
  const sanitizedHtml = sanitizeHtml(updatedHtml);

  const normalizedOriginal = element.html.replace(/\s+/g, " ").trim();
  const normalizedFullHtml = fullHtml.replace(/\s+/g, " ").trim();
  const newHtml = normalizedFullHtml.replace(normalizedOriginal, sanitizedHtml);

  const version = await createVersion({
    html: newHtml,
    prompt,
    gumId,
    parentId: versionId,
  });

  return new Response(
    JSON.stringify({
      html: version.html,
      success: true,
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}
