import type { RequestHandler } from "@sveltejs/kit";
import { z } from "zod";
import { requireAuth } from "$lib/server/api/utils/requireAuth";
import { superjsonResponse } from "$lib/server/api/utils/superjsonResponse";
import { runPlatformAction } from "$lib/server/platform";

export const POST: RequestHandler = async ({ locals, params, request }) => {
	requireAuth(locals);

	const payload = z
		.object({
			action: z.enum(["advance", "approve", "interrupt", "rerun"]),
		})
		.parse(await request.json());

	const run = await runPlatformAction({
		locals,
		runId: params.id,
		action: payload.action,
	});

	return superjsonResponse({ run });
};
