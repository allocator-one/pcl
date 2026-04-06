# Planner Roles — Design Spec

## The Idea

Same insight as rcl roles: different perspectives catch different things. But for planning, the perspectives are **stakeholder viewpoints**, not code review lenses.

An architect looking at a feature request sees system boundaries and integration points. A security engineer sees threat surfaces and auth requirements. A QA engineer sees test scenarios and edge cases. A product manager sees user stories and scope cuts.

Running the same planning prompt through all of them and synthesizing the results produces a more complete plan than any single perspective.

## Roles ≠ Reviewers

Key difference from rcl: plan outputs are **less structured** than code review findings. A review finding has file + line + category — easy to dedup by location. A plan step like "add authentication" might be phrased as:

- "Implement JWT auth middleware" (architect)
- "Design access control for API endpoints" (security)
- "Add login flow with MFA" (product)

All the same concern, different angles. Dedup requires **semantic matching**, not string matching.

## Built-in Roles (8)

### `general` (default, runs on ALL models)
Full planning perspective. Produces a complete plan covering all dimensions. This is what pcl does today — the baseline.

### `product`
User stories, MVP scope, what to build first, what to cut. Thinks in terms of user value and shipping increments.

> You are a product manager planning this feature. Focus on: user stories and acceptance criteria, MVP scope (what's essential vs nice-to-have), phased delivery plan, user-facing requirements, and what to explicitly cut or defer. Think about the user journey, not implementation details.

### `architect`
System design, module boundaries, integration points, tech stack choices, data model.

> You are a software architect planning this feature. Focus on: system design and component architecture, data model and schema changes, API contracts and integration points, technology choices and tradeoffs, scaling considerations. Think about structure, not user stories.

### `security`
Threat modeling, auth/authz design, data flow risks, compliance requirements.

> You are a security engineer planning this feature. Focus on: threat model (what can go wrong), authentication and authorization design, data flow and storage security, input validation requirements, compliance considerations. Produce a lightweight threat model, not a full plan.

### `devops`
Deployment strategy, infrastructure needs, monitoring, rollback plan, CI/CD changes.

> You are a DevOps/SRE engineer planning this feature. Focus on: deployment strategy (blue-green, canary, etc.), infrastructure requirements, monitoring and alerting needs, rollback plan, CI/CD pipeline changes, environment configuration. Think about how this gets to production safely.

### `qa`
Test strategy, edge cases, acceptance criteria, integration test plan.

> You are a QA engineer planning this feature. Focus on: test strategy (unit, integration, e2e), edge cases and boundary conditions, acceptance criteria for each component, regression risk areas, data migration test plan. Produce a test plan, not an implementation plan.

### `cost-estimator`
Effort sizing, dependency risks, timeline, resource needs.

> You are a technical project estimator. Focus on: effort estimates for each major component (in t-shirt sizes or story points), dependency chains and critical path, risk factors that could blow up the timeline, resource requirements (people, infrastructure, third-party services), suggested milestones. Be realistic, not optimistic.

### `devils-advocate`
What could go wrong, why this might fail, hidden assumptions, alternatives not considered.

> You are the devil's advocate. Your job is to poke holes in this plan. Focus on: hidden assumptions that might be wrong, failure modes nobody mentioned, scaling bottlenecks, maintenance burden, simpler alternatives that weren't considered, reasons this project might fail. Be constructive but ruthless.

## CLI Interface

```bash
# Current (unchanged) — general role on all models
pcl plan "Build a user dashboard"

# Single role applied to all models
pcl plan "Build a user dashboard" --role security

# Per-model roles
pcl plan "Build a user dashboard" \
  --planner claude-opus:architect \
  --planner gpt-5.4:security \
  --planner gemini-2.5-pro:product

# Same model, multiple roles
pcl plan "Build a user dashboard" \
  --planner claude-sonnet:product \
  --planner claude-sonnet:architect \
  --planner claude-sonnet:security

# All roles, spread across models
pcl plan "Build a user dashboard" --roles all
# 8 roles, 3 models → general on all (3) + 7 specialized spread (7) = 10 runs

# List available roles
pcl roles list
```

### Flag exclusivity
`--role`, `--roles`, and `--planner` are **mutually exclusive**. Same rule as rcl — hard error if combined.

## Dispatch Model

Mirrors rcl: `general` runs on **every** model. Specialized roles spread via shuffled round-robin.

```
--roles all with 3 models, 8 roles:

  general runs on ALL models:                                3 runs
  7 specialized roles spread:                                7 runs
                                                            ──
  Total:                                                    10 runs

  claude  → general + [architect, qa, devils-advocate]
  gpt     → general + [product, devops]
  gemini  → general + [security, cost-estimator]
```

## Semantic Consensus

### The Problem

rcl deduplicates by file + line + Jaccard word overlap. Plans don't have file/line locations. Need semantic matching.

### The Solution: Embedding-based dedup

1. **Extract steps** — each planner produces a list of plan steps with title + description
2. **Embed** — run each step through `text-embedding-3-small` (fast, cheap, good quality)
3. **Cluster** — cosine similarity > 0.82 threshold = same step
4. **Merge** — combine descriptions from all planners who proposed the same step
5. **Score** — consensus = how many planners (across models AND roles) proposed it

### Gray zone handling

For similarity scores between 0.75–0.82 (borderline), use an LLM call to determine: "Are these two plan steps describing the same thing?"

### Conflict detection

When two planners propose **contradictory** steps at the same stage:
- Architect: "Use a monolithic architecture"
- DevOps: "Deploy as microservices"

Flag as a **decision point** — don't merge, don't pick a winner. Show both and let the human decide.

## Consensus Scoring

Same three dimensions as rcl, adapted for planning:

### Diversity Score
How diverse are the planners who proposed this step?
```
diversity = (unique_models / total_models) × 0.5 + (unique_roles / total_roles) × 0.5
```

### Relevance Score
Was the planner's role relevant to this step?
- Security planner proposing an auth step → expected (weight 0.5)
- Product planner proposing an auth step → surprising, higher signal (weight 1.0)

### Isolation Score
Did planners whose role covers this area all include it?
- All planners with relevant roles proposed it → strong (1.0)
- Only 1 of 3 relevant planners proposed it → weak (0.33)

### Confidence levels

| Confidence | Meaning |
|---|---|
| 🔴 Core | Every perspective agrees this is essential |
| 🟠 Important | Strong cross-role agreement |
| 🟡 Recommended | Multiple planners include it |
| 🔵 Suggested | Single perspective flagged it |
| ⚪ Consider | Role-specific addition |

## Output

```
📋 PLAN: Build a User Dashboard

═══ 🔴 CORE STEPS (cross-role consensus) ════════════════════

1. Design dashboard data model and API endpoints
   📐 architect (claude) — "Schema: users, widgets, layouts..."
   📦 product (gpt) — "API needs: /dashboard, /widgets, /preferences..."
   🔒 security (gemini) — "Row-level security on dashboard data..."
   Consensus: 3 roles, 3 models → Core

2. Implement authentication and authorization
   🔒 security (gemini) — "OAuth2 + RBAC, admin vs viewer roles..."
   📐 architect (claude) — "Auth middleware in API gateway..."
   📦 product (gpt) — "Login flow with SSO support..."
   Consensus: 3 roles, 3 models → Core

═══ 🟠 IMPORTANT ═════════════════════════════════════════════

3. Build widget rendering engine
   📐 architect (claude) — "React component tree, lazy loading..."
   📦 product (gpt) — "Drag-and-drop widget placement..."
   Consensus: 2 roles, 2 models → Important

═══ ⚠️ DECISION POINTS ══════════════════════════════════════

4. Deployment architecture
   📐 architect (claude) — "Server-side rendering for initial load"
   🚀 devops (gpt) — "Static export + CDN, API separate"
   → Conflicting approaches. Discuss before proceeding.

═══ 🔵 ROLE-SPECIFIC ADDITIONS ══════════════════════════════

5. Load testing plan (QA only)
   🧪 qa (claude) — "Simulate 1000 concurrent dashboard loads..."

6. Cost projection (cost-estimator only)
   💰 cost-estimator (gemini) — "3 sprints, 2 FE + 1 BE + 0.5 DevOps..."

7. What could go wrong (devil's advocate only)
   😈 devils-advocate (claude) — "Widget state sync will be harder than expected..."
```

## Implementation Plan

1. **Role schema + built-in definitions** — mirror rcl's approach
2. **Dispatch update** — general on all models, specialized spread
3. **CLI flags** — `--role`, `--roles`, `--planner`, mutually exclusive
4. **Embedding-based dedup** — OpenAI embeddings, 0.82 threshold, LLM fallback
5. **Consensus scoring** — diversity + relevance + isolation (same as rcl v2)
6. **Conflict detection** — flag contradictory steps as decision points
7. **Output formatting** — role attribution with emoji, confidence tiers
8. **Tests** — role assignment, semantic matching, conflict detection

## Open Questions

1. **Embedding provider** — hardcode OpenAI embeddings, or support multiple? Start with OpenAI, add config later.

2. **Step structure** — should roles output free-form text or structured JSON steps? Structured is better for dedup but harder to prompt for. Start with structured (title + description + effort + dependencies).

3. **Role interactions** — should the devil's advocate see OTHER roles' outputs and critique them? Or run independently like rcl? Independent is simpler and avoids prompt injection across roles. Start independent.

4. **Plan format** — should the final merged plan be a flat list or preserve the original plan structure (phases, milestones)? Preserve structure from the general role, annotate with role-specific additions.
