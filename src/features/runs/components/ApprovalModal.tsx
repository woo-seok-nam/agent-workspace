import {
  Check,
  FileText,
  ShieldCheck,
  X,
} from "lucide-react";

interface ApprovalModalProps {
  open: boolean;

  stepName: string;

  agentName?: string;

  summary?: string;

  onApprove: () => void;

  onReject: () => void;

  onClose?: () => void;
}

export function ApprovalModal({
  open,
  stepName,
  agentName,
  summary,
  onApprove,
  onReject,
  onClose,
}: ApprovalModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="approval-modal-backdrop">
      <section className="approval-modal">
        <div className="approval-modal__header">
          <div className="approval-modal__icon">
            <ShieldCheck size={20} />
          </div>

          <div>
            <h2>승인이 필요합니다</h2>

            <p>
              다음 단계로 진행하기 전에
              사용자 승인이 필요합니다.
            </p>
          </div>

          {onClose && (
            <button
              type="button"
              className="approval-modal__close"
              onClick={onClose}
              aria-label="닫기"
            >
              ×
            </button>
          )}
        </div>

        <div className="approval-modal__content">
          <div className="approval-info">
            <span>실행 Step</span>

            <strong>{stepName}</strong>
          </div>

          <div className="approval-info">
            <span>사용 Agent</span>

            <strong>
              {agentName ?? "Agent 없음"}
            </strong>
          </div>

          <div className="approval-summary">
            <div className="approval-summary__title">
              <FileText size={14} />

              <span>실행 요약</span>
            </div>

            <p>
              {summary ??
                "현재 단계의 실행 결과를 확인한 뒤 승인 여부를 결정하세요."}
            </p>
          </div>
        </div>

        <div className="approval-modal__actions">
          <button
            type="button"
            className="approval-reject-button"
            onClick={onReject}
          >
            <X size={14} />
            거절
          </button>

          <button
            type="button"
            className="approval-approve-button"
            onClick={onApprove}
          >
            <Check size={14} />
            승인하고 진행
          </button>
        </div>
      </section>
    </div>
  );
}