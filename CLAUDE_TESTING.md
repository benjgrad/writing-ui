# Autonomous AI Testing with Claude Code

This project includes an autonomous AI testing system that allows Claude to test the UI, respond intelligently to coaching prompts, and capture console logs.

## Quick Start

1. **Start the development server:**
   ```bash
   SKIP_AUTH=true npm run dev
   ```

2. **Run the AI tests:**
   ```bash
   npm run test:ai          # Run with visible browser
   npm run test:ai:headless # Run in headless mode
   ```

## Setup

### Prerequisites

- Node.js 18+
- Puppeteer (automatically installed)
- Anthropic API key (for AI-generated responses)

### Install Dependencies

```bash
npm install puppeteer ts-node --save-dev
```

### Environment Variables

Create a `.env.local` file:

```env
ANTHROPIC_API_KEY=your_api_key_here

# Test user credentials (create this user in Supabase first)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123
```

### Test User Setup

The AI testing system requires a test user to be created in Supabase for authenticated testing.

**Option 1: Create via Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to Authentication > Users
3. Click "Add User"
4. Enter email: `test@example.com` and password: `testpassword123`
5. Confirm the user (or disable email confirmation in Auth settings)

**Option 2: Create via Signup Flow**
1. Start the dev server: `npm run dev`
2. Navigate to `http://localhost:3000/signup`
3. Sign up with email `test@example.com` and password `testpassword123`

**Option 3: Use SQL (in Supabase SQL Editor)**
```sql
-- Note: This creates an unconfirmed user. Use dashboard for confirmed users.
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  'test@example.com',
  crypt('testpassword123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);
```

## MCP Server Configuration

The project includes MCP (Model Context Protocol) configuration for Claude Code integration at `.claude/mcp.json`:

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/puppeteer-mcp-server"],
      "env": {
        "PUPPETEER_HEADLESS": "false"
      }
    }
  }
}
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run test:ai` | Run all AI tests with visible browser |
| `npm run test:ai:headed` | Explicitly run with visible browser |
| `npm run test:ai:headless` | Run in headless mode (CI-friendly) |
| `npm run chrome:debug` | Start Chrome with remote debugging |

## Test Runner Options

```bash
npx ts-node tests/ai-agent/run-tests.ts [options]

Options:
  -h, --help           Show help
  -s, --suite NAME     Run only matching suites
  -t, --scenario NAME  Run only matching scenarios
  --headless           Run without browser window
  --headed             Run with visible browser
  -q, --quiet          Reduce output
```

### Examples

```bash
# Run only coaching tests
npm run test:ai -- --suite coaching

# Run only happy path scenarios
npm run test:ai -- -t "happy path"

# Run headless for CI
npm run test:ai:headless
```

## Test Suites

### Goal Coaching Tests

Tests the 6-stage coaching conversation flow:

1. **Happy Path (AI)** - Uses Claude API for natural responses
2. **Happy Path (Predefined)** - Deterministic with predefined responses
3. **All Stages Visited** - Verifies correct stage progression
4. **Cancel Mid-Conversation** - Tests modal cancellation
5. **Goal Appears After Creation** - Verifies goal persistence
6. **Randomized Responses** - Uses variety of predefined responses
7. **No Console Errors** - Checks for JavaScript errors

### General UI Tests

1. **Navigation Without Errors** - Navigate all pages
2. **Dashboard Loads** - Verify dashboard elements
3. **Goals Page Loads** - Check empty state or goal list
4. **Writing Editor Input** - Test keyboard input
5. **404 Page Handling** - Verify error page
6. **Page Load Performance** - Check load times
7. **Responsive Layout** - Test viewport changes

## How It Works

### Autonomous Goal Coaching Testing

1. Claude navigates to the goals page
2. Clicks "Add your first goal" button
3. Reads the coach's message from the DOM
4. Generates an intelligent response using Claude API
5. Types and submits the response
6. Waits for the next coaching message
7. Repeats until goal creation is complete
8. Verifies no console errors occurred

### AI Response Generation

The system uses stage-specific prompts to generate appropriate responses:

- **welcome** - Shares a goal idea
- **goal_discovery** - Clarifies the specific goal
- **why_drilling** - Provides emotional motivation
- **micro_win** - Describes first small action
- **confirmation** - Affirms commitment

### Console Log Collection

All console logs are captured and saved:

- **Real-time output** with color coding:
  - 🔴 ERROR - red
  - 🟡 WARN - yellow
  - 🔵 INFO - cyan
  - ⚪ LOG - default
  - ⚫ DEBUG - gray

- **JSON file output** in `tests/logs/`:
  ```json
  {
    "collectedAt": "2024-01-07T...",
    "totalLogs": 42,
    "errorCount": 0,
    "warnCount": 2,
    "logs": [...]
  }
  ```

## Using Claude Code with Puppeteer MCP

Once MCP is configured, you can ask Claude Code to test the UI directly:

```
User: Test the goal coaching flow

Claude: I'll use Puppeteer MCP to navigate to the app and test the coaching flow.
[Navigates to http://localhost:3000/goals]
[Clicks add goal button]
[Reads coach message: "Hi! Ready to set a goal?"]
[Types: "I want to improve my focus"]
[Clicks send]
[Continues through all stages...]
[Verifies goal was created]
[Reports: No console errors, goal created successfully]
```

## Chrome Remote Debugging

For connecting to an existing Chrome session:

```bash
# Start Chrome with debugging
npm run chrome:debug

# Copy the WebSocket URL from output
# Update .claude/mcp.json with the URL
```

## File Structure

```
tests/
├── ai-agent/
│   ├── config.ts              # Test configuration & selectors
│   ├── response-generator.ts  # AI response generation
│   ├── goal-coaching-test.ts  # Main test orchestrator
│   ├── run-tests.ts           # Test runner
│   └── scenarios/
│       ├── goal-coaching.ts   # Coaching test scenarios
│       └── general-ui.ts      # UI test scenarios
├── utils/
│   ├── console-collector.ts   # Log collection
│   └── puppeteer-console-hook.ts
├── logs/                      # Console log output
└── e2e/                       # Playwright tests
```

## Troubleshooting

### Tests failing to find elements

The selectors in `tests/ai-agent/config.ts` may need updating if the UI changes. Check the actual class names in the browser dev tools.

### AI responses not generating

Ensure `ANTHROPIC_API_KEY` is set. The system falls back to predefined responses if the API is unavailable.

### Browser not opening

Try running with `--headed` flag explicitly:
```bash
npm run test:ai -- --headed
```

### Console collector not capturing logs

Make sure the page is fully loaded before interactions begin. Increase `waitAfterNavigation` in config if needed.
