"use client";
import { useSessionAction } from "@/lib/auth/context";
import { PageStatus } from "@/lib/page-status";
import { isLastPage } from "@/lib/pages";
import { incrementUserPage } from "@/lib/user/actions";
import { PageData, reportSentry } from "@/lib/utils";
import { ErrorFeedback, ErrorType } from "@itell/core/summary";
import { Warning } from "@itell/ui/server";
import { ArrowRightIcon, CheckSquare2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useActionStatus } from "use-action-status";
import { StatusButton } from "../client-components";
import { useConstructedResponse } from "../provider/page-provider";

type Props = {
	userId: string;
	pageStatus: PageStatus;
	page: PageData;
};

export const SummaryFormSimple = React.memo(
	({ userId, pageStatus, page }: Props) => {
		const { currentChunk, chunks } = useConstructedResponse((state) => ({
			currentChunk: state.currentChunk,
			chunks: state.chunks,
		}));
		const isReady = pageStatus.unlocked || currentChunk === chunks.at(-1);
		const router = useRouter();
		const { updateUser } = useSessionAction();
		const [finished, setFinished] = useState(pageStatus.unlocked);

		const { action, isError, isPending, error, isDelayed } = useActionStatus(
			async (e: FormEvent) => {
				e.preventDefault();
				if (finished) {
					if (page.nextPageSlug) {
						router.push(page.nextPageSlug);
						return;
					}
				}

				const nextSlug = await incrementUserPage(userId, page.page_slug);
				if (!isLastPage(page.page_slug)) {
					updateUser({ pageSlug: nextSlug });
				} else {
					updateUser({ finished: true });
					toast.info("You have finished the entire textbook!");
				}

				setFinished(true);
			},
			{ delayTimeout: 3000 },
		);

		useEffect(() => {
			if (isError) {
				console.log("summary simple", error);
				reportSentry("summary simple", {
					pageSlug: page.page_slug,
					error,
				});
			}
		}, [isError]);

		if (!isReady) {
			return (
				<section className="max-w-2xl mx-auto">
					<p>Finish the entire page to move on.</p>
				</section>
			);
		}

		return (
			<section className="max-w-2xl mx-auto space-y-4">
				<p className="font-light text-lg mb-4">
					{finished
						? "You have completed this page, but you are still welcome to read the reference summary below to enhance understanding."
						: "Below is a reference summary for this page. Please read it carefully to better understand the information presented."}
				</p>
				<p>{page.referenceSummary}</p>

				<form className="flex justify-end gap-2" onSubmit={action}>
					<StatusButton
						pending={isPending}
						disabled={finished && !page.nextPageSlug}
						className="w-44"
					>
						{!finished ? (
							<span className="inline-flex gap-1 items-center">
								<CheckSquare2Icon className="size-4" /> Mark as completed
							</span>
						) : page.nextPageSlug ? (
							<span className="inline-flex gap-1 items-center">
								<ArrowRightIcon className="size-4" /> Go to next page
							</span>
						) : (
							<span>Textbook finished</span>
						)}
					</StatusButton>
				</form>
				{isError && <Warning>{ErrorFeedback[ErrorType.INTERNAL]}</Warning>}
				{isDelayed && (
					<p className="text-sm">
						The request is taking longer than usual, if this keeps loading
						without a response, please try refreshing the page. If the problem
						persists, please report to lear.lab.vu@gmail.com.
					</p>
				)}
			</section>
		);
	},
);
