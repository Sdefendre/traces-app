/** Tracks tool calls in one spoken reply so only one follow-up reply is started. */
export interface VoiceToolBatch {
  inFlight: number;
  responseDone: boolean;
  hadTool: boolean;
}

export function createVoiceToolBatch(): VoiceToolBatch {
  return { inFlight: 0, responseDone: false, hadTool: false };
}

export function noteToolStarted(batch: VoiceToolBatch) {
  batch.inFlight += 1;
  batch.hadTool = true;
}

export function noteToolFinished(batch: VoiceToolBatch, sendResponse: () => void) {
  batch.inFlight = Math.max(0, batch.inFlight - 1);
  continueVoiceResponse(batch, sendResponse);
}

export function noteResponseDone(batch: VoiceToolBatch, sendResponse: () => void) {
  batch.responseDone = true;
  continueVoiceResponse(batch, sendResponse);
}

function continueVoiceResponse(batch: VoiceToolBatch, sendResponse: () => void) {
  if (batch.inFlight === 0 && batch.responseDone && batch.hadTool) {
    sendResponse();
    batch.responseDone = false;
    batch.hadTool = false;
  }
}
