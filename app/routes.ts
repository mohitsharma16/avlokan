import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/pages/home.tsx"),
  route("revision/:id", "routes/pages/revision.$id.tsx"),
  route("api/ai-review", "routes/pages/api.ai-review.ts"),
  route("*", "routes/pages/notfound.tsx"),
] satisfies RouteConfig;
