import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/pages/home.tsx"),
  route("revision/:id", "routes/pages/revision.$id.tsx"),
  route("*", "routes/pages/notfound.tsx"),
] satisfies RouteConfig;
