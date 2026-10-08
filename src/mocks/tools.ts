import type { Tool } from "../features/tools/types";

export const mockTools: Tool[] = [
  {
    id: "web-search",
    name: "Web Search",
    description: "웹에서 최신 정보를 검색합니다.",
    type: "web_search",
    enabled: true,
  },
  {
    id: "browser",
    name: "Browser",
    description: "웹페이지를 탐색하고 내용을 확인합니다.",
    type: "browser",
    enabled: true,
  },
  {
    id: "document-parser",
    name: "Document Parser",
    description: "문서 파일의 내용을 읽고 분석합니다.",
    type: "document_parser",
    enabled: true,
  },
  {
    id: "file-write",
    name: "File Writer",
    description: "생성된 결과를 파일 형태로 저장합니다.",
    type: "file",
    enabled: true,
  },
  {
    id: "code-execution",
    name: "Code Execution",
    description: "코드를 실행하고 결과를 반환합니다.",
    type: "code",
    enabled: true,
  },
];