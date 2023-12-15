import { protectedProcedure, router } from "../utils";
import { z } from "zod";

export const userRouter = router({
	getChapter: protectedProcedure.query(async ({ ctx }) => {
		const user = await ctx.prisma.user.findUnique({
			select: {
				chapter: true,
			},
			where: {
				id: ctx.user.id,
			},
		});
		return user?.chapter;
	}),

	update: protectedProcedure
		.input(
			z.object({
				timeZone: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return await ctx.prisma.user.update({
				where: {
					id: ctx.user.id,
				},
				data: input,
			});
		}),
});
