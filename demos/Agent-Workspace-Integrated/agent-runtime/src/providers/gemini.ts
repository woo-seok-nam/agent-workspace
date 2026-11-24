import type { ModelRequest, Provider, Settings } from "../types.js";
import { AgentError } from "../types.js";
import { array, object, post, requireText, text, type Transport } from "./http.js";
export function gemini(settings: Settings, transport: Transport = fetch): Provider {
  return { async generate(r: ModelRequest) {
    const data = await post(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(settings.model)}:generateContent`,
      { "x-goog-api-key": settings.key }, {
        systemInstruction: { parts: [{ text: r.system }] },
        contents: [{ role: "user", parts: [{ text: r.prompt }] }],
        generationConfig: { maxOutputTokens: r.maxTokens },
      }, transport, r.signal);
    const candidate = object(array(data.candidates)[0]);
    if (candidate.finishReason !== "STOP") throw new AgentError("Gemini 응답이 정상 완료되지 않았습니다. 필터링·출력 한도를 확인하세요.");
    const answer = array(object(candidate.content).parts).filter(x => object(x).thought !== true)
      .map(x => text(object(x).text)).join("\n");
    return { provider: "gemini", model: settings.model, text: requireText(answer) };
  }};
}
