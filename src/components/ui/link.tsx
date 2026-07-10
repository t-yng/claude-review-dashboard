import { Link as RouterLink } from "@tanstack/react-router";
import type { AnchorHTMLAttributes } from "react";

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
};

/**
 * Thin wrapper over TanStack Router's Link that keeps the familiar `href` API
 * used throughout the app. The already-interpolated pathname is resolved
 * against the route tree at runtime; the cast sidesteps TanStack's compile-time
 * route-literal typing, which we intentionally don't rely on here.
 */
export function Link({ href, ...rest }: LinkProps) {
  return <RouterLink to={href as never} {...rest} />;
}
