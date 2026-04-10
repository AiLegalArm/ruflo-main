import { ObjectId } from "mongodb";
import { authCondition } from "$lib/server/auth";
import { collections } from "$lib/server/database";
import type { Model } from "$lib/types/Model";
import type { Settings } from "$lib/types/Settings";
import type {
	PlatformAgent,
	PlatformApproval,
	PlatformEvent,
	PlatformRun,
	PlatformRunStep,
	PlatformWorkflow,
	WorkflowStepDefinition,
} from "$lib/types/Platform";

type PlatformSummary = {
	agentsCount: number;
	workflowsCount: number;
	runsCount: number;
	waitingApprovalsCount: number;
	completedRunsCount: number;
	failedRunsCount: number;
};

type PlatformOverview = {
	summary: PlatformSummary;
	agents: PlatformAgent[];
	workflows: PlatformWorkflow[];
	runs: PlatformRun[];
	approvals: Array<PlatformApproval & { runId: string; runTitle: string; workflowName: string }>;
	events: Array<PlatformEvent & { runTitle?: string; workflowName?: string }>;
};

const now = () => new Date();

const createOwnership = (locals: App.Locals) => authCondition(locals);

export function buildDefaultAgents(
	models: Model[],
	settings: Partial<Settings>,
	ownership: ReturnType<typeof createOwnership>
): Omit<PlatformAgent, "_id">[] {
	const activeModel = settings.activeModel || models[0]?.id;
	const pickModel = (index: number) => models[index]?.id || activeModel;
	const createdAt = now();

	return [
		{
			...ownership,
			key: "orchestrator",
			name: "Оркестратор",
			role: "Координация и маршрутизация",
			description: "Управляет последовательностью шагов, handoff между агентами и общей структурой запуска.",
			status: "ready",
			modelId: pickModel(0),
			capabilities: ["routing", "planning", "handoff"],
			tools: ["workflow_control"],
			lane: "coordination",
			isTemplate: true,
			createdAt,
			updatedAt: createdAt,
		},
		{
			...ownership,
			key: "researcher",
			name: "Исследователь",
			role: "Сбор контекста и анализ",
			description: "Собирает факты, требования и риски перед выполнением задачи.",
			status: "ready",
			modelId: pickModel(1),
			capabilities: ["research", "analysis", "summarization"],
			tools: ["web_search", "knowledge_base"],
			lane: "analysis",
			isTemplate: true,
			createdAt,
			updatedAt: createdAt,
		},
		{
			...ownership,
			key: "builder",
			name: "Исполнитель",
			role: "Реализация и выпуск",
			description: "Выполняет основную работу: код, контент, подготовка артефактов и результат run.",
			status: "ready",
			modelId: pickModel(2),
			capabilities: ["execution", "tool_use", "artifact_generation"],
			tools: ["code", "files", "integrations"],
			lane: "execution",
			isTemplate: true,
			createdAt,
			updatedAt: createdAt,
		},
		{
			...ownership,
			key: "reviewer",
			name: "Ревьюер",
			role: "Контроль качества и human gate",
			description: "Проверяет результат, формирует approval gate и финальный отчёт по качеству.",
			status: "ready",
			modelId: pickModel(3),
			capabilities: ["review", "qa", "approval_support"],
			tools: ["tests", "diff", "policy_checks"],
			lane: "review",
			isTemplate: true,
			createdAt,
			updatedAt: createdAt,
		},
	];
}

export function buildDefaultWorkflows(
	ownership: ReturnType<typeof createOwnership>
): Omit<PlatformWorkflow, "_id">[] {
	const createdAt = now();
	const makeSteps = (items: WorkflowStepDefinition[]) => items;

	return [
		{
			...ownership,
			key: "product-delivery",
			name: "Разработка и поставка",
			description: "Полный цикл: анализ, реализация, ревью и выпуск результата.",
			status: "active",
			tags: ["product", "engineering", "delivery"],
			entryAgentKey: "orchestrator",
			isTemplate: true,
			createdAt,
			updatedAt: createdAt,
			steps: makeSteps([
				{
					id: "scope",
					title: "Уточнение задачи",
					description: "Оркестратор собирает формулировку, ограничения и желаемый результат.",
					agentKey: "orchestrator",
					kind: "plan",
				},
				{
					id: "research",
					title: "Сбор контекста",
					description: "Исследователь формирует факты, зависимости и риски.",
					agentKey: "researcher",
					kind: "research",
				},
				{
					id: "build",
					title: "Реализация",
					description: "Исполнитель создаёт результат и артефакты.",
					agentKey: "builder",
					kind: "execute",
				},
				{
					id: "review",
					title: "Контроль качества",
					description: "Ревьюер проверяет готовность и поднимает approval gate.",
					agentKey: "reviewer",
					kind: "review",
					approvalRequired: true,
				},
				{
					id: "report",
					title: "Финальный отчёт",
					description: "Оркестратор собирает итог, решения и следующий шаг.",
					agentKey: "orchestrator",
					kind: "report",
				},
			]),
		},
		{
			...ownership,
			key: "analysis-only",
			name: "Анализ и рекомендации",
			description: "Быстрый workflow без реализации: анализ, выводы, план действий.",
			status: "active",
			tags: ["analysis", "research"],
			entryAgentKey: "researcher",
			isTemplate: true,
			createdAt,
			updatedAt: createdAt,
			steps: makeSteps([
				{
					id: "research",
					title: "Исследование",
					description: "Сбор и структурирование контекста.",
					agentKey: "researcher",
					kind: "research",
				},
				{
					id: "review",
					title: "Проверка выводов",
					description: "Ревьюер согласует финальные рекомендации.",
					agentKey: "reviewer",
					kind: "review",
				},
				{
					id: "report",
					title: "Выдача результата",
					description: "Оркестратор публикует итоговый summary.",
					agentKey: "orchestrator",
					kind: "report",
				},
			]),
		},
	];
}

function cloneStepsForRun(steps: WorkflowStepDefinition[], request: string): PlatformRunStep[] {
	return steps.map((step, index) => ({
		id: step.id,
		title: step.title,
		description: step.description,
		agentKey: step.agentKey,
		kind: step.kind,
		status: index === 0 ? "running" : "pending",
		inputSummary: index === 0 ? request : undefined,
		approvalRequired: step.approvalRequired,
		startedAt: index === 0 ? now() : undefined,
	}));
}

export async function ensurePlatformSeed(
	locals: App.Locals,
	models: Model[],
	settings: Partial<Settings>
): Promise<void> {
	const ownership = createOwnership(locals);
	const agentsCount = await collections.platformAgents.countDocuments(ownership);
	if (agentsCount === 0) {
		for (const agent of buildDefaultAgents(models, settings, ownership)) {
			await collections.platformAgents.insertOne({ _id: new ObjectId(), ...agent });
		}
	}

	const workflowsCount = await collections.platformWorkflows.countDocuments(ownership);
	if (workflowsCount === 0) {
		for (const workflow of buildDefaultWorkflows(ownership)) {
			await collections.platformWorkflows.insertOne({ _id: new ObjectId(), ...workflow });
		}
	}
}

export async function createPlatformRun(params: {
	locals: App.Locals;
	workflowId: string;
	request: string;
}): Promise<PlatformRun> {
	const { locals, workflowId, request } = params;
	const ownership = createOwnership(locals);
	const workflow = await collections.platformWorkflows.findOne({
		_id: workflowId,
		...ownership,
	});

	if (!workflow) {
		throw new Error("Workflow not found");
	}

	const createdAt = now();
	const steps = cloneStepsForRun(workflow.steps, request);
	const run: PlatformRun = {
		_id: new ObjectId(),
		...ownership,
		workflowId: workflow._id,
		workflowKey: workflow.key,
		title: request.trim() || workflow.name,
		status: "running",
		request,
		currentStepId: steps[0]?.id,
		steps,
		approvals: [],
		lastEventAt: createdAt,
		startedAt: createdAt,
		createdAt,
		updatedAt: createdAt,
	};

	await collections.platformRuns.insertOne(run);
	await appendPlatformEvent(locals, {
		runId: run._id,
		workflowId: workflow._id,
		agentKey: workflow.entryAgentKey,
		level: "info",
		title: "Запуск создан",
		description: `Workflow "${workflow.name}" запущен с запросом: ${request || "без описания"}.`,
	});

	return run;
}

async function appendPlatformEvent(
	locals: App.Locals,
	event: Omit<PlatformEvent, "_id" | "createdAt" | "updatedAt" | "userId" | "sessionId">
): Promise<void> {
	const createdAt = now();
	await collections.platformEvents.insertOne({
		_id: new ObjectId(),
		...createOwnership(locals),
		...event,
		createdAt,
		updatedAt: createdAt,
	});
}

function advanceRunState(run: PlatformRun): {
	status: PlatformRun["status"];
	currentStepId?: string;
	steps: PlatformRunStep[];
	approvals: PlatformApproval[];
} {
	const steps = run.steps.map((step) => ({ ...step }));
	const approvals = run.approvals.map((approval) => ({ ...approval }));
	const currentIndex = steps.findIndex((step) => step.id === run.currentStepId);
	if (currentIndex === -1) {
		return { status: run.status, currentStepId: run.currentStepId, steps, approvals };
	}

	const current = steps[currentIndex];
	if (current.status === "running") {
		current.status = current.approvalRequired ? "waiting_approval" : "completed";
		current.completedAt = now();
	}

	if (current.approvalRequired && !approvals.some((item) => item.stepId === current.id && item.status === "pending")) {
		approvals.push({
			id: `${run._id.toString()}-${current.id}-approval`,
			stepId: current.id,
			title: `Подтвердить шаг "${current.title}"`,
			description: current.description,
			status: "pending",
			requestedAt: now(),
		});
		return { status: "waiting_approval", currentStepId: current.id, steps, approvals };
	}

	const nextStep = steps[currentIndex + 1];
	if (!nextStep) {
		return { status: "completed", currentStepId: current.id, steps, approvals };
	}

	nextStep.status = "running";
	nextStep.startedAt = now();
	return { status: "running", currentStepId: nextStep.id, steps, approvals };
}

export async function runPlatformAction(params: {
	locals: App.Locals;
	runId: string;
	action: "advance" | "approve" | "interrupt" | "rerun";
}): Promise<PlatformRun> {
	const { locals, runId, action } = params;
	const ownership = createOwnership(locals);
	const run = await collections.platformRuns.findOne({ _id: runId, ...ownership });

	if (!run) {
		throw new Error("Run not found");
	}

	const updatedAt = now();
	let nextRun: PlatformRun = { ...run, updatedAt, lastEventAt: updatedAt };

	if (action === "interrupt") {
		nextRun = {
			...nextRun,
			status: "interrupted",
			steps: nextRun.steps.map((step) =>
				step.status === "running" ? { ...step, status: "interrupted", completedAt: updatedAt } : step
			),
		};
		await appendPlatformEvent(locals, {
			runId: run._id,
			workflowId: run.workflowId,
			level: "warning",
			title: "Запуск прерван",
			description: `Run "${run.title}" остановлен оператором.`,
		});
	} else if (action === "rerun") {
		const firstStep = nextRun.steps[0];
		nextRun = {
			...nextRun,
			status: "running",
			completedAt: undefined,
			currentStepId: firstStep?.id,
			approvals: [],
			steps: nextRun.steps.map((step, index) => ({
				...step,
				status: index === 0 ? "running" : "pending",
				startedAt: index === 0 ? updatedAt : undefined,
				completedAt: undefined,
			})),
		};
		await appendPlatformEvent(locals, {
			runId: run._id,
			workflowId: run.workflowId,
			level: "info",
			title: "Повторный запуск",
			description: `Run "${run.title}" переведён в повторное выполнение.`,
		});
	} else if (action === "approve") {
		const pendingApproval = nextRun.approvals.find((item) => item.status === "pending");
		nextRun = {
			...nextRun,
			approvals: nextRun.approvals.map((item) =>
				item.id === pendingApproval?.id
					? { ...item, status: "approved", resolvedAt: updatedAt }
					: item
			),
		};
		const advanced = advanceRunState({
			...nextRun,
			steps: nextRun.steps.map((step) =>
				step.id === nextRun.currentStepId ? { ...step, status: "completed", completedAt: updatedAt } : step
			),
		});
		nextRun = { ...nextRun, ...advanced };
		await appendPlatformEvent(locals, {
			runId: run._id,
			workflowId: run.workflowId,
			level: "success",
			title: "Approval подтверждён",
			description: `Оператор подтвердил следующий шаг для run "${run.title}".`,
		});
	} else {
		const advanced = advanceRunState(nextRun);
		nextRun = { ...nextRun, ...advanced };
		await appendPlatformEvent(locals, {
			runId: run._id,
			workflowId: run.workflowId,
			level: nextRun.status === "completed" ? "success" : "info",
			title: nextRun.status === "completed" ? "Запуск завершён" : "Шаг обновлён",
			description:
				nextRun.status === "completed"
					? `Run "${run.title}" завершён.`
					: `Run "${run.title}" перешёл к следующему шагу.`,
		});
	}

	if (nextRun.status === "completed") {
		nextRun.completedAt = updatedAt;
	}

	await collections.platformRuns.updateOne({ _id: run._id, ...ownership }, { $set: nextRun });
	return (await collections.platformRuns.findOne({ _id: run._id, ...ownership })) as PlatformRun;
}

export async function getPlatformOverview(params: {
	locals: App.Locals;
	models: Model[];
	settings: Partial<Settings>;
}): Promise<PlatformOverview> {
	const { locals, models, settings } = params;
	await ensurePlatformSeed(locals, models, settings);

	const ownership = createOwnership(locals);
	const [agents, workflows, runs, events] = await Promise.all([
		collections.platformAgents.find(ownership).sort({ updatedAt: -1 }).toArray(),
		collections.platformWorkflows.find(ownership).sort({ updatedAt: -1 }).toArray(),
		collections.platformRuns.find(ownership).sort({ updatedAt: -1 }).toArray(),
		collections.platformEvents.find(ownership).sort({ updatedAt: -1 }).limit(20).toArray(),
	]);

	const workflowNameById = new Map(workflows.map((workflow) => [workflow._id.toString(), workflow.name]));
	const runNameById = new Map(runs.map((run) => [run._id.toString(), run.title]));

	const approvals = runs.flatMap((run) =>
		run.approvals
			.filter((approval) => approval.status === "pending")
			.map((approval) => ({
				...approval,
				runId: run._id.toString(),
				runTitle: run.title,
				workflowName: workflowNameById.get(run.workflowId.toString()) || run.workflowKey,
			}))
	);

	return {
		summary: {
			agentsCount: agents.length,
			workflowsCount: workflows.length,
			runsCount: runs.length,
			waitingApprovalsCount: approvals.length,
			completedRunsCount: runs.filter((run) => run.status === "completed").length,
			failedRunsCount: runs.filter((run) => run.status === "failed").length,
		},
		agents,
		workflows,
		runs,
		approvals,
		events: events.map((event) => ({
			...event,
			runTitle: event.runId ? runNameById.get(event.runId.toString()) : undefined,
			workflowName: event.workflowId
				? workflowNameById.get(event.workflowId.toString())
				: undefined,
		})),
	};
}

export type { PlatformOverview };
