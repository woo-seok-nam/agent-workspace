import { AgentError } from '../types.js';
export function modelFailure(error: unknown): { code: string; message: string } {
  if (!(error instanceof AgentError)) return { code: 'MODEL_CALL_FAILED', message: '모델 호출에 실패했습니다. 연결 상태와 설정을 확인하세요.' };
  const status = /^API HTTP (\d{3}):/.exec(error.message)?.[1];
  if (status) return { code: `API_HTTP_${status}`, message: ['401','403'].includes(status) ? 'API 키와 모델 접근 권한을 확인하세요.' : status === '429' ? '학교 API 잔액 또는 요청 한도를 확인하세요.' : ['400','404'].includes(status) ? '모델 ID와 Chat Completions API 지원 여부를 확인하세요.' : '학교 API 서비스 상태를 확인하세요.' };
  if (error.message.includes('구조화 실행')) return { code: 'STRUCTURED_OUTPUT_UNSUPPORTED', message: '이 실행 경로는 Gemini 본사 API의 구조화 출력을 아직 지원하지 않습니다. 학교 Gateway 설정을 사용하세요.' };
  if (error.message.includes('60초')) return { code: 'API_TIMEOUT', message: 'API 응답 대기 시간이 60초를 초과했습니다.' };
  if (error.message.includes('거절')) return { code: 'MODEL_REFUSAL', message: '모델이 요청을 거절했습니다.' };
  if (error.message.includes('정상 완료')) return { code: 'MODEL_INCOMPLETE', message: '응답이 정상 종료되지 않았습니다. 출력 한도 또는 모델 지원 범위를 확인하세요.' };
  if (error.message.includes('텍스트 답변')) return { code: 'MODEL_EMPTY_OUTPUT', message: '모델에서 텍스트 답변을 받지 못했습니다.' };
  if (error.message.includes('.env') || error.message.includes('FACTCHAT_BASE_URL') || error.message.includes('AI_BACKEND')) return { code: 'MODEL_CONFIG_ERROR', message: '.env의 공급자·키·모델·Gateway 주소 설정을 확인하세요.' };
  return { code: 'MODEL_CONNECTION_ERROR', message: '네트워크 또는 공급자 응답 형식을 확인하세요.' };
}
export function parseModelJson(raw: string): unknown {
  const trimmed = raw.trim();
  // Accept exactly one wrapping JSON fence; never extract arbitrary braces from prose.
  const fenced = /^```(?:json)?\s*\r?\n([\s\S]*?)\r?\n```$/i.exec(trimmed);
  return JSON.parse(fenced ? fenced[1]! : trimmed);
}
