import {
  isTextTooLongForContextWindow,
  type Model,
} from "~/server/openai/request";
import { type ContextItem } from "~/server/utils/codebaseContext";

export function getContextOverview(contextItems: ContextItem[], model: Model) {
  let context = contextItems
    .map((c) => `${c.file}: ${c.overview} \n\n ${c.text}`)
    .join("\n");

  // check to see if the context is going to overflow the context window.
  // if so, we need to use the overview instead of the text
  if (isTextTooLongForContextWindow(context, model, 0.08)) {
    context = contextItems.map((c) => `${c.file}: ${c.overview}`).join("\n");
  }
  if (isTextTooLongForContextWindow(context, model, 0.08)) {
    context = contextItems.map((c) => `${c.file}`).join("\n");
  }
  if (isTextTooLongForContextWindow(context, model, 0.08)) {
    context = "";
  }
  return context;
}
