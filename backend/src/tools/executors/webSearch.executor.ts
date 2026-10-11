import {
  GoogleGenAI,
} from "@google/genai";

import type {
  WebSearchResult,
  WebSearchSource,
} from "../tool.types.js";

let client:
  | GoogleGenAI
  | undefined;

function getGoogleClient() {
  const apiKey =
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Web Search Tool을 사용하려면 GEMINI_API_KEY가 필요합니다.",
    );
  }

  if (!client) {
    client =
      new GoogleGenAI({
        apiKey,
      });
  }

  return client;
}

interface GroundingChunkLike {
  web?: {
    uri?: string;

    title?: string;
  };
}

interface CandidateLike {
  groundingMetadata?: {
    groundingChunks?: GroundingChunkLike[];
  };
}

interface SearchResponseLike {
  text?: string;

  candidates?: CandidateLike[];
}

export async function executeWebSearch(
  query: string,
): Promise<WebSearchResult> {
  const google =
    getGoogleClient();

  const response =
    await google.models.generateContent({
      model:
        "gemini-3.8-flash",

      contents: [
        "다음 주제에 대해 웹 검색을 수행하세요.",
        "",
        `검색 주제: ${query}`,
        "",
        "검색 결과에서 핵심 사실을 정리하세요.",
        "가능하면 서로 다른 출처를 교차 확인하세요.",
        "검색 결과에 없는 사실을 임의로 만들어내지 마세요.",
      ].join(
        "\n",
      ),

      config: {
        tools: [
          {
            googleSearch: {},
          },
        ],
      },
    });

  const typedResponse =
    response as SearchResponseLike;

  const text =
    typedResponse.text?.trim();

  if (!text) {
    throw new Error(
      "Web Search Tool이 검색 결과를 반환하지 않았습니다.",
    );
  }

  const groundingChunks =
    typedResponse.candidates?.[0]
      ?.groundingMetadata
      ?.groundingChunks ??
    [];

  const sources:
    WebSearchSource[] =
      groundingChunks
        .map(
          (chunk) => ({
            title:
              chunk.web
                ?.title,

            url:
              chunk.web
                ?.uri,
          }),
        )
        .filter(
          (source) =>
            Boolean(
              source.title ||
                source.url,
            ),
        );

  return {
    query,

    text,

    sources,
  };
}