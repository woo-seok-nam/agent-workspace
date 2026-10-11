import {
  mkdir,
  writeFile,
} from "node:fs/promises";

import {
  dirname,
  join,
} from "node:path";

import {
  fileURLToPath,
} from "node:url";

import {
  addArtifact,
} from "./artifact.service.js";

const currentFilePath =
  fileURLToPath(
    import.meta.url,
  );

const currentDirectory =
  dirname(
    currentFilePath,
  );

const backendRoot =
  join(
    currentDirectory,
    "../../../",
  );

const artifactDirectory =
  join(
    backendRoot,
    "storage",
    "artifacts",
  );

export async function writeMarkdownArtifact(
  runId: string,
  content: string,
) {
  await mkdir(
    artifactDirectory,
    {
      recursive:
        true,
    },
  );

  const fileName =
    `${runId}-report.md`;

  const filePath =
    join(
      artifactDirectory,
      fileName,
    );

  const buffer =
    Buffer.from(
      content,
      "utf8",
    );

  await writeFile(
    filePath,
    buffer,
  );

  return addArtifact({
    runId,

    name:
      "report.md",

    type:
      "markdown",

    path:
      filePath,

    mimeType:
      "text/markdown",

    size:
      buffer.length,
  });
}