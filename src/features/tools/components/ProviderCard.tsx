import {
  CheckCircle2,
  CircleOff,
  Cpu,
  Server,
} from "lucide-react";

import type {
  ProviderConfig,
} from "../types";

import {
  getModels,
} from "../../../data/catalogRepository";

interface ProviderCardProps {
  provider: ProviderConfig;

  onToggle: (
    providerId: ProviderConfig["id"],
  ) => void;
}

export function ProviderCard({
  provider,
  onToggle,
}: ProviderCardProps) {
  const providerModels =
    getModels().filter(
      (model) =>
        model.provider ===
        provider.id,
    );

  const isLocal =
    provider.id === "local";

  return (
    <article className="provider-card">
      <div className="provider-card__top">
        <div className="provider-card__icon">
          {isLocal ? (
            <Server size={18} />
          ) : (
            <Cpu size={18} />
          )}
        </div>

        <div className="provider-card__title">
          <div>
            <strong>
              {provider.name}
            </strong>

            <ProviderStatus
              status={
                provider.connectionStatus
              }
            />
          </div>

          <p>
            {provider.description}
          </p>
        </div>

        <label className="provider-toggle">
          <input
            type="checkbox"
            checked={
              provider.enabled
            }
            onChange={() =>
              onToggle(
                provider.id,
              )
            }
          />

          <span />
        </label>
      </div>

      <div className="provider-card__models">
        <span>
          Available Models
        </span>

        {providerModels.length >
        0 ? (
          <div>
            {providerModels.map(
              (model) => (
                <span
                  key={
                    model.id
                  }
                  className="provider-model-chip"
                >
                  {model.displayName}
                </span>
              ),
            )}
          </div>
        ) : (
          <p>
            등록된 Model이 없습니다.
          </p>
        )}
      </div>

      <div className="provider-card__notice">
        실제 API 인증 정보는
        Backend에서 관리합니다.
      </div>
    </article>
  );
}

function ProviderStatus({
  status,
}: {
  status:
    ProviderConfig["connectionStatus"];
}) {
  if (
    status === "connected"
  ) {
    return (
      <span className="provider-status provider-status--connected">
        <CheckCircle2
          size={10}
        />
        Connected
      </span>
    );
  }

  if (
    status === "error"
  ) {
    return (
      <span className="provider-status provider-status--error">
        <CircleOff
          size={10}
        />
        Error
      </span>
    );
  }

  return (
    <span className="provider-status provider-status--not-configured">
      <CircleOff size={10} />
      Not configured
    </span>
  );
}