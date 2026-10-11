import {
  unlink,
} from "node:fs/promises";

import {
  dirname,
  isAbsolute,
  relative,
  resolve,
} from "node:path";

import {
  fileURLToPath,
} from "node:url";

import {
  prisma,
} from "../../lib/prisma.js";

import type {
  DeleteRunResult,
} from "./runDelete.types.js";

const currentFilePath =
  fileURLToPath(
    import.meta.url,
  );

const currentDirectory =
  dirname(
    currentFilePath,
  );

const backendRoot =
  resolve(
    currentDirectory,
    "../../../",
  );

const artifactDirectory =
  resolve(
    backendRoot,
    "storage",
    "artifacts",
  );

export async function deleteWorkflowRun(
  runId: string,
): Promise<DeleteRunResult | null> {
  /*
   * DB 삭제 전에 Artifact의 실제 파일 경로를 확보한다.
   *
   * WorkflowRun을 삭제하면 Artifact DB 레코드는
   * onDelete: Cascade 때문에 같이 없어지기 때문이다.
   */
  const run =
    await prisma.workflowRun.findUnique({
      where: {
        id:
          runId,
      },

      include: {
        artifacts:
          true,
      },
    });

  if (!run) {
    return null;
  }

  const artifactPaths =
    run.artifacts.map(
      (artifact) =>
        artifact.path,
    );

  /*
   * WorkflowRun 삭제
   *
   * Prisma Schema의 Cascade 설정에 의해:
   *
   * WorkflowRun
   * ├─ StepRun[]
   * └─ Artifact[]
   *
   * 관련 DB 데이터도 같이 삭제된다.
   */
  await prisma.workflowRun.delete({
    where: {
      id:
        runId,
    },
  });

  const deletedArtifactFiles: string[] =
    [];

  const failedArtifactFiles: string[] =
    [];

  /*
   * DB 삭제가 성공한 뒤 실제 파일도 정리한다.
   *
   * 하나의 파일 삭제가 실패해도 나머지 파일 삭제는
   * 계속 진행한다.
   */
  for (
    const artifactPath
    of artifactPaths
  ) {
    if (
      !isSafeArtifactPath(
        artifactPath,
      )
    ) {
      failedArtifactFiles.push(
        artifactPath,
      );

      continue;
    }

    try {
      await unlink(
        artifactPath,
      );

      deletedArtifactFiles.push(
        artifactPath,
      );
    } catch (error) {
      /*
       * 파일이 이미 존재하지 않는 경우에도
       * Run DB 삭제 자체는 성공한 상태다.
       *
       * 파일 정리 실패 정보만 결과에 남긴다.
       */
      console.warn(
        `[Run Delete] Artifact 파일 삭제 실패: ${artifactPath}`,
        error,
      );

      failedArtifactFiles.push(
        artifactPath,
      );
    }
  }

  return {
    runId,

    deleted:
      true,

    deletedArtifactFiles:
      deletedArtifactFiles.length,

    failedArtifactFiles,
  };
}

/*
 * DB에 저장된 path를 그대로 unlink하지 않고,
 * 반드시 backend/storage/artifacts 내부 파일인지 검사한다.
 *
 * 혹시 DB 값이 잘못되거나 조작되더라도:
 *
 * C:\Windows\...
 * ../...
 *
 * 같은 경로가 삭제되는 것을 막는다.
 */
function isSafeArtifactPath(
  artifactPath: string,
) {
  if (
    !artifactPath ||
    !isAbsolute(
      artifactPath,
    )
  ) {
    return false;
  }

  const resolvedArtifactPath =
    resolve(
      artifactPath,
    );

  const relativePath =
    relative(
      artifactDirectory,
      resolvedArtifactPath,
    );

  if (
    relativePath ===
    ""
  ) {
    return false;
  }

  if (
    relativePath.startsWith(
      "..",
    )
  ) {
    return false;
  }

  if (
    isAbsolute(
      relativePath,
    )
  ) {
    return false;
  }

  return true;
}