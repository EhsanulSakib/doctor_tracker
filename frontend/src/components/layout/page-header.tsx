import type { ReactNode } from "react";

type PageHeaderProps = {
  /** The page's <h1>. Read by screen readers only: the topbar breadcrumb already shows where you are. */
  title: string;
  /** Primary actions, e.g. "New doctor" (right-aligned row above the content). */
  actions?: ReactNode;
};

/**
 * Every page still has exactly one <h1> (headings are how screen-reader users jump around), but it's
 * visually hidden: the user wanted the breadcrumb in the top bar to be the only visible title.
 * Renders nothing visible unless there are actions, so it takes no space and can't shift the layout.
 */
export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <>
      <h1 className="sr-only">{title}</h1>
      {actions && <div className="mb-4 flex flex-wrap items-center justify-end gap-2">{actions}</div>}
    </>
  );
}
