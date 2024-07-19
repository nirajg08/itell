"use client";

import { cn } from "@itell/core/utils";
import { ArrowRightIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { dashboardConfig } from "./config";

export const DashboardSidebar = () => {
	const [_, startTransition] = useTransition();
	const pathname = usePathname();
	const [activeRoute, setActiveRoute] = useState(pathname);
	const router = useRouter();

	return (
		<nav className="grid items-start pt-4">
			{dashboardConfig.sidebarNav.map((item) => (
				<button
					type="button"
					disabled={item.disabled}
					onClick={() => {
						setActiveRoute(item.href);
						startTransition(() => {
							router.push(item.href);
						});
					}}
					key={item.title}
				>
					<span
						className={cn(
							"group flex items-center px-6 h-12 text-sm lg:text-base font-medium hover:bg-accent hover:text-accent-foreground",
							activeRoute === item.href ? "bg-accent" : "transparent",
							item.disabled && "cursor-not-allowed opacity-80",
						)}
					>
						{item.icon || <ArrowRightIcon className="mr-2 size-4" />}
						<span>{item.title}</span>
					</span>
				</button>
			))}
		</nav>
	);
};