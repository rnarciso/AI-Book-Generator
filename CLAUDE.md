# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based AI-powered multi-agent book generation system. The application generates complete books from a single theme using a sophisticated workflow with four specialized AI agents, each with configurable primary and fallback models.

## Architecture

The system uses a pure HTML/CSS/JavaScript frontend with no build process or package.json. The main files are:

- `index.html` - Main application interface with collapsible sections for configuration
- `script.js` - Core application logic implementing the multi-agent workflow
- `styles.css` - Bootstrap-based styling with custom CSS
- `.kilocode/mcp.json` - MCP server configuration (currently empty)

### Multi-Agent Architecture

The book generation workflow uses four distinct AI agents:

1. **Planner Agent** (`script.js:197-212`)
   - Designs book structure and chapter list
   - Creates detailed paragraph-by-paragraph blueprints
   - Generates JSON-formatted paragraph specifications with `ideia_central` and `palavras_alvo`

2. **Writer Agent** (`script.js:197-212`)
   - Generates initial paragraph content based on blueprints
   - Refines content based on critic feedback and word count requirements
   - Uses contextual summaries to maintain consistency

3. **Critic Agent** (`script.js:197-212`)
   - Evaluates generated content against intended purpose
   - Provides actionable feedback for content improvement
   - Responds with "OK" for approved content or specific feedback

4. **Summarizer Agent** (`script.js:197-212`)
   - Maintains running summary of book content for context
   - Updates contextual information after each chapter

### Workflow Phases

The generation process follows a structured 4-phase workflow:

1. **Phase 1: Planning** (`script.js:270-312`)
   - Generate chapter list with user approval checkpoint
   - Create detailed paragraph blueprints with user approval checkpoint

2. **Phase 2-3: Generation and Consolidation** (`script.js:320-400`)
   - Generate paragraphs using Writer agent
   - Iterative refinement loop with size and content validation
   - Update contextual summary using Summarizer agent

3. **Phase 4: Conclusion** (final export functionality)

### Key Features

- **Resilient Fallback System**: Each agent supports primary + fallback model configuration
- **User Control Points**: Generation pauses for user approval of chapter list and blueprints
- **Iterative Refinement**: Paragraphs go through validation cycles for word count and content quality
- **Real-time Updates**: Generated content appears in the UI as paragraphs are completed
- **Export Functionality**: Converts HTML output to plain text file

## Development Workflow

Since this is a pure client-side application with no build process:

1. **Local Development**: Open `index.html` directly in a web browser
2. **Testing**: Manual testing through the browser interface
3. **No Package Manager**: No npm, yarn, or other package management needed
4. **No Build Process**: Direct file editing and browser refresh

## Configuration

- **API Configuration**: Set endpoint and API key in the UI (defaults to OpenRouter)
- **Agent Models**: Configure primary and fallback models for each agent through combo boxes
- **Generation Parameters**: Set book theme, target word count, and max retry attempts
- **MCP Servers**: Configured via `.kilocode/mcp.json` (currently empty)

## Code Organization

- **DOM Management**: Extensive DOM element references at the top of `script.js`
- **UI Components**: Custom combo box and multi-select implementations
- **Agent Execution**: Centralized `executeAgent()` function with fallback handling
- **Approval Flow**: Promise-based user approval system for workflow control points
- **Error Handling**: Comprehensive try-catch blocks with user-friendly status logging

## Language Support

The interface is in Portuguese (Brazilian), with all UI text, prompts, and status messages in PT-BR.