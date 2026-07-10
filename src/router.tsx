import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
} from "@tanstack/react-router";
import { RootLayout } from "@/routes/root";
import { HomePage } from "@/routes/home";
import { SettingsPage } from "@/routes/settings";
import { DemoPage } from "@/routes/demo";
import { RepoPullsPage } from "@/routes/repo-pulls";
import { ReviewPage } from "@/routes/review";

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const demoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/demo",
  component: DemoPage,
});

const repoPullsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/repos/$owner/$repo",
  component: RepoPullsPage,
});

const reviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/repos/$owner/$repo/pulls/$number",
  component: ReviewPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  settingsRoute,
  demoRoute,
  repoPullsRoute,
  reviewRoute,
]);

// Desktop app loads over file://, so use in-memory history rather than the URL.
const history = createMemoryHistory({ initialEntries: ["/"] });

export const router = createRouter({ routeTree, history });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
