"use client";

import { Condition } from "@/lib/control/condition";
import { useSummaryStage } from "@/lib/hooks/use-summary-stage";
import { PageStatus } from "@/lib/page-status";
import { isLastPage } from "@/lib/pages";
import {
	PageData,
	getChunkElement,
	reportSentry,
	scrollToElement,
} from "@/lib/utils";
import { usePortal } from "@itell/core/hooks";
import {
	ErrorFeedback,
	ErrorType,
	SummaryResponse,
	SummaryResponseSchema,
} from "@itell/core/summary";
import { Warning, buttonVariants } from "@itell/ui/server";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

import { useSession, useSessionAction } from "@/lib/auth/context";
import { isProduction } from "@/lib/constants";
import { createSummary } from "@/lib/summary/actions";
import { incrementUserPage } from "@/lib/user/actions";
import { User } from "lucia";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useImmerReducer } from "use-immer";
import { Button, StatusButton } from "../client-components";
import { NextPageButton } from "../page/next-page-button";
import { PageLink } from "../page/page-link";
import { useConstructedResponse } from "../provider/page-provider";
import { SummaryInput, saveSummaryLocal } from "./summary-input";

type Props = {
	user: User;
	page: PageData;
	pageStatus: PageStatus;
};

type State = {
	prevInput: string;
	pending: boolean;
	error: ErrorType | null;
	finished: boolean;
};

type Action =
	| { type: "submit" }
	| { type: "fail"; payload: ErrorType }
	| { type: "finish"; payload: boolean }
	| { type: "set_prev_input"; payload: string };

const driverObj = driver();

export const SummaryFormReread = ({ user, page, pageStatus }: Props) => {
	const pageSlug = page.page_slug;
	const initialState: State = {
		prevInput: "",
		pending: false,
		error: null,
		finished: pageStatus.unlocked,
	};
	const [isTextbookFinished, setIsTextbookFinished] = useState(user.finished);
	const { chunks } = useConstructedResponse((state) => ({
		chunks: state.chunks,
	}));
	// skip first chunk, which is typically learning objectives
	const validChunks = chunks.slice(1);
	const randomChunkSlug =
		validChunks[Math.floor(Math.random() * validChunks.length)];

	const exitChunk = () => {
		const summaryEl = document.querySelector("#page-summary");

		driverObj.destroy();

		if (summaryEl) {
			scrollToElement(summaryEl as HTMLDivElement);
		}
	};

	const [state, dispatch] = useImmerReducer<State, Action>((draft, action) => {
		switch (action.type) {
			case "set_prev_input":
				draft.prevInput = action.payload;
				break;
			case "submit":
				draft.pending = true;
				draft.error = null;
				break;
			case "fail":
				draft.pending = false;
				draft.error = action.payload;
				break;
			case "finish":
				draft.pending = false;
				draft.finished = action.payload;
				break;
		}
	}, initialState);
	const { nodes: portalNodes, addNode } = usePortal();
	const { addStage, clearStages, finishStage, stages } = useSummaryStage();
	const { updateUser } = useSessionAction();

	const goToRandomChunk = () => {
		// in production, only highlight 25% of the time
		// if (isProduction) {
		// 	if (Math.random() > 0.25) {
		// 		return;
		// 	}
		// }
		const el = getChunkElement(randomChunkSlug);
		if (el) {
			scrollToElement(el);
			driverObj.highlight({
				element: el,
				popover: {
					description:
						'Please re-read the highlighted chunk. when you are finished, press the "I finished rereading" button.',
					side: "right",
					align: "start",
				},
			});
		}
	};

	useEffect(() => {
		driverObj.setConfig({
			animate: false,
			smoothScroll: false,
			onPopoverRender: (popover) => {
				addNode(
					<Button onClick={exitChunk} size="sm" className="mt-4">
						I finished rereading
					</Button>,
					popover.wrapper,
				);
			},
			onDestroyStarted: () => {
				return toast.warning("Please finish rereading before moving on");
			},
		});
	}, []);

	const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		clearStages();

		dispatch({ type: "submit" });
		addStage("Saving");

		const formData = new FormData(e.currentTarget);
		const input = String(formData.get("input")).replaceAll("\u0000", "");

		saveSummaryLocal(pageSlug, input);

		dispatch({ type: "set_prev_input", payload: input });

		let requestBody = "";
		let summaryResponse: SummaryResponse | null = null;

		try {
			requestBody = JSON.stringify({
				summary: input,
				page_slug: pageSlug,
			});
			console.log("requestBody", requestBody);
			const response = await fetch("/api/itell/score/summary", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: requestBody,
			});
			const json = await response.json();
			const parsed = SummaryResponseSchema.safeParse(json);
			if (!parsed.success) {
				throw parsed.error;
			}
			summaryResponse = parsed.data;
			await createSummary({
				text: input,
				userId: user.id,
				pageSlug,
				condition: Condition.RANDOM_REREAD,
				isPassed: summaryResponse.is_passed || false,
				containmentScore: summaryResponse.containment,
				similarityScore: summaryResponse.similarity,
				languageScore: summaryResponse.language,
				contentScore: summaryResponse.content,
			});
			const nextSlug = await incrementUserPage(user.id, pageSlug);
			finishStage("Saving");
			dispatch({
				type: "finish",
				payload: true,
			});

			if (isLastPage(pageSlug)) {
				updateUser({ finished: true });
				setIsTextbookFinished(true);
				toast.info("You have finished the entire textbook!");
				return;
			}

			updateUser({ ...user, pageSlug: nextSlug });
			if (!isProduction || !pageStatus.unlocked) {
				goToRandomChunk();
			}
		} catch (err) {
			finishStage("Analyzing");
			clearStages();
			dispatch({ type: "fail", payload: ErrorType.INTERNAL });

			console.log("summary error", err);
			reportSentry("score summary reread", {
				body: requestBody,
				response: summaryResponse,
				error: err,
			});
		}
	};

	const isSummaryReady = useConstructedResponse(
		(state) => state.isSummaryReady,
	);

	return (
		<section className="space-y-2">
			{portalNodes}
			{state.finished && page.nextPageSlug && (
				<div className="space-y-2 space-x-2">
					<p>
						You have finished this page. You can choose to refine your summary
						or move on to the next page.
					</p>
					<NextPageButton pageSlug={page.nextPageSlug} />
				</div>
			)}

			{isTextbookFinished && (
				<div className="space-y-2">
					<p>You have finished the entire textbook. Congratulations! 🎉</p>
				</div>
			)}

			<form className="space-y-4" onSubmit={onSubmit}>
				<SummaryInput
					disabled={state.pending || !isSummaryReady}
					pageSlug={pageSlug}
					pending={state.pending}
					stages={stages}
					userRole={user.role}
				/>
				{state.error && <Warning>{ErrorFeedback[state.error]}</Warning>}
				<div className="flex justify-end">
					<StatusButton disabled={!isSummaryReady} pending={state.pending}>
						{state.prevInput === "" ? "Submit" : "Resubmit"}
					</StatusButton>
				</div>
			</form>
		</section>
	);
};
