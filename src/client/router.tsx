import { type AnchorHTMLAttributes, type MouseEvent, useSyncExternalStore } from "react";

/** 画面が 2 つだけなので、History API を直接使う小さなルーター */

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

export function navigate(path: string) {
  if (path === window.location.pathname) return;
  window.history.pushState(null, "", path);
  window.scrollTo({ top: 0 });
  for (const listener of listeners) listener();
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}

export type Route = { name: "list" } | { name: "play"; id: string } | { name: "notFound" };

export function matchRoute(pathname: string): Route {
  if (pathname === "/") return { name: "list" };
  const play = /^\/puzzles\/([a-z0-9-]+)\/?$/.exec(pathname);
  if (play?.[1]) return { name: "play", id: play[1] };
  return { name: "notFound" };
}

export function puzzlePath(id: string) {
  return `/puzzles/${id}`;
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export function Link({ href, onClick, ...props }: LinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (event.defaultPrevented || event.button !== 0 || modified) return;
    event.preventDefault();
    navigate(href);
  };
  return <a href={href} onClick={handleClick} {...props} />;
}
