import { type Message } from "~/types";

export const TEST_MESSAGES: Message[] = [
  {
    role: "assistant",
    content:
      "I'm ready to help with the *Integrate Checkout component with Stripe backend* task. Want to start working on this?",
  },
  {
    role: "user",
    content: "sure",
  },
  {
    role: "assistant",
    content:
      "Great! Let's dive right in. Here's what I know so far about the issue:\n\n- **Issue ID:** todo-2298898711\n- **Description:** Wire up Checkout component to Stripe backend\n- **Name:** Integrate Checkout component with Stripe backend\n- **Status:** todo\n- **Steps to Address Issue:**\n  1. Identify the Checkout component in the codebase.\n  2. Integrate Stripe's API into the Checkout component.\n  3. Ensure the backend is set up to handle Stripe transactions.\n  4. Test the integration thoroughly to ensure it handles various payment scenarios and edge cases.\n- **Commit Title:** Integrate Checkout component with Stripe backend\n- **Files to Create:** None specified\n- **Files to Update:** None specified\n\nTo make sure we capture all the necessary details, I'll ask you a few questions. This will help us create a comprehensive GitHub issue for the dev team. Ready?\n\n**1.** **Could you please describe the exact functionality you want for the Checkout component?** For example, should it handle different types of payments, display error messages, etc.?\n\n**2.** **Are there any specific user interface elements or design guidelines we should follow for the Checkout component?** If you have a Figma link or design document, that would be super helpful.\n\n**3.** **Do you have any specific requirements for handling edge cases or error scenarios?** For example, what should happen if a payment fails or if the Stripe API is down?\n\n**4.** **Are there any new packages or dependencies we need to include for this integration?** For instance, a specific Stripe library or any other tools?\n\n**5.** **Could you specify the exact file names that need to be created or updated?** This will help the dev team know exactly where to make changes.\n\nOnce I have these details, I'll summarize everything and confirm with you before writing up the GitHub issue. Sound good?",
  },
  {
    role: "user",
    content:
      "Yeah, so the exact functionality is that we already have a checkout component that is made. It captures basic credit card information. We want to just grab those, send it over to an endpoint that sends it directly to Stripe. And we don't want to store that information at all. The requirements for edge cases or errors, you have a good example there, please add in some common errors and edge cases that you might run into. There is a new package, use the Stripe SDK package from NPM. And the exact file name is /api/checkout/stripe.ts.",
  },
  {
    role: "assistant",
    content:
      "Perfect, thanks for the details! Let's make sure I've got everything right:\n\n1. **Functionality:**\n   - The existing Checkout component captures basic credit card information.\n   - This information should be sent to an endpoint that forwards it directly to Stripe.\n   - No credit card information should be stored.\n\n2. **Edge Cases and Errors:**\n   - Handle common errors such as invalid card details, expired cards, insufficient funds, etc.\n   - Handle scenarios where the Stripe API is down or unresponsive.\n   - Provide user-friendly error messages for each scenario.\n\n3. **New Package:**\n   - Use the Stripe SDK package from NPM.\n\n4. **File Name:**\n   - The exact file to be created/updated is `/api/checkout/stripe.ts`.\n\nLet me summarize this into a GitHub issue description. Here’s what I’ll post:\n\n```markdown\n### Title: Integrate Checkout Component with Stripe Backend\n\n#### Description:\nIntegrate the existing Checkout component with the Stripe backend to handle payments. The Checkout component captures basic credit card information, which should be sent to an endpoint that forwards it directly to Stripe. No credit card information should be stored.\n\n#### Requirements:\n- **Functionality:**\n  - Use the existing Checkout component to capture credit card information.\n  - Send the captured information to an endpoint that forwards it to Stripe.\n  - Ensure no credit card information is stored.\n\n- **Edge Cases and Errors:**\n  - Handle invalid card details.\n  - Handle expired cards.\n  - Handle insufficient funds.\n  - Handle scenarios where the Stripe API is down or unresponsive.\n  - Provide user-friendly error messages for each scenario.\n\n- **New Package:**\n  - Use the Stripe SDK package from NPM.\n\n#### Files:\n- **File to be created/updated:**\n  - `/api/checkout/stripe.ts`\n\n#### Acceptance Criteria:\n- [ ] The Checkout component captures and sends credit card information to the Stripe endpoint.\n- [ ] No credit card information is stored.\n- [ ] Common errors and edge cases are handled with user-friendly messages.\n- [ ] The Stripe SDK package is used for the integration.\n- [ ] The file `/api/checkout/stripe.ts` is created/updated as needed.\n\nLet me know if you would like me to modify anything. Otherwise, confirm this looks good and I'll go ahead and add this to the task queue.\n```\n\nDoes this look good to you?",
  },
  {
    role: "user",
    content: "Looks great, let's create the issue.",
  },
  {
    role: "assistant",
    content:
      "Awesome! Here we go:\n\n```\nClick the button below to update the issue in task queue.\n\n<<UPDATE_TASK>>\n```",
  },
];
