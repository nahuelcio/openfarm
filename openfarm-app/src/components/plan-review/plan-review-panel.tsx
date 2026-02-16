"use client";

import {
	AlertCircle,
	CheckCircle2,
	Download,
	Loader2,
	MessageSquare,
	XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface PlanStep {
	id: string;
	title: string;
	description: string;
	dependencies?: string[];
}

interface Plan {
	id: string;
	title: string;
	description: string;
	steps: PlanStep[];
	status: "pending" | "approved" | "rejected" | "in-review";
	createdAt: Date;
	agentId?: string;
}

interface Annotation {
	id: string;
	type: "comment" | "delete" | "insert" | "replace";
	content: string;
	author: string;
	createdAt: Date;
	stepId?: string;
}

interface PlanReviewPanelProps {
	plan: Plan;
	annotations: Annotation[];
	onApprove: () => void;
	onReject: (feedback: string) => void;
	onExport: () => void;
	className?: string;
}

export function PlanReviewPanel({
	plan,
	annotations,
	onApprove,
	onReject,
	onExport,
	className,
}: PlanReviewPanelProps) {
	const [feedback, setFeedback] = useState("");
	const [isApproving, setIsApproving] = useState(false);
	const [isRejecting, setIsRejecting] = useState(false);

	const handleApprove = async () => {
		setIsApproving(true);
		try {
			await onApprove();
		} finally {
			setIsApproving(false);
		}
	};

	const handleReject = async () => {
		if (!feedback.trim()) {
			return;
		}
		setIsRejecting(true);
		try {
			await onReject(feedback);
		} finally {
			setIsRejecting(false);
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "approved":
				return "bg-green-100 text-green-800";
			case "rejected":
				return "bg-red-100 text-red-800";
			case "in-review":
				return "bg-yellow-100 text-yellow-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const getAnnotationIcon = (type: string) => {
		switch (type) {
			case "comment":
				return <MessageSquare className="h-3 w-3" />;
			case "delete":
				return <XCircle className="h-3 w-3" />;
			case "insert":
				return <CheckCircle2 className="h-3 w-3" />;
			case "replace":
				return <AlertCircle className="h-3 w-3" />;
			default:
				return <MessageSquare className="h-3 w-3" />;
		}
	};

	const getAnnotationColor = (type: string) => {
		switch (type) {
			case "comment":
				return "border-blue-200 bg-blue-50";
			case "delete":
				return "border-red-200 bg-red-50";
			case "insert":
				return "border-green-200 bg-green-50";
			case "replace":
				return "border-yellow-200 bg-yellow-50";
			default:
				return "border-gray-200 bg-gray-50";
		}
	};

	return (
		<div className={cn("flex flex-col h-full", className)}>
			{/* Header */}
			<Card className="mb-4">
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<CardTitle className="text-lg">{plan.title}</CardTitle>
						<Badge className={getStatusColor(plan.status)}>{plan.status}</Badge>
					</div>
					<p className="text-sm text-muted-foreground">{plan.description}</p>
					{plan.agentId && (
						<p className="text-xs text-muted-foreground">
							Agente: {plan.agentId} •{" "}
							{new Date(plan.createdAt).toLocaleString()}
						</p>
					)}
				</CardHeader>
			</Card>

			{/* Main Content */}
			<div className="flex flex-1 gap-4 min-h-0 flex-col lg:flex-row">
				{/* Plan Steps */}
				<Card className="flex-1 min-w-0">
					<CardHeader>
						<CardTitle className="text-base">📋 Pasos del Plan</CardTitle>
					</CardHeader>
					<CardContent>
						<ScrollArea className="h-96 lg:h-[32rem]">
							<div className="space-y-3">
								{plan.steps.map((step, index) => (
									<div
										key={step.id}
										className="p-3 border rounded-lg bg-muted/30"
									>
										<div className="font-medium text-sm mb-2">
											{index + 1}. {step.title}
										</div>
										<div className="text-xs text-muted-foreground mb-2">
											{step.description}
										</div>
										{step.dependencies && step.dependencies.length > 0 && (
											<div className="text-xs text-muted-foreground">
												<span className="font-medium">Dependencias:</span>{" "}
												{step.dependencies.join(", ")}
											</div>
										)}
									</div>
								))}
							</div>
						</ScrollArea>
					</CardContent>
				</Card>

				{/* Annotations */}
				<Card className="w-full lg:w-80 lg:flex-shrink-0">
					<CardHeader>
						<CardTitle className="text-base">
							💬 Anotaciones ({annotations.length})
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ScrollArea className="h-64 lg:h-96">
							<div className="space-y-2">
								{annotations.length === 0 ? (
									<p className="text-sm text-muted-foreground text-center py-4">
										Sin anotaciones
									</p>
								) : (
									annotations.map((annotation) => (
										<div
											key={annotation.id}
											className={cn(
												"p-3 border rounded-lg",
												getAnnotationColor(annotation.type),
											)}
										>
											<div className="flex items-center gap-2 mb-2">
												{getAnnotationIcon(annotation.type)}
												<span className="text-xs font-medium uppercase">
													{annotation.type}
												</span>
											</div>
											<div className="text-sm mb-2">{annotation.content}</div>
											<div className="text-xs text-muted-foreground">
												{annotation.author} •{" "}
												{new Date(annotation.createdAt).toLocaleString()}
											</div>
										</div>
									))
								)}
							</div>
						</ScrollArea>
					</CardContent>
				</Card>
			</div>

			{/* Actions */}
			<Card className="mt-4">
				<CardContent className="pt-6">
					<div className="flex flex-col sm:flex-row gap-3">
						<Button
							onClick={handleApprove}
							disabled={isApproving || isRejecting}
							className="flex-1"
						>
							{isApproving ? (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							) : (
								<CheckCircle2 className="h-4 w-4 mr-2" />
							)}
							Aprobar Plan
						</Button>

						<Button
							variant="destructive"
							onClick={handleReject}
							disabled={isApproving || isRejecting}
							className="flex-1"
						>
							{isRejecting ? (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							) : (
								<XCircle className="h-4 w-4 mr-2" />
							)}
							Rechazar Plan
						</Button>

						<Button
							variant="outline"
							onClick={onExport}
							disabled={isApproving || isRejecting}
						>
							<Download className="h-4 w-4 mr-2" />
							Exportar
						</Button>
					</div>

					{plan.status === "pending" && (
						<div className="mt-3">
							<Textarea
								placeholder="Feedback para el rechazo (opcional)..."
								value={feedback}
								onChange={(e) => setFeedback(e.target.value)}
								className="min-h-[60px]"
							/>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
