import type { ModelRequest, Provider, Settings } from "../types.js";
import { AgentError } from "../types.js";
import { array, object, post, requireText, text, type Transport } from "./http.js";
export function openai(settings: Settings, transport: Transport = fetch): Provider {
  return { async generate(r: ModelRequest) {
    const data = await post("https://api.openai.com/v1/responses", { Authorization: `Bearer ${settings.key}` }, {
      ...(r.responseSchema ? { text: { format: { type: 'json_schema', name: 'workflow_step', strict: true, schema: r.responseSchema } } } : {}),
      model: settings.model, instructions: r.system, input: r.prompt, max_output_tokens: r.maxTokens, store: false,
    }, transport, r.signal);
    if (data.status !== "completed") throw new AgentError("OpenAI 응답이 완료되지 않았습니다. 모델 설정과 출력 한도를 확인하세요.");
    const answer = array(data.output).filter(x => object(x).type === "message")
      .flatMap(x => array(object(x).content)).filter(x => object(x).type === "output_text")
      .map(x => text(object(x).text)).join("\n");
    return { provider: "openai", model: settings.model, text: requireText(answer) };
  }};
}
