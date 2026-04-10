<script lang="ts">
	import { goto } from "$app/navigation";
	import { base } from "$app/paths";
	import { usePublicConfig } from "$lib/utils/PublicConfig.svelte";

	let { data } = $props();
	const publicConfig = usePublicConfig();

	type ConversationLite = {
		id: string;
		title?: string;
		model?: string;
		updatedAt?: Date | string | number;
	};

	type ModelLite = {
		id: string;
		displayName?: string;
		name?: string;
	};

	const now = Date.now();
	const hourMs = 60 * 60 * 1000;
	const dayMs = 24 * hourMs;
	const dateFormatter = new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
	const timeFormatter = new Intl.DateTimeFormat("en", {
		hour: "2-digit",
		minute: "2-digit",
	});
	const rolePool = [
		"Workflow architect",
		"Implementation worker",
		"Quality gate",
		"Telemetry analyst",
		"Cross-agent summarizer",
		"Fault handler",
	];
	const statusPool = ["active", "active", "waiting", "idle", "completed", "failed"];

	const toTimestamp = (value: Date | string | number | undefined): number => {
		if (value instanceof Date) return value.getTime();
		if (typeof value === "number") return value;
		if (typeof value === "string") {
			const parsed = Date.parse(value);
			return Number.isNaN(parsed) ? now : parsed;
		}
		return now;
	};

	const modelLabel = (model: ModelLite): string => model.displayName || model.name || model.id;
	const titleOrFallback = (conv: ConversationLite): string =>
		conv.title?.trim() || `Run ${conv.id.slice(0, 6).toUpperCase()}`;
	const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
	const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

	let conversations = $derived((data.conversations ?? []) as ConversationLite[]);
	let models = $derived((data.models ?? []) as ModelLite[]);
	let operator = $derived(data.user?.username || data.user?.email || "Operator");
	let modelCount = $derived(models.length);
	let latestActivityTs = $derived(
		conversations.length
			? Math.max(...conversations.map((conv) => toTimestamp(conv.updatedAt)))
			: now
	);
	let lastSync = $derived(dateFormatter.format(new Date(latestActivityTs)));
	let activeRuns = $derived(
		conversations.filter((conv) => now - toTimestamp(conv.updatedAt) < hourMs).length
	);
	let waitingRuns = $derived(
		conversations.filter((conv) => {
			const age = now - toTimestamp(conv.updatedAt);
			return age >= hourMs && age < dayMs;
		}).length
	);
	let completedRuns = $derived(
		conversations.filter((conv) => now - toTimestamp(conv.updatedAt) >= dayMs).length
	);
	let failedHints = $derived(
		conversations.filter((conv) => /fail|error|panic|timeout|abort/i.test(conv.title || "")).length
	);
	let activeAgentEstimate = $derived(
		clamp(modelCount * 2 + Math.max(activeRuns, 1), 4, 48)
	);
	let successRate = $derived(
		clamp(98 - waitingRuns * 1.3 - failedHints * 3.2, 72, 99.8)
	);
	let projectedSpend = $derived(
		Math.round(
			conversations.reduce((sum, conv) => sum + (titleOrFallback(conv).length * 0.24), 0) +
				modelCount * 18
		)
	);
	let medianLatency = $derived(
		clamp(2.2 - activeRuns * 0.12 + failedHints * 0.28, 0.8, 5.9)
	);

	const tabs = ["Overview", "Agents", "Workflows", "Runs", "Logs", "Analytics", "Settings"];
	let activeTab = $state("Overview");
	let searchTerm = $state("");

	const tokenize = (value: string): string[] =>
		value
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter(Boolean);
	const matchesQuery = (parts: Array<string | number | undefined>, query: string): boolean => {
		const tokens = tokenize(query);
		if (!tokens.length) return true;
		const haystack = tokenize(parts.filter(Boolean).join(" "));
		return tokens.every((token) => haystack.some((part) => part.includes(token)));
	};

	const launchRoute = async () => {
		await goto(`${base}/?prompt=${encodeURIComponent("Coordinate a new multi-agent workflow run")}`);
	};

	const inspectPrimaryRun = async () => {
		if (sortedConversations[0]?.id) {
			await goto(`${base}/conversation/${sortedConversations[0].id}`);
			return;
		}
		await goto(`${base}/models`);
	};

	const openSystemPolicy = async () => {
		activeTab = "Settings";
		await goto(`${base}/settings/application`);
	};

	const openRun = async (runId: string) => {
		if (!runId) return;
		await goto(`${base}/conversation/${runId}`);
	};

	const setTab = (tab: string) => {
		activeTab = tab;
	};

	let metrics = $derived([
		[
			"Agents online",
			`${activeAgentEstimate}`,
			`${activeRuns > 0 ? `+${activeRuns}` : "Stable"} active now`,
			`${waitingRuns} waiting, ${failedHints} risk`,
			"cyan",
		],
		[
			"Workflow success",
			`${successRate.toFixed(1)}%`,
			`${completedRuns} completed in 24h`,
			`${conversations.length} total runs observed`,
			"emerald",
		],
		[
			"Median latency",
			`${medianLatency.toFixed(1)}s`,
			`${failedHints > 0 ? `+${failedHints} anomaly signal` : "Stable execution"}`,
			"Planner to first output",
			"amber",
		],
		[
			"Projected spend",
			`$${projectedSpend}`,
			`${Math.max(0, 100 - failedHints * 5)}% budget health`,
			"Token + tool execution",
			"rose",
		],
	]);

	let workflow = $derived([
		[
			"Intent intake",
			"Active",
			"Signal Agent",
			`Classifies objectives across ${conversations.length} queued and historical runs.`,
		],
		[
			"Planner mesh",
			completedRuns > 0 ? "Completed" : "Running",
			models[0] ? modelLabel(models[0]) : "Planner / Architect",
			"Builds execution DAG and routes tasks through approval checkpoints.",
		],
		[
			"Parallel execution",
			activeRuns > 0 ? "Running" : "Idle",
			`Worker cluster x${Math.max(activeRuns, 1)}`,
			"Fans tasks across code, infra and diagnostics lanes.",
		],
		[
			"Verifier lane",
			waitingRuns > 0 ? "Waiting" : "Completed",
			"QA Sentinel",
			waitingRuns > 0
				? `${waitingRuns} run(s) paused for human decision.`
				: "No active approval blockers at this moment.",
		],
	]);

	let chain = $derived([
		["Task queued", timeFormatter.format(new Date(latestActivityTs - 6 * 60 * 1000)), "done"],
		["Route selected", timeFormatter.format(new Date(latestActivityTs - 4 * 60 * 1000)), "done"],
		["Agents spawned", timeFormatter.format(new Date(latestActivityTs - 2 * 60 * 1000)), "done"],
		["Human approval", timeFormatter.format(new Date(latestActivityTs)), waitingRuns > 0 ? "live" : "done"],
		["Rerun / merge", waitingRuns > 0 ? "Pending" : "Ready", waitingRuns > 0 ? "wait" : "done"],
	]);

	let agents = $derived(
		(models.length ? models.slice(0, 6) : [{ id: "planner-01", displayName: "Planner-01" }]).map(
			(model, index) => {
				const status = statusPool[index % statusPool.length];
				const load = clamp(78 - index * 9 + activeRuns * 2, 9, 96);
				const latency = clamp(0.9 + index * 0.4 + failedHints * 0.2, 0.5, 6.5);
				const tokenUsage = Math.round(14 + titleOrFallback(conversations[index % Math.max(conversations.length, 1)] || { id: "0" }).length * 1.7 + index * 8);

				return [
					`${modelLabel(model).slice(0, 18)}-${String(index + 1).padStart(2, "0")}`,
					rolePool[index % rolePool.length],
					status,
					`${load}%`,
					`${latency.toFixed(1)}s`,
					`${tokenUsage}k`,
				];
			}
		)
	);

	let sortedConversations = $derived(
		[...conversations].sort((a, b) => toTimestamp(b.updatedAt) - toTimestamp(a.updatedAt))
	);

	let feed = $derived(
		(sortedConversations.length ? sortedConversations.slice(0, 4) : [{ id: "local", title: "No runs yet" }]).map((conv, index) => {
			const ageMs = now - toTimestamp(conv.updatedAt);
			const kind =
				index === 0 && waitingRuns > 0
					? "approval"
					: /fail|error|panic|timeout/i.test(conv.title || "")
						? "system"
						: ageMs < hourMs
							? "agent"
							: "cost";

			return [
				timeFormatter.format(new Date(toTimestamp(conv.updatedAt))),
				kind,
				index === 0 && waitingRuns > 0
					? "Human checkpoint triggered"
					: titleOrFallback(conv),
				`Model ${conv.model || "auto"} - updated ${Math.max(1, Math.round(ageMs / 60000))} minute(s) ago.`,
			];
		})
	);

	let oversight = $derived([
		[
			waitingRuns > 0 ? "Approve queued run handoff" : "Approve safety baseline",
			agents[2]?.[0] || "Verifier lane",
			waitingRuns > 0
				? `${waitingRuns} run(s) are waiting for operator decision before merge.`
				: "Keep manual checkpoint policy enforced for critical paths.",
			waitingRuns > 0 ? "high" : "medium",
		],
		[
			failedHints > 0 ? "Interrupt failing branch and reassign" : "Review fallback policy",
			agents[5]?.[0] || "Recovery lane",
			failedHints > 0
				? `${failedHints} failure signal(s) detected from run titles.`
				: "No hard failure signal, periodic review still recommended.",
			failedHints > 0 ? "medium" : "idle",
		],
		[
			"Inspect planner output diff",
			agents[0]?.[0] || "Planner",
			"Confirm orchestration graph changes before broad rollout.",
			"idle",
		],
	]);

	let runs = $derived(
		(sortedConversations.length ? sortedConversations : [{ id: "run-local", title: "No runs available", model: "n/a", updatedAt: now }])
			.slice(0, 6)
			.map((conv, index) => {
				const title = titleOrFallback(conv);
				const status =
					waitingRuns > 0 && index === 0
						? "Waiting"
						: /fail|error|panic|timeout/i.test(title)
							? "Failed"
							: index % 3 === 0
								? "Active"
								: "Completed";
				const stage =
					status === "Waiting"
						? "Verifier lane"
						: status === "Failed"
							? "Recovery lane"
							: status === "Active"
								? "Parallel execution"
								: "Merge and summary";
				const latency = (0.9 + (title.length % 9) * 0.4 + index * 0.2).toFixed(1);
				const cost = (4 + title.length * 0.18 + index * 1.6).toFixed(2);

				return [
					`RUN-${conv.id.slice(0, 6).toUpperCase()}`,
					stage,
					status,
					`${latency}s`,
					`$${cost}`,
					`Model ${conv.model || "auto"} - ${capitalize(status.toLowerCase())} state`,
				];
			})
	);

	let analytics = $derived([
		["Latency", clamp(Math.round(100 - medianLatency * 13), 32, 96)],
		["Success", Math.round(successRate)],
		[
			"Tokens",
			clamp(
				Math.round(
					Math.min(
						96,
						(conversations.reduce((sum, conv) => sum + titleOrFallback(conv).length, 0) /
							Math.max(conversations.length, 1)) *
							2
					)
				),
				28,
				96
			),
		],
		["Cost", clamp(Math.round(100 - failedHints * 9 - waitingRuns * 4), 24, 92)],
		["Coverage", clamp(70 + Math.round(completedRuns * 2.5), 38, 96)],
	]);

	let filteredAgents = $derived(
		agents.filter(([name, role, status]) => matchesQuery([name, role, status], searchTerm))
	);
	let filteredFeed = $derived(
		feed.filter(([time, kind, title, description]) =>
			matchesQuery([time, kind, title, description], searchTerm)
		)
	);
	let filteredRuns = $derived(
		runs.filter(([run, stage, status, latency, cost, note]) =>
			matchesQuery([run, stage, status, latency, cost, note], searchTerm)
		)
	);
	let filteredOversight = $derived(
		oversight.filter(([task, owner, impact, level]) =>
			matchesQuery([task, owner, impact, level], searchTerm)
		)
	);

	const tokens = [
		["Deep background", "#050816"],
		["Panel glass", "#0c1326"],
		["Signal cyan", "#67e8f9"],
		["Success emerald", "#34d399"],
		["Warning amber", "#fbbf24"],
		["Fault rose", "#fb7185"],
	];

	const badge = (value: string) => `badge-${value.toLowerCase()}`;
</script>

<svelte:head>
	<title>{publicConfig.PUBLIC_APP_NAME} Mission Control</title>
	<meta
		name="description"
		content="Ruflo mission control dashboard for orchestrating and observing multi-agent systems."
	/>
</svelte:head>

<div class="ruflo-bg min-h-dvh overflow-y-auto px-3 py-3 text-slate-100 md:px-5 md:py-5">
	<div class="mx-auto flex max-w-[1680px] flex-col gap-6">
		<header class="glass glow rounded-[28px] p-5 md:p-7">
			<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
				<div class="flex flex-wrap items-center gap-3">
					<span class="pill pill-cyan">Ruflo Mission Control</span>
					<span class="pill"><span class="live-dot"></span>System nominal</span>
				</div>
				<div class="pill">{modelCount} connected models - Last sync {lastSync}</div>
			</div>

			<div class="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
				<div>
					<h1 class="max-w-[12ch] font-display text-4xl uppercase leading-[0.9] tracking-[0.16em] md:text-6xl">
						Operational clarity for complex multi-agent work.
					</h1>
					<p class="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
						Coordinate autonomous agents, monitor execution, inspect decisions and keep
						human oversight close to the command layer. Ruflo behaves like a control tower,
						not a generic chat shell.
					</p>
				</div>

				<div class="space-y-4">
					<div class="soft-panel rounded-[22px] p-4">
						<div class="text-xs uppercase tracking-[0.24em] text-slate-400">Operator</div>
						<div class="mt-2 font-display text-2xl uppercase tracking-[0.14em]">{operator}</div>
						<div class="mt-2 text-sm text-slate-400">Command context - premium neutral theme</div>
					</div>
					<div class="flex flex-wrap gap-3">
						<button type="button" class="btn-primary" onclick={launchRoute}>Launch run</button>
						<button type="button" class="btn-secondary" onclick={inspectPrimaryRun}>Inspect outputs</button>
						<button type="button" class="btn-ghost" onclick={openSystemPolicy}>System policy</button>
					</div>
				</div>
			</div>

			<div class="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
				<div class="soft-panel flex min-h-12 items-center justify-between rounded-[18px] px-4 text-sm text-slate-400 xl:min-w-[360px]">
					<input
						type="search"
						bind:value={searchTerm}
						placeholder="Search agents, workflows, logs"
						aria-label="Search mission control data"
						class="w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-500"
					/>
					<kbd class="rounded-lg border border-white/10 bg-slate-950/70 px-2 py-1 font-mono text-xs text-slate-200">Ctrl K</kbd>
				</div>
				<div class="flex flex-wrap gap-2">
					{#each tabs as tab, index}
						<button type="button" class={`tab ${activeTab === tab || (!searchTerm && index === 0 && activeTab === "Overview") ? "tab-active" : ""}`} onclick={() => setTab(tab)}>{tab}</button>
					{/each}
				</div>
			</div>
		</header>

		{#if modelCount === 0}
			<div class="glass flex flex-col items-start justify-between gap-4 rounded-[24px] border-amber-300/20 p-4 md:flex-row md:items-center">
				<div>
					<div class="font-display text-xl uppercase tracking-[0.14em]">No model endpoints connected</div>
					<div class="mt-1 text-sm text-slate-400">Live orchestration needs configured providers, but the dashboard shell is ready.</div>
				</div>
				<a href={`${base}/models`} class="btn-secondary">Connect models</a>
			</div>
		{/if}

		<section class={`grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_420px] ${activeTab !== "Overview" && activeTab !== "Workflows" ? "hidden" : ""}`}>
			<div class="grid gap-6">
				<div class="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
					{#each metrics as [label, value, delta, footnote, tone]}
						<article class={`glass rounded-[24px] p-4 ${tone}`}>
							<div class="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.22em] text-slate-400">
								<span>{label}</span>
								<span class="text-[11px]">{delta}</span>
							</div>
							<div class="mt-4 font-display text-4xl uppercase tracking-[0.14em]">{value}</div>
							<div class="mt-2 text-sm text-slate-400">{footnote}</div>
						</article>
					{/each}
				</div>

				<article class="glass rounded-[28px] p-5 md:p-6">
					<div class="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<div>
							<div class="text-xs uppercase tracking-[0.24em] text-slate-400">Overview dashboard</div>
							<h2 class="mt-2 font-display text-2xl uppercase tracking-[0.14em]">Workflow orchestration view</h2>
						</div>
						<div class="pill pill-cyan">Live DAG</div>
					</div>

					<div class="canvas rounded-[26px] p-4 md:p-5">
						<div class="grid gap-4 lg:grid-cols-2">
							{#each workflow as [title, status, owner, description]}
								<div class="soft-panel rounded-[22px] p-4">
									<div class="mb-3 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.22em] text-slate-400">
										<span class={`pill ${badge(status)}`}>{status}</span>
										<span>{owner}</span>
									</div>
									<h3 class="font-display text-xl uppercase tracking-[0.12em]">{title}</h3>
									<p class="mt-3 text-sm leading-6 text-slate-400">{description}</p>
								</div>
							{/each}
						</div>

						<div class="mt-4 flex flex-col gap-4 rounded-[22px] border border-white/10 bg-slate-950/35 p-4 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<div class="font-display text-lg uppercase tracking-[0.12em]">Agent interaction map</div>
								<p class="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
									Planner-01 coordinates Verifier-02, Synth-04 and Builder Squad through a
									gated execution mesh with visible handoffs and approval nodes.
								</p>
							</div>
							<div class="flex items-center">
								{#each ["PL", "CD", "VR", "SY", "RC"] as unit, index}
									<span class="avatar" style={`margin-left:${index > 0 ? "-0.5rem" : "0"}`}>{unit}</span>
								{/each}
							</div>
						</div>
					</div>
				</article>

				<article class="glass rounded-[28px] p-5 md:p-6">
					<div class="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<div>
							<div class="text-xs uppercase tracking-[0.24em] text-slate-400">Run monitoring</div>
							<h2 class="mt-2 font-display text-2xl uppercase tracking-[0.14em]">Task pipeline / chain of execution</h2>
						</div>
						<div class="pill pill-amber">Operator checkpoint</div>
					</div>
					<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
						{#each chain as [label, time, state]}
							<div class="soft-panel rounded-[20px] p-4">
								<div class="mb-3 flex items-center gap-3">
									<span class={`dot dot-${state}`}></span>
									<span class="text-xs uppercase tracking-[0.22em] text-slate-400">{time}</span>
								</div>
								<div class="font-display text-lg uppercase tracking-[0.12em]">{label}</div>
							</div>
						{/each}
					</div>
				</article>
			</div>

			<div class="grid gap-6">
				<article class="glass rounded-[28px] p-5 md:p-6">
					<div class="mb-5 flex items-center justify-between gap-3">
						<div>
							<div class="text-xs uppercase tracking-[0.24em] text-slate-400">Human-in-the-loop</div>
							<h2 class="mt-2 font-display text-2xl uppercase tracking-[0.14em]">Oversight queue</h2>
						</div>
						<div class="pill pill-rose">3 pending</div>
					</div>
					<div class="space-y-3">
						{#each filteredOversight as [task, owner, impact, level]}
							<div class="soft-panel rounded-[22px] p-4">
								<div class="flex items-start justify-between gap-3">
									<div>
										<h3 class="font-display text-lg uppercase tracking-[0.12em]">{task}</h3>
										<p class="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">{owner}</p>
									</div>
									<span class={`pill ${badge(level)}`}>{level}</span>
								</div>
								<p class="mt-3 text-sm leading-6 text-slate-400">{impact}</p>
								<div class="mt-4 flex flex-wrap gap-2">
									<button type="button" class="btn-primary btn-small">Approve</button>
									<button type="button" class="btn-secondary btn-small">Interrupt</button>
									<button type="button" class="btn-ghost btn-small">Inspect</button>
								</div>
							</div>
						{/each}
					</div>
				</article>

				<article class="glass rounded-[28px] p-5 md:p-6">
					<div class="mb-5 flex items-center justify-between gap-3">
						<div>
							<div class="text-xs uppercase tracking-[0.24em] text-slate-400">Logs & diagnostics</div>
							<h2 class="mt-2 font-display text-2xl uppercase tracking-[0.14em]">Live activity feed</h2>
						</div>
						<div class="pill pill-cyan">Streaming</div>
					</div>
					<div class="space-y-3">
						{#each filteredFeed as [time, kind, title, description]}
							<div class="soft-panel grid gap-3 rounded-[22px] p-4 md:grid-cols-[80px_minmax(0,1fr)]">
								<div class="font-mono text-xs uppercase tracking-[0.22em] text-slate-400">{time}</div>
								<div>
									<div class="flex flex-wrap items-center justify-between gap-3">
										<h3 class="font-display text-lg uppercase tracking-[0.12em]">{title}</h3>
										<span class={`pill ${badge(kind)}`}>{kind}</span>
									</div>
									<p class="mt-2 text-sm leading-6 text-slate-400">{description}</p>
								</div>
							</div>
						{/each}
					</div>
				</article>
			</div>
		</section>

		<section class={`grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] ${activeTab !== "Overview" && activeTab !== "Agents" && activeTab !== "Analytics" ? "hidden" : ""}`}>
			<article class="glass rounded-[28px] p-5 md:p-6">
				<div class="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div>
						<div class="text-xs uppercase tracking-[0.24em] text-slate-400">Agents panel</div>
						<h2 class="mt-2 font-display text-2xl uppercase tracking-[0.14em]">Active roster and role coverage</h2>
					</div>
					<div class="flex flex-wrap gap-2">
						<span class="pill pill-cyan">All</span>
						<span class="pill">Search</span>
						<span class="pill">Failed</span>
					</div>
				</div>
				<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{#each filteredAgents as [name, role, status, load, latency, tokensUsed]}
						<div class="soft-panel rounded-[22px] p-4">
							<div class="flex items-start justify-between gap-3">
								<div>
									<h3 class="font-display text-lg uppercase tracking-[0.12em]">{name}</h3>
									<p class="mt-1 text-sm text-slate-400">{role}</p>
								</div>
								<span class={`pill ${badge(status)}`}>{status}</span>
							</div>
							<div class="mt-4 grid grid-cols-3 gap-3">
								<div><span class="meta">Load</span><strong>{load}</strong></div>
								<div><span class="meta">Latency</span><strong>{latency}</strong></div>
								<div><span class="meta">Tokens</span><strong>{tokensUsed}</strong></div>
							</div>
							<div class="mt-4 border-t border-white/10 pt-4 text-sm leading-6 text-slate-400">
								Role coverage, status and throughput stay readable at a glance.
							</div>
						</div>
					{/each}
				</div>
			</article>

			<article class="glass rounded-[28px] p-5 md:p-6">
				<div class="mb-5 flex items-center justify-between gap-3">
					<div>
						<div class="text-xs uppercase tracking-[0.24em] text-slate-400">Performance & cost analytics</div>
						<h2 class="mt-2 font-display text-2xl uppercase tracking-[0.14em]">System observability snapshot</h2>
					</div>
					<a href={`${base}/models`} class="btn-ghost btn-small">Resource policy</a>
				</div>

				<div class="grid gap-4 md:grid-cols-2">
					<div class="soft-panel rounded-[22px] p-4">
						<div class="meta">Token usage</div>
						<div class="mt-3 font-display text-4xl uppercase tracking-[0.14em]">2.14M</div>
						<p class="mt-2 text-sm leading-6 text-slate-400">Peak burst remains below throttling threshold.</p>
					</div>
					<div class="soft-panel rounded-[22px] p-4">
						<div class="meta">Success rate</div>
						<div class="mt-3 font-display text-4xl uppercase tracking-[0.14em]">94.7%</div>
						<p class="mt-2 text-sm leading-6 text-slate-400">Retries reduced after planner route optimization.</p>
					</div>
				</div>

				<div class="mt-5 grid grid-cols-5 gap-3">
					{#each analytics as [label, height]}
						<div class="text-center">
							<div class="bar-shell">
								<div class="bar-fill" style={`height:${height}%`}></div>
							</div>
							<div class="mt-3 text-xs uppercase tracking-[0.22em] text-slate-400">{label}</div>
							<div class="mt-1 font-display text-base uppercase tracking-[0.12em]">{height}%</div>
						</div>
					{/each}
				</div>
			</article>
		</section>

		<section class={`grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] ${activeTab !== "Overview" && activeTab !== "Runs" && activeTab !== "Logs" && activeTab !== "Settings" ? "hidden" : ""}`}>
			<article class="glass rounded-[28px] p-5 md:p-6">
				<div class="mb-5">
					<div class="text-xs uppercase tracking-[0.24em] text-slate-400">Runs</div>
					<h2 class="mt-2 font-display text-2xl uppercase tracking-[0.14em]">Diagnostics table</h2>
				</div>
				<div class="overflow-x-auto rounded-[22px] border border-white/10 bg-slate-950/35">
					<table class="min-w-full text-left text-sm">
						<thead class="border-b border-white/10 text-xs uppercase tracking-[0.22em] text-slate-400">
							<tr>
								{#each ["Run", "Stage", "Status", "Latency", "Cost", "Note"] as head}
									<th class="px-4 py-4 font-medium">{head}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each filteredRuns as [run, stage, status, latency, cost, note], index}
								<tr class="border-b border-white/5 last:border-b-0 cursor-pointer transition-colors hover:bg-white/5" onclick={() => openRun((sortedConversations[index]?.id) || "")}>
									<td class="px-4 py-4 font-display uppercase tracking-[0.1em]">{run}</td>
									<td class="px-4 py-4">{stage}</td>
									<td class="px-4 py-4"><span class={`pill ${badge(status)}`}>{status}</span></td>
									<td class="px-4 py-4">{latency}</td>
									<td class="px-4 py-4">{cost}</td>
									<td class="px-4 py-4 text-slate-400">{note}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</article>

			<div class="grid gap-6">
				<article class="glass rounded-[28px] p-5 md:p-6">
					<div class="mb-5">
						<div class="text-xs uppercase tracking-[0.24em] text-slate-400">Command layer</div>
						<h2 class="mt-2 font-display text-2xl uppercase tracking-[0.14em]">Approval modal preview</h2>
					</div>
					<div class="rounded-[24px] border border-dashed border-cyan-300/20 bg-slate-950/35 p-4">
						<div class="soft-panel rounded-[22px] p-4">
							<span class="pill pill-amber">Approval required</span>
							<h3 class="mt-4 font-display text-xl uppercase tracking-[0.12em]">Escalate regression rerun?</h3>
							<p class="mt-3 text-sm leading-6 text-slate-400">
								Verifier-02 wants to rerun the critical path suite with broader coverage before
								merge. Estimated delta: +6 minutes, +$4.12.
							</p>
							<div class="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
								<span>risk: low</span><span>confidence: 0.92</span><span>impact: release safety</span>
							</div>
							<div class="mt-4 flex flex-wrap gap-2">
								<button type="button" class="btn-primary btn-small" onclick={inspectPrimaryRun}>Approve rerun</button>
								<button type="button" class="btn-secondary btn-small" onclick={launchRoute}>Assign</button>
								<button type="button" class="btn-ghost btn-small" onclick={() => setTab("Logs")}>Reject</button>
							</div>
						</div>
					</div>
				</article>

				<article class="glass rounded-[28px] p-5 md:p-6">
					<div class="mb-5">
						<div class="text-xs uppercase tracking-[0.24em] text-slate-400">Design system</div>
						<h2 class="mt-2 font-display text-2xl uppercase tracking-[0.14em]">Visual language</h2>
					</div>
					<div class="space-y-3">
						{#each tokens as [label, hex]}
							<div class="soft-panel flex items-center justify-between gap-3 rounded-[20px] p-4">
								<div>
									<h3 class="font-display text-lg uppercase tracking-[0.12em]">{label}</h3>
									<p class="mt-1 text-sm text-slate-400">{hex}</p>
								</div>
								<div class="h-10 w-10 rounded-2xl border border-white/10" style={`background:${hex}`}></div>
							</div>
						{/each}
					</div>
					<div class="mt-4 space-y-3 text-sm leading-6 text-slate-400">
						<div class="soft-panel rounded-[20px] p-4"><strong class="text-slate-100">Typography:</strong> Rajdhani display, IBM Plex Sans body, JetBrains Mono diagnostics.</div>
						<div class="soft-panel rounded-[20px] p-4"><strong class="text-slate-100">Spacing:</strong> 4 / 8 / 12 / 16 / 24 / 32 with generous rhythm for scanning.</div>
						<div class="soft-panel rounded-[20px] p-4"><strong class="text-slate-100">Status language:</strong> cyan active, slate idle, amber waiting, rose failed, emerald completed.</div>
					</div>
				</article>
			</div>
		</section>
	</div>
</div>

<style>
	:global(.dark) .ruflo-bg, .ruflo-bg {
		background:
			radial-gradient(circle at top left, rgba(103, 232, 249, 0.14), transparent 24%),
			radial-gradient(circle at top right, rgba(96, 165, 250, 0.12), transparent 22%),
			linear-gradient(180deg, #09111f 0%, #050816 36%, #03050d 100%);
		font-family: "IBM Plex Sans", "Segoe UI Variable Text", "Segoe UI", sans-serif;
	}

	.font-display {
		font-family: "Rajdhani", "Segoe UI Variable Display", "Segoe UI", sans-serif;
	}

	.glass {
		border: 1px solid rgba(148, 163, 184, 0.14);
		background: linear-gradient(180deg, rgba(12, 19, 38, 0.78), rgba(7, 13, 28, 0.92));
		box-shadow: 0 24px 80px rgba(2, 8, 23, 0.52), inset 0 1px 0 rgba(255, 255, 255, 0.04);
		backdrop-filter: blur(18px);
	}

	.soft-panel {
		background: rgba(7, 13, 28, 0.58);
		border: 1px solid rgba(148, 163, 184, 0.1);
	}

	.glow { position: relative; overflow: hidden; }
	.glow::after {
		content: "";
		position: absolute;
		inset: auto -10% -45% 25%;
		height: 220px;
		background: radial-gradient(circle, rgba(103, 232, 249, 0.16), transparent 60%);
		pointer-events: none;
	}

	.canvas {
		background:
			linear-gradient(rgba(148, 163, 184, 0.05) 1px, transparent 1px),
			linear-gradient(90deg, rgba(148, 163, 184, 0.05) 1px, transparent 1px),
			linear-gradient(180deg, rgba(6, 10, 22, 0.62), rgba(6, 10, 22, 0.88));
		background-size: 34px 34px, 34px 34px, auto;
		border: 1px solid rgba(103, 232, 249, 0.12);
	}

	.pill, .tab, .btn-primary, .btn-secondary, .btn-ghost {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}

	.pill, .tab {
		border-radius: 999px;
		padding: 0.55rem 0.8rem;
		border: 1px solid rgba(148, 163, 184, 0.16);
		background: rgba(15, 23, 42, 0.72);
		font-size: 0.72rem;
		font-weight: 600;
		color: #dbe7f4;
	}

	.pill-cyan, .badge-active, .badge-running, .badge-agent, .tab-active { border-color: rgba(103, 232, 249, 0.26); background: rgba(8, 145, 178, 0.16); color: #67e8f9; }
	.pill-amber, .badge-waiting, .badge-approval, .badge-medium { border-color: rgba(251, 191, 36, 0.22); background: rgba(180, 83, 9, 0.14); color: #fbbf24; }
	.pill-rose, .badge-failed, .badge-high { border-color: rgba(251, 113, 133, 0.22); background: rgba(190, 24, 93, 0.14); color: #fb7185; }
	.badge-completed, .badge-cost { border-color: rgba(52, 211, 153, 0.22); background: rgba(5, 150, 105, 0.14); color: #34d399; }
	.badge-idle, .badge-system { border-color: rgba(148, 163, 184, 0.16); background: rgba(51, 65, 85, 0.28); color: #94a3b8; }

	.live-dot, .dot { border-radius: 999px; }
	.live-dot { height: 0.5rem; width: 0.5rem; background: #34d399; box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.48); animation: pulse 2s infinite; }
	.dot { height: 0.8rem; width: 0.8rem; display: inline-block; }
	.dot-done { background: #34d399; box-shadow: 0 0 18px rgba(52, 211, 153, 0.35); }
	.dot-live { background: #67e8f9; box-shadow: 0 0 18px rgba(103, 232, 249, 0.45); }
	.dot-wait { background: #fbbf24; box-shadow: 0 0 18px rgba(251, 191, 36, 0.28); }

	.btn-primary, .btn-secondary, .btn-ghost {
		border-radius: 16px;
		padding: 0.9rem 1rem;
		font-family: "Rajdhani", "Segoe UI Variable Display", "Segoe UI", sans-serif;
		font-size: 0.85rem;
		font-weight: 700;
		text-decoration: none;
		transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
	}

	.btn-primary:hover, .btn-secondary:hover, .btn-ghost:hover { transform: translateY(-1px); }
	.btn-primary { border: 1px solid rgba(103, 232, 249, 0.35); background: linear-gradient(135deg, rgba(8, 145, 178, 0.34), rgba(37, 99, 235, 0.28)); color: #effbff; }
	.btn-secondary { border: 1px solid rgba(148, 163, 184, 0.16); background: rgba(15, 23, 42, 0.72); color: #dbe7f4; }
	.btn-ghost { color: #94a3b8; background: transparent; border: 1px solid transparent; }
	.btn-small { padding: 0.72rem 0.82rem; font-size: 0.76rem; }

	.avatar {
		display: grid;
		place-items: center;
		height: 2.55rem;
		width: 2.55rem;
		border-radius: 999px;
		border: 1px solid rgba(103, 232, 249, 0.24);
		background: linear-gradient(180deg, rgba(8, 145, 178, 0.28), rgba(37, 99, 235, 0.18));
		font-family: "Rajdhani", "Segoe UI Variable Display", "Segoe UI", sans-serif;
		font-weight: 700;
		letter-spacing: 0.06em;
	}

	.meta {
		display: block;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: #94a3b8;
	}

	strong {
		display: block;
		margin-top: 0.35rem;
		font-family: "Rajdhani", "Segoe UI Variable Display", "Segoe UI", sans-serif;
		font-size: 1rem;
		letter-spacing: 0.08em;
		color: #e2e8f0;
	}

	.bar-shell {
		height: 150px;
		border-radius: 18px;
		padding: 0.35rem;
		border: 1px solid rgba(148, 163, 184, 0.1);
		background: rgba(7, 13, 28, 0.58);
		display: flex;
		align-items: end;
	}

	.bar-fill {
		width: 100%;
		border-radius: 14px;
		background: linear-gradient(180deg, rgba(103, 232, 249, 0.95), rgba(59, 130, 246, 0.45));
	}

	.cyan { box-shadow: inset 0 0 0 1px rgba(103, 232, 249, 0.1); }
	.emerald { box-shadow: inset 0 0 0 1px rgba(52, 211, 153, 0.1); }
	.amber { box-shadow: inset 0 0 0 1px rgba(251, 191, 36, 0.1); }
	.rose { box-shadow: inset 0 0 0 1px rgba(251, 113, 133, 0.1); }

	@keyframes pulse {
		0% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.48); }
		70% { box-shadow: 0 0 0 12px rgba(52, 211, 153, 0); }
		100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
	}
</style>
