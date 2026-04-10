<script lang="ts">
	import { base } from "$app/paths";
	import { usePublicConfig } from "$lib/utils/PublicConfig.svelte";

	let { data } = $props();
	const publicConfig = usePublicConfig();

	let operator = $derived(data.user?.username || data.user?.email || "Operator");
	let modelCount = $derived(data.models?.length ?? 0);
	const lastSync = new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date());

	const tabs = ["Overview", "Agents", "Workflows", "Runs", "Logs", "Analytics", "Settings"];
	const metrics = [
		["Agents online", "24", "+3 this hour", "4 in approval", "cyan"],
		["Workflow success", "98.4%", "+1.1% QoQ", "1,284 runs", "emerald"],
		["Median latency", "1.8s", "-320ms baseline", "planner to first output", "amber"],
		["Projected spend", "$842", "12% under cap", "token + tool execution", "rose"],
	];
	const workflow = [
		["Intent intake", "Active", "Signal Agent", "Classifies mission objective and risk."],
		["Planner mesh", "Completed", "Planner / Architect", "Builds execution DAG and approval gates."],
		["Parallel execution", "Running", "Builder Squad", "Workers fan out across code and infra tasks."],
		["Verifier lane", "Waiting", "QA Sentinel", "Paused on human approval for rerun strategy."],
	];
	const chain = [
		["Task queued", "08:41", "done"],
		["Route selected", "08:42", "done"],
		["Agents spawned", "08:42", "done"],
		["Human approval", "08:44", "live"],
		["Rerun / merge", "Pending", "wait"],
	];
	const agents = [
		["Planner-01", "Workflow architect", "active", "82%", "1.4s", "84k"],
		["Coder-07", "Implementation worker", "active", "71%", "2.1s", "123k"],
		["Verifier-02", "Quality gate", "waiting", "34%", "0.8s", "39k"],
		["Observer-11", "Telemetry analyst", "idle", "12%", "0.3s", "18k"],
		["Synth-04", "Cross-agent summarizer", "completed", "9%", "0.5s", "12k"],
		["Recovery-03", "Fault handler", "failed", "65%", "3.7s", "51k"],
	];
	const feed = [
		["08:44:12", "approval", "Human checkpoint triggered", "Verifier-02 requests permission to rerun critical tests."],
		["08:43:18", "system", "Consensus reached", "Planner-01 and Synth-04 aligned on fallback path."],
		["08:42:36", "agent", "Worker fan-out scaled", "Builder cluster expanded from 4 to 7 agents."],
		["08:41:57", "cost", "Budget forecast updated", "Projected spend moved from $911 to $842 after route optimization."],
	];
	const oversight = [
		["Approve expanded regression rerun", "Verifier-02", "Covers 3 critical paths before merge", "high"],
		["Interrupt Recovery-03 and reassign", "Recovery lane", "Mitigates retry storm on failed connector", "medium"],
		["Inspect planner output diff", "Planner-01", "Validates fallback strategy before deploy", "idle"],
	];
	const runs = [
		["RUN-2039", "Verifier lane", "Waiting", "2.9s", "$41.18", "Approval gate open"],
		["RUN-2038", "Recovery lane", "Failed", "5.6s", "$12.04", "Connector heartbeat lost"],
		["RUN-2037", "Merge and summary", "Completed", "1.2s", "$8.66", "Output packaged for operator"],
		["RUN-2036", "Parallel execution", "Active", "1.7s", "$29.73", "7 agents in coordinated mode"],
	];
	const analytics = [
		["Latency", 68],
		["Success", 94],
		["Tokens", 76],
		["Cost", 61],
		["Coverage", 88],
	];
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
						<button type="button" class="btn-primary">Launch run</button>
						<button type="button" class="btn-secondary">Inspect outputs</button>
						<a href={`${base}/settings/application`} class="btn-ghost">System policy</a>
					</div>
				</div>
			</div>

			<div class="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
				<div class="soft-panel flex min-h-12 items-center justify-between rounded-[18px] px-4 text-sm text-slate-400 xl:min-w-[360px]">
					<span>Search agents, workflows, logs</span>
					<kbd class="rounded-lg border border-white/10 bg-slate-950/70 px-2 py-1 font-mono text-xs text-slate-200">Ctrl K</kbd>
				</div>
				<div class="flex flex-wrap gap-2">
					{#each tabs as tab, index}
						<button type="button" class={`tab ${index === 0 ? "tab-active" : ""}`}>{tab}</button>
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

		<section class="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_420px]">
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
						{#each oversight as [task, owner, impact, level]}
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
						{#each feed as [time, kind, title, description]}
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

		<section class="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
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
					{#each agents as [name, role, status, load, latency, tokensUsed]}
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

		<section class="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
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
							{#each runs as [run, stage, status, latency, cost, note]}
								<tr class="border-b border-white/5 last:border-b-0">
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
								<button type="button" class="btn-primary btn-small">Approve rerun</button>
								<button type="button" class="btn-secondary btn-small">Assign</button>
								<button type="button" class="btn-ghost btn-small">Reject</button>
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
