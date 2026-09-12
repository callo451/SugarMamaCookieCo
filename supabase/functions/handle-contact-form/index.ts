// Retired adapter. The supported public form uses send-contact-message.
Deno.serve(() => Response.json({error:'This endpoint has been retired'},{status:410}));
