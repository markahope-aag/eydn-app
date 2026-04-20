import { createFrontendApiProxyHandlers } from "@clerk/nextjs/server";

export const { GET, POST, PUT, DELETE, PATCH } = createFrontendApiProxyHandlers({
  proxyPath: "/api/clerk-proxy",
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
