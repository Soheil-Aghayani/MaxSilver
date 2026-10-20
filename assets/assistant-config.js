// Public setting of the catalog assistant. relay = the address of the relay (06_RAG/relay/worker.js). Empty = the chat shows the closest
// catalog items only; set it to the Worker's address to get written answers. This address is not a secret: the relay checks every request's sign-in and role.
window.MS_ASSISTANT = { relay: '' };
