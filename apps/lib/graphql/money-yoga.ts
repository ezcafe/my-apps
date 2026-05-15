import { createSchema, createYoga } from "graphql-yoga";
import { moneyTypeDefs } from "@/lib/graphql/money-typeDefs";
import { moneyResolvers } from "@/lib/graphql/money-resolvers";
import { createMoneyGraphQLContext } from "@/lib/graphql/context";

const schema = createSchema({
  typeDefs: moneyTypeDefs,
  resolvers: moneyResolvers,
});

export function handleMoneyGraphQL(request: Request, responseHeaders: Headers) {
  const yoga = createYoga({
    schema,
    graphqlEndpoint: "/api/graphql",
    landingPage: false,
    context: async () => createMoneyGraphQLContext(responseHeaders),
    maskedErrors: process.env.NODE_ENV === "production",
  });

  return yoga.fetch(request);
}
