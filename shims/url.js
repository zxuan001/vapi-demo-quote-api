// Minimal shim for Node's `url` module (only `domainToASCII` is used).
//
// Why this exists: the @x402 packages pull in the (unused-for-us) bazaar
// extension chunk, which imports `domainToASCII` from `url`. esbuild's
// browser platform cannot resolve Node builtins, and Cloudflare Workers
// only provide them behind the nodejs_compat flag. Our routes never use
// the bazaar extension, so this function is never called at runtime —
// and for plain ASCII domains (everything this API touches) identity is
// exactly what domainToASCII returns anyway.
export const domainToASCII = (domain) => domain;
export default { domainToASCII };
