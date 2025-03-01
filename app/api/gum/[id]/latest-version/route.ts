import { auth } from "@/auth";
import db from "@/db";
import { getLatestVersion } from "@/services/versions";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const userId = session?.user.id;
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const gumId = params.id;
  const gum = await db.query.gums.findFirst({
    where: (gums, { eq }) => eq(gums.id, gumId),
  });

  if (!gum || gum.userId !== userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const version = await getLatestVersion({ gumId });
  if (!version) {
    return new Response("Version not found", { status: 404 });
  }

  return new Response(JSON.stringify(version), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
