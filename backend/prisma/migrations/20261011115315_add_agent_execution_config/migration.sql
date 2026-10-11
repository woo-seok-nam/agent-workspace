-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "modelId" TEXT NOT NULL,
    "toolIds" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "systemPrompt" TEXT,
    "temperature" REAL NOT NULL DEFAULT 0.2,
    "maxTokens" INTEGER NOT NULL DEFAULT 4096,
    "retryCount" INTEGER NOT NULL DEFAULT 2,
    "timeoutSeconds" INTEGER NOT NULL DEFAULT 60,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Agent" ("createdAt", "description", "enabled", "id", "modelId", "name", "toolIds", "updatedAt") SELECT "createdAt", "description", "enabled", "id", "modelId", "name", "toolIds", "updatedAt" FROM "Agent";
DROP TABLE "Agent";
ALTER TABLE "new_Agent" RENAME TO "Agent";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
