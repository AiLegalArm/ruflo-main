import type { RequestHandler } from "@sveltejs/kit";
import { z } from "zod";
import { requireAuth } from "$lib/server/api/utils/requireAuth";
import { superjsonResponse } from "$lib/server/api/utils/superjsonResponse";
import { createPlatformRun, getPlatformOverview } from "$lib/server/platform";
import { models } from "$lib/server/models";
import { collections } from "$lib/server/database";
import { authCondition } from "$lib/server/auth";

export const GET: RequestHandler = async ({ locals }) => {
	requireAuth(locals);

	const settings = await collections.settings.findOne(authCondition(locals));

	return superjsonResponse(
		await getPlatformOverview({
			locals,
			models,
			settings: settings ?? {},
		})
	);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	requireAuth(locals);

	const payload = z
		.object({
			workflowId: z.string(),
			request: z.string().default(""),
		})
		.parse(await request.json());

	const run = await createPlatformRun({
		locals,
		workflowId: payload.workflowId,
		request: payload.request,
	});

	return superjsonResponse({ run });
};
