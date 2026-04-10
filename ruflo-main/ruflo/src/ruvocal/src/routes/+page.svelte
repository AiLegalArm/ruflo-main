<script lang="ts">
	import { goto, invalidateAll } from "$app/navigation";
	import { base } from "$app/paths";
	import { useSettingsStore } from "$lib/stores/settings";
	import { pendingMessage } from "$lib/stores/pendingMessage";
	import { ERROR_MESSAGES, error } from "$lib/stores/errors";
	import type { Model } from "$lib/types/Model";
	import type { PlatformOverview, PlatformRun } from "$lib/server/platform";

	type ConversationLite = {
		id: string;
		title?: string;
		model?: string;
		updatedAt?: Date | string | number;
	};

	type SettingsLite = {
		activeModel?: string;
		customPrompts?: Record<string, string>;
	};

	let { data } = $props();
	const settingsStore = useSettingsStore();

	const now = Date.now();
	const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
		day: "2-digit",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	});
	const relativeFormatter = new Intl.RelativeTimeFormat("ru", { numeric: "auto" });

	const toTimestamp = (value: Date | string | number | undefined): number => {
		if (value instanceof Date) return value.getTime();
		if (typeof value === "number") return value;
		if (typeof value === "string") {
			const parsed = Date.parse(value);
			return Number.isNaN(parsed) ? now : parsed;
		}
		return now;
	};

	const formatRelative = (value: Date | string | number | undefined): string => {
		const diffMinutes = Math.round((toTimestamp(value) - now) / 60000);
		if (Math.abs(diffMinutes) < 60) return relativeFormatter.format(diffMinutes, "minute");
		const diffHours = Math.round(diffMinutes / 60);
		if (Math.abs(diffHours) < 24) return relativeFormatter.format(diffHours, "hour");
		return relativeFormatter.format(Math.round(diffHours / 24), "day");
	};

	const encodeModelPath = (modelId: string): string =>
		modelId
			.split("/")
			.map((segment) => encodeURIComponent(segment))
			.join("/");
	const modelLabel = (model: Model): string => model.displayName || model.name || model.id;
	const conversationTitle = (conv: ConversationLite): string =>
		conv.title?.trim() || `Диалог ${conv.id.slice(0, 6).toUpperCase()}`;
	const statusTone = (status: string) =>
		({
			ready: "pill-cyan",
			busy: "pill-amber",
			paused: "pill-amber",
			disabled: "pill-slate",
			active: "pill-cyan",
			draft: "pill-slate",
			archived: "pill-rose",
			queued: "pill-slate",
			running: "pill-cyan",
			waiting_approval: "pill-amber",
			failed: "pill-rose",
			completed: "pill-emerald",
			interrupted: "pill-rose",
			pending: "pill-amber",
			approved: "pill-emerald",
			rejected: "pill-rose",
		})[status] || "pill-slate";

	let models = $derived(((data.models ?? []) as Model[]).filter((model) => !model.unlisted));
	let conversations = $derived((data.conversations ?? []) as ConversationLite[]);
	let currentSettings = $derived((data.settings ?? {}) as SettingsLite);
	let platform = $derived((data.platform ?? {}) as PlatformOverview);
	let sortedConversations = $derived(
		[...conversations].sort((a, b) => toTimestamp(b.updatedAt) - toTimestamp(a.updatedAt))
	);
	let latestConversation = $derived(sortedConversations[0]);
	let operator = $derived(data.user?.username || data.user?.email || "Оператор");

	let selectedModelId = $state("");
	let chatPrompt = $state("");
	let workflowRequest = $state("");
	let selectedWorkflowId = $state("");
	let searchTerm = $state("");
	let creatingConversation = $state(false);
	let creatingRun = $state(false);
	let activeRunAction = $state("");

	$effect(() => {
		if (!selectedModelId) {
			selectedModelId = currentSettings.activeModel || models[0]?.id || "";
		}
		if (!selectedWorkflowId) {
			selectedWorkflowId = platform.workflows?.[0]?._id?.toString?.() || "";
		}
	});

	let selectedModel = $derived(models.find((model) => model.id === selectedModelId) ?? models[0]);
	let selectedWorkflow = $derived(
		platform.workflows?.find((workflow) => workflow._id?.toString?.() === selectedWorkflowId) ||
			platform.workflows?.[0]
	);
	let selectedRun = $derived(platform.runs?.[0] as PlatformRun | undefined);

	const matchesQuery = (parts: Array<string | undefined>, query: string): boolean => {
		const normalizedQuery = query.trim().toLowerCase();
		if (!normalizedQuery) return true;
		return parts.some((part) => part?.toLowerCase().includes(normalizedQuery));
	};

	let filteredAgents = $derived(
		(platform.agents ?? []).filter((agent) =>
			matchesQuery([agent.name, agent.role, agent.description, agent.modelId], searchTerm)
		)
	);
	let filteredWorkflows = $derived(
		(platform.workflows ?? []).filter((workflow) =>
			matchesQuery([workflow.name, workflow.description, workflow.tags.join(" ")], searchTerm)
		)
	);
	let filteredRuns = $derived(
		(platform.runs ?? []).filter((run) =>
			matchesQuery([run.title, run.workflowKey, run.status, run.request], searchTerm)
		)
	);

	const syncSelectedModel = async (modelId: string) => {
		selectedModelId = modelId;
		if ($settingsStore.activeModel !== modelId) {
			await settingsStore.instantSet({ activeModel: modelId });
		}
	};

	const createConversation = async () => {
		if (!selectedModelId) {
			await goto(`${base}/models`);
			return;
		}

		try {
			creatingConversation = true;
			const response = await fetch(`${base}/conversation`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					model: selectedModelId,
					preprompt: $settingsStore.customPrompts?.[selectedModelId],
				}),
			});

			if (!response.ok) {
				error.set("Не удалось создать диалог. Проверьте модели и повторите попытку.");
				console.error(await response.text());
				return;
			}

			const { conversationId } = await response.json();
			pendingMessage.set({ content: chatPrompt.trim(), files: [] });
			await goto(`${base}/conversation/${conversationId}`, { invalidateAll: true });
		} catch (err) {
			error.set(ERROR_MESSAGES.default);
			console.error(err);
		} finally {
			creatingConversation = false;
		}
	};

	const openChat = async () => {
		if (chatPrompt.trim()) {
			await createConversation();
			return;
		}
		if (!selectedModelId) {
			await goto(`${base}/models`);
			return;
		}
		await goto(`${base}/models/${encodeModelPath(selectedModelId)}`);
	};

	const openLatestConversation = async () => {
		if (latestConversation?.id) {
			await goto(`${base}/conversation/${latestConversation.id}`);
			return;
		}
		await openChat();
	};

	const createRun = async () => {
		if (!selectedWorkflowId) return;
		try {
			creatingRun = true;
			const response = await fetch(`${base}/api/v2/platform`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workflowId: selectedWorkflowId,
					request:
						workflowRequest.trim() || chatPrompt.trim() || selectedWorkflow?.name || "Новый запуск",
				}),
			});

			if (!response.ok) {
				error.set("Не удалось создать запуск workflow.");
				console.error(await response.text());
				return;
			}

			workflowRequest = "";
			await invalidateAll();
		} catch (err) {
			error.set(ERROR_MESSAGES.default);
			console.error(err);
		} finally {
			creatingRun = false;
		}
	};

	const runAction = async (runId: string, action: "advance" | "approve" | "interrupt" | "rerun") => {
		try {
			activeRunAction = `${runId}:${action}`;
			const response = await fetch(`${base}/api/v2/platform/runs/${runId}/action`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action }),
			});

			if (!response.ok) {
				error.set("Не удалось обновить состояние запуска.");
				console.error(await response.text());
				return;
			}

			await invalidateAll();
		} catch (err) {
			error.set(ERROR_MESSAGES.default);
			console.error(err);
		} finally {
			activeRunAction = "";
		}
	};
</script>

<svelte:head>
	<title>Ruflo - AI Agent Control Center</title>
	<meta
		name="description"
		content="Ruflo: центр управления агентами, workflow, запусками и рабочим AI-чатом."
	/>
</svelte:head>

<div class="ruflo-bg min-h-dvh overflow-y-auto px-3 py-3 text-slate-100 md:px-5 md:py-5">
	<div class="mx-auto flex max-w-[1680px] flex-col gap-6">
		<header class="glass glow rounded-[28px] p-5 md:p-7">
			<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
				<div class="flex flex-wrap items-center gap-3">
					<span class="pill pill-cyan">Ruflo Control Center</span>
					<span class="pill">{platform.summary?.agentsCount ?? 0} агентов</span>
					<span class="pill">{platform.summary?.workflowsCount ?? 0} workflow</span>
					<span class="pill">{platform.summary?.runsCount ?? 0} запусков</span>
				</div>
				<div class="pill">Оператор: {operator}</div>
			</div>

			<div class="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
				<div>
					<h1 class="max-w-[13ch] font-display text-4xl uppercase leading-[0.9] tracking-[0.16em] md:text-6xl">
						Операционная система для AI-агентов.
					</h1>
					<p class="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
						Платформа ведёт реестр агентов, шаблоны workflow, живые run’ы, approvals и ленту событий.
						Рабочий чат остаётся частью системы и запускается из того же control center.
					</p>
				</div>

				<div class="space-y-4">
					<div class="soft-panel rounded-[22px] p-4">
						<div class="text-xs uppercase tracking-[0.24em] text-slate-400">Активная модель</div>
						<div class="mt-2 font-display text-2xl uppercase tracking-[0.14em]">
							{selectedModel ? modelLabel(selectedModel) : "Не выбрана"}
						</div>
						<div class="mt-2 text-sm text-slate-400">Чат и orchestration работают вместе.</div>
					</div>
					<div class="flex flex-wrap gap-3">
						<button type="button" class="btn-primary" onclick={openChat} disabled={creatingConversation}>
							{creatingConversation ? "Запуск..." : "Открыть чат"}
						</button>
						<button type="button" class="btn-secondary" onclick={openLatestConversation}>
							Последний диалог
						</button>
						<a href={`${base}/models`} class="btn-ghost">Модели</a>
					</div>
				</div>
			</div>
		</header>

		<section class="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
			<article class="glass rounded-[24px] p-4 cyan">
				<div class="text-xs uppercase tracking-[0.22em] text-slate-400">Подключённые модели</div>
				<div class="mt-4 font-display text-4xl uppercase tracking-[0.14em]">{models.length}</div>
				<div class="mt-2 text-sm text-slate-400">Доступны для чата и назначения агентам.</div>
			</article>
			<article class="glass rounded-[24px] p-4 cyan">
				<div class="text-xs uppercase tracking-[0.22em] text-slate-400">Агенты</div>
				<div class="mt-4 font-display text-4xl uppercase tracking-[0.14em]">{platform.summary?.agentsCount ?? 0}</div>
				<div class="mt-2 text-sm text-slate-400">Роли, модели и операционные lane’ы.</div>
			</article>
			<article class="glass rounded-[24px] p-4 emerald">
				<div class="text-xs uppercase tracking-[0.22em] text-slate-400">Workflow</div>
				<div class="mt-4 font-display text-4xl uppercase tracking-[0.14em]">{platform.summary?.workflowsCount ?? 0}</div>
				<div class="mt-2 text-sm text-slate-400">Повторно используемые цепочки выполнения.</div>
			</article>
			<article class="glass rounded-[24px] p-4 amber">
				<div class="text-xs uppercase tracking-[0.22em] text-slate-400">Ожидают approve</div>
				<div class="mt-4 font-display text-4xl uppercase tracking-[0.14em]">{platform.summary?.waitingApprovalsCount ?? 0}</div>
				<div class="mt-2 text-sm text-slate-400">Human-in-the-loop контроль на backend-уровне.</div>
			</article>
			<article class="glass rounded-[24px] p-4 rose">
				<div class="text-xs uppercase tracking-[0.22em] text-slate-400">История диалогов</div>
				<div class="mt-4 font-display text-4xl uppercase tracking-[0.14em]">{conversations.length}</div>
				<div class="mt-2 text-sm text-slate-400">Чат интегрирован с платформой.</div>
			</article>
		</section>

		<section class="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
			<article class="glass rounded-[28px] p-5 md:p-6">
				<div class="mb-5 flex items-center justify-between gap-3">
					<div>
						<div class="text-xs uppercase tracking-[0.24em] text-slate-400">Рабочий чат</div>
						<h2 class="mt-2 font-display text-2xl uppercase tracking-[0.14em]">Быстрый запуск диалога</h2>
					</div>
					<button type="button" class="btn-secondary btn-small" onclick={openLatestConversation}>
						Открыть последний
					</button>
				</div>

				<div class="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
					<div class="soft-panel rounded-[24px] p-4">
						<div class="meta">Модель для чата</div>
						<div class="mt-4 space-y-3">
							{#each models.slice(0, 6) as model}
								<button
									type="button"
									class={`selector-card w-full rounded-[18px] p-3 text-left ${selectedModelId === model.id ? "selector-card-active" : ""}`}
									onclick={() => void syncSelectedModel(model.id)}
								>
									<div class="font-display text-lg uppercase tracking-[0.12em]">{modelLabel(model)}</div>
									<div class="mt-1 break-all text-xs uppercase tracking-[0.18em] text-slate-500">{model.id}</div>
								</button>
							{/each}
						</div>
					</div>

					<form
						class="soft-panel rounded-[24px] p-4"
						onsubmit={(event) => {
							event.preventDefault();
							void openChat();
						}}
					>
						<label class="meta" for="chat-prompt">Сообщение</label>
						<textarea
							id="chat-prompt"
							bind:value={chatPrompt}
							rows="8"
							placeholder="Опиши задачу, и Ruflo создаст новый живой диалог с выбранной моделью."
							class="mt-3 w-full resize-none rounded-[20px] border border-white/10 bg-slate-950/55 px-4 py-4 text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/35"
						></textarea>
						<div class="mt-4 flex flex-wrap gap-3">
							<button type="submit" class="btn-primary" disabled={creatingConversation}>
								{creatingConversation ? "Создаём диалог..." : "Запустить чат"}
							</button>
							<a href={`${base}/settings/application`} class="btn-ghost">Настройки</a>
						</div>
					</form>
				</div>
			</article>

			<article class="glass rounded-[28px] p-5 md:p-6">
				<div class="mb-5 flex items-center justify-between gap-3">
					<div>
						<div class="text-xs uppercase tracking-[0.24em] text-slate-400">Workflow orchestration</div>
						<h2 class="mt-2 font-display text-2xl uppercase tracking-[0.14em]">Запуск platform run</h2>
					</div>
					<span class={`pill ${statusTone(selectedWorkflow?.status || "draft")}`}>{selectedWorkflow?.status || "—"}</span>
				</div>

				<div class="soft-panel rounded-[24px] p-4">
					<label class="meta" for="workflow-select">Workflow</label>
					<select
						id="workflow-select"
						bind:value={selectedWorkflowId}
						class="mt-3 w-full rounded-[18px] border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-slate-100 outline-none"
					>
						{#each platform.workflows ?? [] as workflow}
							<option value={workflow._id.toString()}>{workflow.name}</option>
						{/each}
					</select>

					<textarea
						bind:value={workflowRequest}
						rows="7"
						placeholder="Опиши run: цель, контекст, результат, который нужно получить."
						class="mt-4 w-full resize-none rounded-[20px] border border-white/10 bg-slate-950/55 px-4 py-4 text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/35"
					></textarea>

					{#if selectedWorkflow}
						<div class="mt-4 rounded-[18px] border border-white/10 bg-slate-950/35 p-4">
							<div class="font-display text-lg uppercase tracking-[0.12em]">{selectedWorkflow.name}</div>
							<p class="mt-2 text-sm leading-6 text-slate-400">{selectedWorkflow.description}</p>
						</div>
					{/if}

					<div class="mt-4 flex flex-wrap gap-3">
						<button type="button" class="btn-primary" onclick={createRun} disabled={creatingRun || !selectedWorkflowId}>
							{creatingRun ? "Создаём run..." : "Создать запуск"}
						</button>
						<div class="pill">{platform.events?.length ?? 0} событий</div>
					</div>
				</div>
			</article>
		</section>
