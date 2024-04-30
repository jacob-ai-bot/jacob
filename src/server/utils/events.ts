import { db } from "~/server/db/db";
import { TaskType } from "~/server/db/enums";
import { type BaseEventData } from "~/server/utils";
import { type Language } from "~/server/utils/settings";

interface EmitCodeEventParams extends BaseEventData {
  fileName: string;
  filePath: string;
  codeBlock: string;
  language: Language;
}

export async function emitCodeEvent(params: EmitCodeEventParams) {
  const { fileName, filePath, codeBlock, language, ...baseEventData } = params;
  if (baseEventData) {
    await db.events.insert({
      ...baseEventData,
      type: TaskType.code,
      payload: {
        type: TaskType.code,
        fileName,
        filePath,
        codeBlock,
        language,
      },
    });
  }
}
