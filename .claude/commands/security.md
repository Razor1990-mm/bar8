---
name: security
description: Run security checklist on code changes
---

Run a security audit on the specified code or recent changes.

**Usage:** `/security` or `/security src/app/api/`

## Checklist

### Authentication & Authorization

- [ ] All `/api/**` route handlers that mutate data check auth (via Supabase server client / session) before acting?
- [ ] Missing env vars return 500 (fail-closed), not silent bypass?
- [ ] Auth failures return 401/403 without leaking whether a resource/account exists?
- [ ] Admin-only actions (e.g. approving membership applications) are gated by an `is_admin()`-style check, not just RLS alone?

### Data Handling

- [ ] No secrets logged (auth headers, tokens, passwords)?
- [ ] PII (member phone/email/address) handled appropriately — never added to fixtures/seed data per `.claude/rules/landmines.md` L3?
- [ ] Input validated (Zod schema) before use?
- [ ] Output encoded/escaped properly (React handles this by default — flag any `dangerouslySetInnerHTML`)?

### SQL/Database

- [ ] Using Supabase's query builder / parameterized RPC calls (not raw string-interpolated SQL)?
- [ ] No dynamic table/column names from user input?
- [ ] Unique constraints used for idempotency where needed?
- [ ] Every table has an RLS policy; no accidental `service_role` client usage in a code path reachable from user input without justification?
- [ ] For owner-writable RLS policies: are privileged columns (e.g. `is_admin`, `status`) protected by a guard trigger, not just the row-scoped policy? (see `.claude/rules/landmines.md` L1)

### OWASP Top 10 (abridged)

- [ ] **Injection** - SQL, command safe?
- [ ] **Broken Auth** - Sessions, tokens handled correctly (Supabase auth cookies)?
- [ ] **Sensitive Data Exposure** - Encryption, logging safe?
- [ ] **Broken Access Control** - Authorization checked, RLS policies correct?
- [ ] **Security Misconfiguration** - Defaults changed, headers set?
- [ ] **XSS** - Output escaped (React components, no raw HTML injection)?
- [ ] **Insecure Deserialization** - JSON parsing safe?
- [ ] **Vulnerable Components** - Dependencies up to date?
- [ ] **Insufficient Logging** - Security events logged?

### Project-Specific

- [ ] `.env*` files stay gitignored except `.env.example` — no secret committed (see `.claude/rules/landmines.md` L3, repo is public)?
- [ ] Rate limiting applied to public-facing endpoints where relevant?
- [ ] New Next.js 16 API usage checked against `node_modules/next/dist/docs/` rather than assumed from training data (see `.claude/rules/landmines.md` L2)?

## Output Format

```
## Security Audit Results

### PASS
- Authentication: Session required on all mutating API routes
- SQL Injection: Supabase parameterized queries used
- Logging: No secrets in log output

### FAIL
- **Missing auth check** (HIGH)
  File: src/app/api/applications/route.ts:45
  Issue: Route handler missing session check before mutating data
  Fix: Add Supabase server-client session check before proceeding

- **Sensitive data logged** (MEDIUM)
  File: src/lib/applications.ts:23
  Issue: Request body logged including potential PII
  Fix: Redact PII fields or remove log

### WARNINGS
- Consider adding rate limiting to /api/applications
```

## Severity Levels

- **HIGH** - Direct security vulnerability, fix immediately
- **MEDIUM** - Potential issue, fix before production
- **LOW** - Best practice violation, fix when convenient
