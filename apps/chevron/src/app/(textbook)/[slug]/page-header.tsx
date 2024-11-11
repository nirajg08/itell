"use client";

import { useEffect, useState } from "react";
import { cn } from "@itell/utils";
import { Page, pages } from "#content";
import { User } from "lucia";

import { PageStatus } from "@/lib/page-status";
import { NoteCount } from "./_components/note/note-count";
import { PageStatusInfo } from "./_components/page-status-info";

export function PageHeader({
  page,
  user,
  pageCount,
  pageStatus,
}: {
  page: Page;
  user: User | null;
  pageCount: number;
  pageStatus: PageStatus;
}) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const controlNavbar = () => {
      if (window.scrollY > lastScrollY) {
        // if scroll down hide the navbar
        setIsVisible(false);
      } else {
        // if scroll up show the navbar
        setIsVisible(true);
      }

      // remember current page location to use in the next move
      setLastScrollY(window.scrollY);
    };

    window.addEventListener("scroll", controlNavbar);

    // cleanup function
    return () => {
      window.removeEventListener("scroll", controlNavbar);
    };
  }, [lastScrollY]);

  return (
    <header
      id="page-header"
      className={cn(
        "sticky top-[calc(var(--nav-height))] z-40 col-span-full mb-4 flex items-center justify-between border-b-2 bg-background/95 px-4 py-3 backdrop-blur transition-all duration-300 ease-in-out supports-[backdrop-filter]:bg-background/60",
        isVisible ? "translate-y-0" : "-translate-y-full"
      )}
    >
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-medium tracking-tight">{page.title}</h2>
        <p>
          {page.order + 1}/{pageCount}
        </p>
      </div>
      <div className="flex items-center gap-8">
        <NoteCount />
        <PageStatusInfo status={pageStatus} />
      </div>
    </header>
  );
}
