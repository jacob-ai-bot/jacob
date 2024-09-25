import { type Command } from "~/server/api/routers/events";
import AnsiToHtml from "ansi-to-html";
import { useRef, useEffect } from "react";

interface ConverterOptions {
  /** The default foreground color used when reset color codes are encountered. */
  fg?: string;
  /** The default background color used when reset color codes are encountered. */
  bg?: string;
  /** Convert newline characters to `<br/>`. */
  newline?: boolean;
  /** Generate HTML/XML entities. */
  escapeXML?: boolean;
  /** Save style state across invocations of `toHtml()`. */
  stream?: boolean;
  /** Can override specific colors or the entire ANSI palette. */
  colors?: string[] | Record<number, string>;
}

// Create an instance of the ansi-to-html converter to pretty print terminal commands
const options: ConverterOptions = {
  fg: "#FFF",
  bg: "#000",
  newline: true,
  escapeXML: true,
};
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
const convert: AnsiToHtml = new AnsiToHtml(options);

type ComponentProps = {
  commands?: Command[];
};

export const TerminalComponent: React.FC<ComponentProps> = ({ commands }) => {
  // Function to convert ANSI to HTML
  const renderResponse = (response: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return { __html: convert.toHtml(response) };
  };
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [commands]);

  return (
    <div className="flex flex-col rounded-lg bg-gradient-to-b from-aurora-50/70 to-30% px-6 pb-6 pt-2 shadow-md transition-all dark:from-aurora-800/80 dark:to-aurora-800/20 dark:shadow-blueGray-800/80">
      <div className="mb-3 flex w-full items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          Terminal
        </h2>
      </div>
      <div className="hide-scrollbar h-[calc(100vh-326px)] overflow-auto rounded-lg border border-aurora-500/30 bg-neutral-50 p-4 font-mono text-sm text-black dark:border-aurora-600/30 dark:bg-black dark:text-white">
        {commands && commands.length > 0 ? (
          commands.map(({ command, response }, index) => (
            <div key={index}>
              <div className="items-top my-2 flex items-start space-x-1 whitespace-nowrap font-semibold">
                <span className="text-green-400 dark:text-green-800">$</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {command}
                </span>
              </div>
              <div
                className="text-blueGray-500"
                dangerouslySetInnerHTML={renderResponse(response)}
              />
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400">
            No commands present for this task.
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
};

export default TerminalComponent;
