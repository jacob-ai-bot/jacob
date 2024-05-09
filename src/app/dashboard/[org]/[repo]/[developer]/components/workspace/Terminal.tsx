import { type Command } from "~/types";
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
    <div className="flex h-full min-h-full w-full flex-grow flex-col p-2 pt-0">
      <div className="w-full py-2">
        <h2 className="text-lg font-semibold text-white">Terminal</h2>
        <hr className="my-2 border-t border-gray-700" />
      </div>
      <div className="hide-scrollbar h-full overflow-auto rounded-lg border border-blueGray-700 bg-black p-4 font-mono text-sm text-white">
        {commands && commands.length > 0 ? (
          commands.map(({ command, response }, index) => (
            <div key={index}>
              <div className="items-top my-2 flex items-start space-x-1 whitespace-nowrap font-semibold ">
                <span className="text-green-400">$</span>
                <span className="text-gray-300">{command}</span>
              </div>
              <div
                className="text-blueGray-400"
                dangerouslySetInnerHTML={renderResponse(response)}
              />
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500">
            No commands present for this task.
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
};

export default TerminalComponent;
