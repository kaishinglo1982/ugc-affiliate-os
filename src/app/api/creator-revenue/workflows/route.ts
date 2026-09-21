import { GET as getSnapshot } from "../snapshot/route";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return getSnapshot(request);
}
