import { handleBabyGraphQLHttp } from "@/lib/graphql/baby-http-handler";

export async function POST(request: Request) {
  return handleBabyGraphQLHttp(request);
}
