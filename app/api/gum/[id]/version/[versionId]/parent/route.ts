import { auth } from "@/auth";
import db from "@/db";
import { getParentVersion } from "@/services/versions";

export async function GET(req: Request, { params }: { params: { id: string; versionId: string } }) {
  const session = await auth();
  const userId = session?.user.id;
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const gumId = params.id;
  const versionId = params.versionId;
  const gum = await db.query.gums.findFirst({
    where: (gums, { eq }) => eq(gums.id, gumId),
  });

  if (!gum || gum.userId !== userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const parentVersion = await getParentVersion({ versionId });
  if (!parentVersion) {
    return new Response("No parent version found", { status: 404 });
  }

  return new Response(JSON.stringify(parentVersion), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
