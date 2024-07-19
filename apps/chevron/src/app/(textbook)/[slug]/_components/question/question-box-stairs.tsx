"use client";

import { createQuestionAnswerAction } from "@/actions/question";
import { useQuestion } from "@/components/provider/page-provider";
import { useSession } from "@/components/provider/session-provider";
import { Spinner } from "@/components/spinner";
import { Confetti } from "@/components/ui/confetti";
import { isProduction } from "@/lib/constants";
import { Condition } from "@/lib/constants";
import { getQAScore } from "@/lib/question";
import { reportSentry } from "@/lib/utils";
import { LoginButton } from "@auth//auth-form";
import { cn } from "@itell/core/utils";
import {
	Button,
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
	StatusButton,
	TextArea,
} from "@itell/ui/client";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	Warning,
} from "@itell/ui/server";
import { AlertTriangle, KeyRoundIcon, PencilIcon } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useActionStatus } from "use-action-status";
import { ExplainButton } from "./explain-button";
import { FinishQuestionButton } from "./finish-question-button";
import { QuestionFeedback } from "./question-feedback";
import { AnswerStatusStairs, QuestionScore, borderColors } from "./types";

type Props = {
	question: string;
	answer: string;
	chunkSlug: string;
	pageSlug: string;
};

type State = {
	status: AnswerStatusStairs;
	error: string | null;
	show: boolean;
	input: string;
};

export const QuestionBoxStairs = ({
	question,
	answer,
	chunkSlug,
	pageSlug,
}: Props) => {
	const { user } = useSession();
	const ref = useRef<HTMLDivElement | null>();
	const { chunkSlugs, shouldBlur, finishChunk } = useQuestion((state) => ({
		chunkSlugs: state.chunkSlugs,
		shouldBlur: state.shouldBlur,
		finishChunk: state.finishChunk,
	}));
	const [state, setState] = useState<State>({
		status: AnswerStatusStairs.UNANSWERED,
		error: null,
		show: shouldBlur,
		input: "",
	});

	const {
		action: onSubmit,
		isPending,
		isError,
		error,
	} = useActionStatus(async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const input = String(formData.get("input")).trim();
		if (input.length === 0) {
			setState((state) => ({ ...state, error: "Answer cannot be empty" }));
			return;
		}

		if (input === state.input) {
			setState((state) => ({
				...state,
				error: "Please submit a different answer",
			}));
			return;
		}

		const response = await getQAScore({
			input,
			chunk_slug: chunkSlug,
			page_slug: pageSlug,
		});
		const score = response.score as QuestionScore;
		createQuestionAnswerAction({
			text: input,
			chunkSlug,
			pageSlug,
			score,
			condition: Condition.STAIRS,
		});

		// if answer is correct, mark chunk as finished
		// this will add the chunk to the list of finished chunks that gets excluded from stairs question
		if (score === 2) {
			finishChunk(chunkSlug, true);

			setState({
				status: AnswerStatusStairs.BOTH_CORRECT,
				error: null,
				input,
				show: true,
			});
			return;
		}

		if (score === 1) {
			setState({
				status: AnswerStatusStairs.SEMI_CORRECT,
				error: null,
				input,
				show: true,
			});
			return;
		}

		if (score === 0) {
			ref.current?.classList.add("shake");
			setState({
				status: AnswerStatusStairs.BOTH_INCORRECT,
				error: null,
				input,
				show: true,
			});
			return;
		}
	});

	const status = state.status;
	const isNextButtonDisplayed =
		shouldBlur && status !== AnswerStatusStairs.UNANSWERED;

	const borderColor = borderColors[state.status];

	useEffect(() => {
		setState((state) => ({
			...state,
			error: "Failed to evaluate answer, please try again later",
		}));
		reportSentry("evaluate constructed response", { error });
	}, [isError]);

	const isLastQuestion = chunkSlug === chunkSlugs.at(-1);

	if (!user) {
		return (
			<Warning>
				<p>You need to be logged in to view this question and move forward</p>
				<LoginButton />
			</Warning>
		);
	}

	if (!state.show) {
		return (
			<Button
				variant={"outline"}
				onClick={() => setState((state) => ({ ...state, show: true }))}
			>
				Reveal optional question
			</Button>
		);
	}

	return (
		<Card
			className={cn(
				"flex justify-center items-center flex-col py-4 px-6 space-y-2 animate-in fade-in zoom-10",
				`${borderColor}`,
			)}
		>
			<Confetti active={status === AnswerStatusStairs.BOTH_CORRECT} />

			<CardHeader className="flex flex-row justify-center items-baseline w-full p-2 gap-1">
				<CardDescription className="flex justify-center items-center font-light text-zinc-500 w-10/12 mr-4 text-xs">
					{" "}
					<AlertTriangle className="stroke-yellow-400 mr-4" /> iTELL AI is in
					alpha testing. It will try its best to help you but it can still make
					mistakes. Let us know how you feel about iTELL AI's performance using
					the feedback icons to the right (thumbs up or thumbs down).{" "}
				</CardDescription>
				<QuestionFeedback
					type="positive"
					pageSlug={pageSlug}
					chunkSlug={chunkSlug}
				/>
				<QuestionFeedback
					type="negative"
					pageSlug={pageSlug}
					chunkSlug={chunkSlug}
				/>
			</CardHeader>

			<CardContent className="flex flex-col justify-center items-center space-y-4 w-4/5 mx-auto">
				{status === AnswerStatusStairs.BOTH_INCORRECT && (
					<div className="text-sm">
						<p className="text-red-400">
							<b>iTELL AI says:</b> You likely got a part of the answer wrong.
							Please try again.
						</p>
						<p className=" underline">
							{isLastQuestion
								? 'If you believe iTELL AI has made an error, you can click on the "Unlock summary" button to skip this question and start writing a summary.'
								: 'If you believe iTELL AI has made an error, you can click on the "Skip this question" button to skip this question.'}
						</p>
					</div>
				)}

				{status === AnswerStatusStairs.SEMI_CORRECT && (
					<p className="text-yellow-600 text-xs">
						<b>iTELL AI says:</b> You may have missed something, but you were
						generally close. You can click on the "Continue reading" button
						below go to the next part or try again with a different response.{" "}
					</p>
				)}

				{status === AnswerStatusStairs.BOTH_CORRECT ? (
					<div className="flex items-center flex-col">
						<p className="text-xl2 text-emerald-600 text-center">
							Your answer is correct!
						</p>
						{shouldBlur && (
							<p className="text-sm">
								Click on the button below to continue reading. Please use the
								thumbs-up or thumbs-down icons on the top right side of this box
								if you have any feedback about this question that you would like
								to provide before you continue reading.
							</p>
						)}
					</div>
				) : (
					question && (
						<p>
							<span className="font-bold">Question </span>
							{!shouldBlur && <span className="font-bold">(Optional)</span>}:{" "}
							{question}
						</p>
					)
				)}

				<form onSubmit={onSubmit} className="w-full space-y-2">
					<TextArea
						name="input"
						rows={2}
						className="max-w-lg mx-auto rounded-md shadow-md p-4"
						onPaste={(e) => {
							if (isProduction) {
								e.preventDefault();
								toast.warning("Copy & Paste is not allowed for question");
							}
						}}
					/>
					<div className="flex flex-col sm:flex-row justify-center items-center gap-2">
						{status !== AnswerStatusStairs.UNANSWERED && (
							<HoverCard>
								<HoverCardTrigger asChild>
									<Button variant={"outline"} type="button">
										<KeyRoundIcon className="size-4 mr-2" />
										Reveal Answer
									</Button>
								</HoverCardTrigger>
								<HoverCardContent className="w-80">
									<p className="leading-relaxed">{answer}</p>
								</HoverCardContent>
							</HoverCard>
						)}

						{status === AnswerStatusStairs.BOTH_CORRECT &&
						isNextButtonDisplayed ? (
							// when answer is all correct and next button should be displayed
							<FinishQuestionButton
								chunkSlug={chunkSlug}
								pageSlug={pageSlug}
								isLastQuestion={isLastQuestion}
								condition={Condition.STAIRS}
							/>
						) : (
							// when answer is not all correct
							<div>
								{status !== AnswerStatusStairs.BOTH_CORRECT && (
									<StatusButton
										pending={isPending}
										type="submit"
										disabled={isPending}
										variant={"outline"}
										className="w-32"
									>
										{isPending ? (
											<Spinner className="size-4" />
										) : (
											<>
												<PencilIcon className="size-4 mr-2 shrink-0" />
												<span>
													{status !== AnswerStatusStairs.UNANSWERED
														? "Resubmit"
														: "Answer"}
												</span>
											</>
										)}
									</StatusButton>
								)}

								{status !== AnswerStatusStairs.UNANSWERED &&
									isNextButtonDisplayed && (
										<FinishQuestionButton
											chunkSlug={chunkSlug}
											pageSlug={pageSlug}
											isLastQuestion={isLastQuestion}
											condition={Condition.STAIRS}
										/>
									)}
							</div>
						)}
					</div>
					{state.error && (
						<p className="text-red-500 text-sm text-center">{state.error}</p>
					)}
					<div className="flex items-center justify-center mt-4">
						{(status === AnswerStatusStairs.SEMI_CORRECT ||
							status === AnswerStatusStairs.BOTH_INCORRECT) && (
							<ExplainButton
								chunkSlug={chunkSlug}
								pageSlug={pageSlug}
								input={state.input}
							/>
						)}
					</div>
				</form>
			</CardContent>
		</Card>
	);
};