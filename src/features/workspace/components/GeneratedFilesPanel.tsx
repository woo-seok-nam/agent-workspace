import {
  Download,
  File,
  FileCode2,
  FileImage,
  FileText,
} from "lucide-react";

import type {
  ResultFile,
} from "../types";

interface GeneratedFilesPanelProps {
  files: ResultFile[];
}

export function GeneratedFilesPanel({
  files,
}: GeneratedFilesPanelProps) {
  return (
    <aside className="generated-files-panel">
      <div className="generated-files-panel__header">
        <h2>
          Generated Files
        </h2>

        <span>
          {files.length}
        </span>
      </div>

      <div className="generated-files-panel__list">
        {files.length === 0 ? (
          <div className="generated-files-panel__empty">
            생성된 파일이 없습니다.
          </div>
        ) : (
          files.map((file) => {
            const Icon =
              getFileIcon(
                file.mimeType,
              );

            return (
              <article
                key={file.id}
                className="generated-file-card"
              >
                <div className="generated-file-card__icon">
                  <Icon
                    size={17}
                  />
                </div>

                <div className="generated-file-card__content">
                  <strong>
                    {file.name}
                  </strong>

                  <span>
                    {formatFileSize(
                      file.size,
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  className="generated-file-card__action"
                  aria-label={`${file.name} 다운로드`}
                >
                  <Download
                    size={14}
                  />
                </button>
              </article>
            );
          })
        )}
      </div>
    </aside>
  );
}

function getFileIcon(
  mimeType: string,
) {
  if (
    mimeType.startsWith(
      "image/",
    )
  ) {
    return FileImage;
  }

  if (
    mimeType ===
    "application/json"
  ) {
    return FileCode2;
  }

  if (
    mimeType.startsWith(
      "text/",
    )
  ) {
    return FileText;
  }

  return File;
}

function formatFileSize(
  bytes: number,
) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes =
    bytes / 1024;

  if (
    kilobytes < 1024
  ) {
    return `${kilobytes.toFixed(
      1,
    )} KB`;
  }

  const megabytes =
    kilobytes / 1024;

  return `${megabytes.toFixed(
    1,
  )} MB`;
}