import { handleMoneyGraphQLHttp } from "@/lib/graphql/http-handler";

export async function POST(request: Request) {
  return handleMoneyGraphQLHttp(request, "graphql-savings-legacy");
}
