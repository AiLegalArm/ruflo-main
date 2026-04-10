import type { ObjectId } from "mongodb";
import type { Timestamps } from "./Timestamps";
import type { User } from "./User";

export type PlatformOwnership = {
	userId?: User["_id"];
	sessionId?: string;
};

export type AgentStatus = "ready" | "busy" | "paused" | "disabled";
export type WorkflowStatus = "active" | "draft" | "archived";
export type RunStatus =
	| "queued"
	| "running"
	| "waiting_approval"
	| "failed"
	| "completed"
	| "interrupted";
export type RunStepStatus =
	| "pending"
	| "running"
	| "waiting_approval"
	| "failed"
	| "completed"
	| "interrupted";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type EventLevel = "info" | "success" | "warning" | "error";

export interface PlatformAgent extends Timestamps, PlatformOwnership {
	_id: ObjectId;
	key: string;
	name: string;
	role: string;
	description: string;
	status: AgentStatus;
	modelId?: string;
	capabilities: string[];
	tools: string[];
	lane: "coordination" | "analysis" | "execution" | "review" | "delivery";
	systemPrompt?: string;
	isTemplate?: boolean;
}

export interface WorkflowStepDefinition {
	id: string;
	title: string;
	description: string;
	agentKey: string;
	kind: "plan" | "research" | "execute" | "review" | "report";
	approvalRequired?: boolean;
}

export interface PlatformWorkflow extends Timestamps, PlatformOwnership {
	_id: ObjectId;
	key: string;
	name: string;
	description: string;
	status: WorkflowStatus;
	tags: string[];
	entryAgentKey: string;
	steps: WorkflowStepDefinition[];
	isTemplate?: boolean;
}

export interface PlatformRunStep {
	id: string;
	title: string;
	description: string;
	agentKey: string;
	kind: WorkflowStepDefinition["kind"];
	status: RunStepStatus;
	inputSummary?: string;
	outputSummary?: string;
	approvalRequired?: boolean;
	startedAt?: Date;
	completedAt?: Date;
}

export interface PlatformApproval {
	id: string;
	stepId: string;
	title: string;
	description: string;
	status: ApprovalStatus;
	requestedAt: Date;
	resolvedAt?: Date;
}

export interface PlatformRun extends Timestamps, PlatformOwnership {
	_id: ObjectId;
	workflowId: PlatformWorkflow["_id"];
	workflowKey: string;
	title: string;
	status: RunStatus;
	request: string;
	currentStepId?: string;
	startedAt?: Date;
	completedAt?: Date;
	lastEventAt: Date;
	steps: PlatformRunStep[];
	approvals: PlatformApproval[];
}

export interface PlatformEvent extends Timestamps, PlatformOwnership {
	_id: ObjectId;
	runId?: PlatformRun["_id"];
	workflowId?: PlatformWorkflow["_id"];
	agentKey?: string;
	level: EventLevel;
	title: string;
	description: string;
}
