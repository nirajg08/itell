"use server";

import { Prisma } from "@prisma/client";
import db from "./db";
import { revalidatePath } from "next/cache";
import { nextPage } from "./location";
import { getCurrentUser, getServerAuthSession } from "./auth";

export const deleteSummary = async (id: string) => {
	return await db.summary.delete({
		where: {
			id,
		},
	});
};

export const createSummary = async (input: Prisma.SummaryCreateInput) => {
	return await db.summary.create({
		data: input,
	});
};

export const updateSummary = async (
	id: string,
	data: Prisma.SummaryUpdateInput,
) => {
	return await db.summary.update({
		where: {
			id,
		},
		data,
	});
};

export const deleteNote = async (id: string) => {
	await db.note.delete({
		where: {
			id,
		},
	});
};

export const createConstructedResponse = async (
	input: Prisma.ConstructedResponseCreateInput,
) => {
	return await db.constructedResponse.create({
		data: input,
	});
};

export const createConstructedResponseFeedback = async (
	input: Prisma.ConstructedResponseFeedbackCreateInput,
) => {
	return await db.constructedResponseFeedback.create({
		data: input,
	});
};

export const updateUser = async (
	userId: string,
	data: Prisma.UserUpdateInput,
) => {
	return await db.user.update({
		where: {
			id: userId,
		},
		data,
	});
};

export const updateUserClassId = async ({
	userId,
	classId,
}: {
	userId: string;
	classId: string | null;
}) => {
	return await db.user.update({
		where: {
			id: userId,
		},
		data: {
			classId,
		},
	});
};

export const incrementUserPage = async (userId: string, pageSlug: string) => {
	const user = await db.user.findUnique({ where: { id: userId } });
	if (user) {
		const slug = nextPage(pageSlug);
		await db.user.update({
			where: {
				id: userId,
			},
			data: {
				pageSlug: slug,
			},
		});

		revalidatePath(".");
	}
};

export const getUserPageSummaryCount = async (
	userId: string,
	pageSlug: string,
) => {
	return await db.summary.count({
		where: {
			userId,
			pageSlug,
		},
	});
};

export const getTeacherWithClassId = async (classId: string | null) => {
	if (!classId) {
		return null;
	}
	const teacher = await db.teacher.findFirst({
		where: {
			classId,
		},
	});

	if (!teacher) {
		return null;
	}

	const user = await db.user.findFirst({
		where: {
			id: teacher.id,
		},
	});

	return user;
};

export const createEvent = async (input: Prisma.EventCreateInput) => {
	return await db.event.create({
		data: input,
	});
};

export const createFocusTime = async (input: Prisma.FocusTimeCreateInput) => {
	return await db.focusTime.create({
		data: input,
	});
};

export const createNote = async (data: Prisma.NoteCreateInput) => {
	await db.note.create({ data });
};

export const updateNote = async (id: string, data: Prisma.NoteUpdateInput) => {
	await db.note.update({ where: { id }, data });
};

export const createQuizAnswer = async ({
	pageSlug,
	data,
}: { pageSlug: string; data: Record<number, number[]> }) => {
	const user = await getCurrentUser();
	if (user) {
		await db.quizAnswer.create({
			data: {
				pageSlug,
				data,
				user: {
					connect: {
						id: user.id,
					},
				},
			},
		});
	}
};
