import { db } from "~/server/db/db";
import { TaskType } from "~/server/db/enums";
import { type BaseEventData, getLanguageFromFileName } from "~/server/utils";

interface EmitCodeEventParams extends BaseEventData {
  fileName: string;
  filePath: string;
  codeBlock: string;
}

export async function emitCodeEvent(params: EmitCodeEventParams) {
  const { fileName, filePath, codeBlock, ...baseEventData } = params;
  if (baseEventData) {
    await db.events.insert({
      ...baseEventData,
      type: TaskType.code,
      payload: {
        type: TaskType.code,
        fileName,
        filePath,
        codeBlock,
        language: getLanguageFromFileName(fileName),
      },
    });
  }
}
