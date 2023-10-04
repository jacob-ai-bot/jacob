import { parseTemplate, TemplateParams } from "../utils";

describe("parseTemplate", () => {
  const mockParams: TemplateParams = {
    userName: "John",
    issueTitle: "Bug in code",
  };

  beforeEach(() => {
    process.env.PROMPT_FOLDER = "prompts";
  });

  afterEach(() => {
    delete process.env.PROMPT_FOLDER;
  });

  it("should parse the template with the given parameters", () => {
    const agent = "dev";
    const action = "new_issue";
    const type = "message";
    const expectedOutput = `Hi John, I just saw you posted a new issue titled "Bug in code". Give me a minute to come up with a plan and then I'll get right on it! :thinking_face:`;

    expect(parseTemplate(agent, action, type, mockParams)).toEqual(
      expectedOutput,
    );
  });

  it("should throw an error if the PROMPT_FOLDER environment variable is not set", () => {
    delete process.env.PROMPT_FOLDER;

    expect(() => {
      parseTemplate("dev", "new_issue", "message", mockParams);
    }).toThrowError("Environment variable PROMPT_FOLDER is not set");
  });

  it("should throw an error if the file does not exist", () => {
    process.env.PROMPT_FOLDER = "non-existent-folder";

    expect(() => {
      parseTemplate("dev", "new_issue", "message", mockParams);
    }).toThrowError("File not found:");
  });

  it("should throw an error if a required variable is missing", () => {
    const agent = "dev";
    const action = "new_issue";
    const type = "message";
    const params: TemplateParams = {
      userName: "John",
    };

    expect(() => {
      parseTemplate(agent, action, type, params);
    }).toThrowError("Missing required variables: issueTitle");
  });
});
