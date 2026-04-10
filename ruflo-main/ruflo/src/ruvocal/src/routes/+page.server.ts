import type { PageServerLoad } from "./$types";
import { getPlatformOverview } from "$lib/server/platform";

export const load: PageServerLoad = async ({ parent, locals }) => {
	const data = await parent();

	return {
		platform: await getPlatformOverview({
			locals,
			models: data.models,
			settings: data.settings,
		}),
	};
};
