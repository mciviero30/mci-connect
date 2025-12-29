import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all items without descriptions or with empty descriptions
    const allItems = await base44.asServiceRole.entities.QuoteItem.list();
    const itemsNeedingDescriptions = allItems.filter(item => !item.description || item.description.trim() === '');

    console.log(`Found ${itemsNeedingDescriptions.length} items needing descriptions`);

    let updatedCount = 0;
    const batchSize = 10;

    // Process in batches
    for (let i = 0; i < itemsNeedingDescriptions.length; i += batchSize) {
      const batch = itemsNeedingDescriptions.slice(i, i + batchSize);
      
      // Create a prompt with all items in the batch
      const itemsList = batch.map(item => 
        `- ${item.name} (Category: ${item.category}, Unit: ${item.unit}, Price: $${item.unit_price})`
      ).join('\n');

      const prompt = `You are a construction/installation industry expert. Generate brief, professional descriptions (10-15 words max) for these catalog items. Return ONLY a JSON array with descriptions in the SAME ORDER as the items listed.

Items:
${itemsList}

Return format: ["description 1", "description 2", ...]

Make descriptions:
- Professional and concise
- Relevant to construction/installation industry
- In English
- Focus on what the item is or what service it provides`;

      const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            descriptions: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      const descriptions = response.descriptions;

      // Update each item with its description
      for (let j = 0; j < batch.length; j++) {
        const item = batch[j];
        const description = descriptions[j] || `Professional ${item.category} item for construction projects`;
        
        await base44.asServiceRole.entities.QuoteItem.update(item.id, {
          description: description
        });
        updatedCount++;
      }

      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}: ${batch.length} items`);
    }

    return Response.json({
      success: true,
      message: `Successfully generated descriptions for ${updatedCount} items`,
      updatedCount
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});