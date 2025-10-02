import { tool } from 'ai';
import { z } from 'zod';

/**
 * Update document tool for AI to modify existing artifacts
 */
export const updateDocumentTool = tool({
  description: 'Update an existing document or artifact based on user request',
  parameters: z.object({
    description: z
      .string()
      .describe('Description of the changes to make to the current artifact'),
  }),
  execute: async ({ description }) => {
    // Return update request
    // This will be handled by the client
    return {
      message: `Updating artifact: ${description}`,
      description,
    };
  },
});
