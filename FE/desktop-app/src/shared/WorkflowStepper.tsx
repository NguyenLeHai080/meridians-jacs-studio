import type { NavKey } from "../core/types";
import { Icon } from "./Icon";

export type WorkflowStepKey = "sources" | "analysis" | "story" | "timeline" | "brand" | "render";

const STEPS: Array<{ key: WorkflowStepKey; label: string; icon: string }> = [
  { key: "sources", label: "1. Nguồn video", icon: "folder" },
  { key: "analysis", label: "2. Phân tích AI", icon: "scan" },
  { key: "story", label: "3. Kịch bản & Voice", icon: "mic" },
  { key: "timeline", label: "4. Dựng & Timeline", icon: "timeline" },
  { key: "brand", label: "5. Phụ đề & Brand", icon: "captions" },
  { key: "render", label: "6. Render xuất bản", icon: "play" },
];

export function WorkflowStepper({
  activeStep,
  onNavigate,
}: {
  activeStep: WorkflowStepKey;
  onNavigate: (key: NavKey) => void;
}) {
  return (
    <section className="workflow-pipeline-stepper" aria-label="Quy trình sản xuất video">
      {STEPS.map((step, index) => {
        const isActive = activeStep === step.key;
        return (
          <div key={step.key} className="workflow-pipeline-item">
            <button
              type="button"
              className={`workflow-pipeline-step ${isActive ? "is-active" : ""}`}
              onClick={() => onNavigate(step.key)}
              title={`Chuyển tới ${step.label}`}
            >
              <span className="workflow-step-icon">
                <Icon name={step.icon as never} size={13} />
              </span>
              <span className="workflow-step-text">{step.label}</span>
            </button>
            {index < STEPS.length - 1 && (
              <span className="workflow-pipeline-arrow">
                <Icon name="arrow" size={11} />
              </span>
            )}
          </div>
        );
      })}
    </section>
  );
}
