import {
  access,
} from "node:fs/promises";

import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  getArtifact,
  getRunArtifacts,
} from "./artifact.service.js";

function getParamValue(
  value:
    | string
    | string[]
    | undefined,
) {
  if (
    Array.isArray(
      value,
    )
  ) {
    return value[0];
  }

  return value;
}

export async function listRunArtifacts(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const runId =
      getParamValue(
        request.params.runId,
      );

    if (!runId) {
      response.status(400).json({
        error: {
          code:
            "INVALID_RUN_ID",

          message:
            "Run ID가 필요합니다.",
        },
      });

      return;
    }

    const artifacts =
      await getRunArtifacts(
        runId,
      );

    /*
     * 보안상 실제 서버의 절대 파일 경로는
     * 프론트엔드에 노출하지 않는다.
     */
    const safeArtifacts =
      artifacts.map(
        ({
          path: _path,
          ...artifact
        }) =>
          artifact,
      );

    response.status(200).json({
      data:
        safeArtifacts,
    });
  } catch (error) {
    next(error);
  }
}

export async function downloadArtifact(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const artifactId =
      getParamValue(
        request.params.artifactId,
      );

    if (!artifactId) {
      response.status(400).json({
        error: {
          code:
            "INVALID_ARTIFACT_ID",

          message:
            "Artifact ID가 필요합니다.",
        },
      });

      return;
    }

    const artifact =
      await getArtifact(
        artifactId,
      );

    if (!artifact) {
      response.status(404).json({
        error: {
          code:
            "ARTIFACT_NOT_FOUND",

          message:
            "Artifact를 찾을 수 없습니다.",
        },
      });

      return;
    }

    try {
      await access(
        artifact.path,
      );
    } catch {
      response.status(404).json({
        error: {
          code:
            "ARTIFACT_FILE_NOT_FOUND",

          message:
            "Artifact 파일을 찾을 수 없습니다.",
        },
      });

      return;
    }

    response.download(
      artifact.path,
      artifact.name,
      (error) => {
        if (
          error &&
          !response.headersSent
        ) {
          next(
            error,
          );
        }
      },
    );
  } catch (error) {
    next(error);
  }
}