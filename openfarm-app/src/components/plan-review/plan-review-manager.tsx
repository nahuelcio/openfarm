"use client";

import {
	CheckCircle2,
	Eye,
	FileText,
	Loader2,
	Plus,
	Trash2,
	XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanReviewPanel } from "./plan-review-panel";

// Tipos básicos locales para la UI de plan review.
interface Plan {
	id: string;
	title: string;
	description: string;
	steps: Array<{
		id: string;
		title: string;
		description: string;
		dependencies?: string[];
	}>;
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

interface PlanReviewManagerProps {
	className?: string;
}

export function PlanReviewManager({ className }: PlanReviewManagerProps) {
	const [plans, setPlans] = useState<Plan[]>([]);
	const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
	const [annotations, setAnnotations] = useState<Annotation[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

    // Simular carga de planes desde el backend.
	useEffect(() => {
		loadPlans();
	}, []);

	const loadPlans = async () => {
		setLoading(true);
		setError(null);

		try {
			// Simulación - en producción usaríamos PlanManager
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Iniciar con planes vacíos en lugar de datos mock
			// Los usuarios pueden crear planes manualmente o los agentes pueden generarlos
			const mockPlans: Plan[] = [];

			setPlans(mockPlans);
		} catch (err) {
			setError("Error cargando planes");
		} finally {
			setLoading(false);
		}
	};

	const loadAnnotations = async (planId: string) => {
		try {
			// Simulación - en producción usaríamos AnnotationManager
			await new Promise((resolve) => setTimeout(resolve, 500));

			const mockAnnotations: Annotation[] = [
				{
					id: "ann-1",
					type: "comment",
					content: "Considerar agregar validación de email único",
					author: "reviewer-1",
					createdAt: new Date(),
					stepId: "1-1",
				},
				{
					id: "ann-2",
					type: "insert",
					content: "Agregar endpoint para forgot password",
					author: "reviewer-2",
					createdAt: new Date(),
					stepId: "1-2",
				},
			];

			setAnnotations(mockAnnotations);
		} catch (err) {
			console.error("Error cargando anotaciones:", err);
		}
	};

	const handlePlanSelect = (plan: Plan) => {
		setSelectedPlan(plan);
		loadAnnotations(plan.id);
	};

	const handleDeletePlan = async (planId: string) => {
		try {
			// Simulación - en producción usaríamos PlanManager
			await new Promise((resolve) => setTimeout(resolve, 500));

			setPlans((prev) => prev.filter((p) => p.id !== planId));

			if (selectedPlan?.id === planId) {
				setSelectedPlan(null);
				setAnnotations([]);
			}

			console.log("🗑️ Plan eliminado:", planId);
		} catch (err) {
			setError("Error eliminando plan");
		}
	};

	const handleCreatePlan = () => {
		// Placeholder para futura implementación
		console.log("📝 Crear nuevo plan - funcionalidad por implementar");
	};

	const handleApprove = async () => {
		if (!selectedPlan) return;

		try {
			// Simulación - en producción usaríamos PlanReviewWorkflow
			await new Promise((resolve) => setTimeout(resolve, 1000));

			setPlans((prev) =>
				prev.map((p) =>
					p.id === selectedPlan.id ? { ...p, status: "approved" as const } : p,
				),
			);

			setSelectedPlan((prev) =>
				prev ? { ...prev, status: "approved" } : null,
			);

			// En producción esto continuaría con la ejecución del agente
			console.log("✅ Plan aprobado - El agente puede continuar");
		} catch (err) {
			setError("Error aprobando plan");
		}
	};

	const handleReject = async (feedback: string) => {
		if (!selectedPlan) return;

		try {
			// Simulación - en producción usaríamos PlanReviewWorkflow
			await new Promise((resolve) => setTimeout(resolve, 1000));

			setPlans((prev) =>
				prev.map((p) =>
					p.id === selectedPlan.id ? { ...p, status: "rejected" as const } : p,
				),
			);

			setSelectedPlan((prev) =>
				prev ? { ...prev, status: "rejected" } : null,
			);

			// En producción esto enviaría feedback al agente
			console.log("❌ Plan rechazado - Feedback:", feedback);
		} catch (err) {
			setError("Error rechazando plan");
		}
	};

	const handleExport = () => {
		if (!selectedPlan) return;

		const data = {
			plan: selectedPlan,
			annotations,
			exportedAt: new Date().toISOString(),
		};

		const blob = new Blob([JSON.stringify(data, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `plan-${selectedPlan.id}.json`;
		a.click();
		URL.revokeObjectURL(url);
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

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "approved":
				return <CheckCircle2 className="h-4 w-4" />;
			case "rejected":
				return <XCircle className="h-4 w-4" />;
			default:
				return <FileText className="h-4 w-4" />;
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-96">
				<Loader2 className="h-8 w-8 animate-spin" />
				<span className="ml-2">Cargando planes...</span>
			</div>
		);
	}

	if (error) {
		return (
			<Alert variant="destructive">
				<AlertDescription>{error}</AlertDescription>
			</Alert>
		);
	}

	if (selectedPlan) {
		return (
			<div className={className}>
				<div className="mb-4">
					<Button variant="outline" onClick={() => setSelectedPlan(null)}>
						← Volver a la lista
					</Button>
				</div>

				<PlanReviewPanel
					plan={selectedPlan}
					annotations={annotations}
					onApprove={handleApprove}
					onReject={handleReject}
					onExport={handleExport}
				/>
			</div>
		);
	}

	return (
		<div className={className}>
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center gap-2">
							<FileText className="h-5 w-5" />
							Plan Review Manager
						</CardTitle>
						<Button size="sm" onClick={handleCreatePlan}>
							<Plus className="h-4 w-4 mr-2" />
							Nuevo Plan
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{plans.length === 0 ? (
						<div className="text-center py-8">
							<FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
							<h3 className="text-lg font-medium mb-2">
								No hay planes para revisar
							</h3>
							<p className="text-muted-foreground mb-4">
								Los planes aparecerán aquí cuando los agentes los generen
							</p>
							<Button onClick={handleCreatePlan}>
								<Plus className="h-4 w-4 mr-2" />
								Crear Primer Plan
							</Button>
						</div>
					) : (
						<div className="space-y-3">
							{plans.map((plan) => (
								<div
									key={plan.id}
									className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
									onClick={() => handlePlanSelect(plan)}
								>
									<div className="flex items-center gap-3">
										{getStatusIcon(plan.status)}
										<div>
											<h4 className="font-medium">{plan.title}</h4>
											<p className="text-sm text-muted-foreground">
												{plan.description}
											</p>
											<div className="flex items-center gap-2 mt-1">
												<span className="text-xs text-muted-foreground">
													{plan.steps.length} pasos
												</span>
												{plan.agentId && (
													<span className="text-xs text-muted-foreground">
														• {plan.agentId}
													</span>
												)}
												<span className="text-xs text-muted-foreground">
													• {new Date(plan.createdAt).toLocaleString()}
												</span>
											</div>
										</div>
									</div>

									<div className="flex items-center gap-2">
										<Badge className={getStatusColor(plan.status)}>
											{plan.status}
										</Badge>
										<Button
											size="sm"
											variant="outline"
											onClick={(e) => {
												e.stopPropagation();
												handlePlanSelect(plan);
											}}
										>
											<Eye className="h-4 w-4" />
										</Button>
										<Button
											size="sm"
											variant="destructive"
											onClick={(e) => {
												e.stopPropagation();
												handleDeletePlan(plan.id);
											}}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
