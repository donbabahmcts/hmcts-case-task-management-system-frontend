# HMCTS Case Task Management System - Frontend

This repository contains the frontend web application for the HMCTS case task management system. Built with Node.js, Express, TypeScript, and the GOV.UK Design System, this frontend provides a secure, accessible, and user-friendly interface for managing cases tasks through a request-based client architecture that communicates with the backend REST API.

**Purpose**: This application delivers an intuitive web interface for case managers to authenticate securely, manage case tasks, and interact with the case task management system while maintaining compliance with government digital service standards and accessibility requirements (WCAG 2.1 Level AA).

## Table of Contents

- [Overview & Software Architecture](#overview--software-architecture)
  - [Architecture Style](#architecture-style)
  - [Key UI Principles](#key-ui-principles)
  - [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running Locally](#running-locally)
  - [Building for Production](#building-for-production)
  - [Process Management](#process-management)
- [Repository Structure](#repository-structure)
  - [Directory Organization](#directory-organization)
  - [Key Components](#key-components)
- [Request-Based Client Architecture](#request-based-client-architecture)
  - [Server-Side Rendering with Nunjucks](#server-side-rendering-with-nunjucks)
  - [Backend API Integration](#backend-api-integration)
  - [Session Management](#session-management)
- [Security](#security)
  - [Authentication & Authorization Flow](#authentication--authorization-flow)
  - [XSS Protection](#xss-protection)
  - [CSRF Protection](#csrf-protection)
  - [Security Best Practices](#security-best-practices)
- [Quality Assurance](#quality-assurance)
  - [Testing Strategy](#testing-strategy)
  - [Code Quality Tools](#code-quality-tools)
  - [Continuous Integration](#continuous-integration)
- [Accessibility](#accessibility)
  - [WCAG 2.1 Level AA Compliance](#wcag-21-level-aa-compliance)
  - [Automated Testing](#automated-testing)
  - [Testing Guide](#testing-guide)
- [Additional Documentation](#additional-documentation)

---

## Overview & Software Architecture

### Architecture Style

This frontend implements a **Request-Based Server-Side Rendering (SSR) Architecture** with **Clean Layered Design**:

```
┌─────────────────────────────────────────┐
│      Presentation Layer (Views)         │
│        Nunjucks Templates               │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│     Controller Layer (Routes)           │
│   Express Route Handlers                │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      Service Layer (Business Logic)     │
│   AuthenticationService, etc.           │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│    Integration Layer (Backend API)      │
│         Axios HTTP Client               │
└─────────────────────────────────────────┘
```

1. **Server-Side Rendering**: HTML generated on server, better SEO and initial load performance
2. **Progressive Enhancement**: Works without JavaScript, enhanced with client-side scripts
3. **Security**: Sensitive logic runs on server, tokens never exposed to client
4. **Accessibility**: Server-rendered HTML is more accessible to assistive technologies
5. **GOV.UK Compliance**: Aligns with government digital service standards

### Key UI Principles

**GOV.UK Design System**

- Component-based UI using proven government design patterns
- WCAG 2.1 Level AA accessibility compliance (validated by automated tests)
- Mobile-first responsive design
- Consistent typography, spacing, and color schemes

**Accessibility Compliance**

This application maintains **WCAG 2.1 Level AA** compliance through:

- ✅ **Automated Testing**: axe-core validates all pages against WCAG 2.1 AA standards
- ✅ **Color Contrast**: Minimum 4.5:1 for normal text, 3:1 for large text
- ✅ **Keyboard Navigation**: All functionality accessible without a mouse
- ✅ **Screen Reader Support**: Semantic HTML, ARIA labels, descriptive alt text
- ✅ **Form Accessibility**: Proper labels, error messages, required field indicators
- ✅ **Focus Indicators**: Visible focus states for all interactive elements
- ✅ **Responsive Design**: Accessible on mobile, tablet, and desktop
- ✅ **GOV.UK Design System**: Uses proven accessible components

Run `yarn test:a11y` to validate compliance (see [Quality Assurance](#quality-assurance) section).

**Architecture Principles**

- **Separation of Concerns**: Routes, services, middleware, and views are clearly separated
- **Security First**: Authentication, CSRF protection, XSS prevention, rate limiting
- **Test-Driven Development**: Comprehensive unit, integration, functional, and accessibility tests
- **Error Handling**: Graceful error pages with appropriate HTTP status codes
- **Logging**: Structured logging for monitoring and debugging

### Technology Stack

| Category               | Technology        | Version |
| ---------------------- | ----------------- | ------- |
| **Runtime**            | Node.js           | 18+     |
| **Language**           | TypeScript        | 5.1.6   |
| **Framework**          | Express           | 4.18.2  |
| **Template Engine**    | Nunjucks          | 3.2.4   |
| **Design System**      | GOV.UK Frontend   | 4.8.0   |
| **HTTP Client**        | Axios             | 1.13.2  |
| **Session Management** | Express Session   | 1.18.2  |
| **Security**           | Helmet, CSRF, CSP | Latest  |
| **Build Tool**         | Webpack           | 5.x     |
| **Testing**            | Jest, CodeceptJS  | Latest  |
| **Code Quality**       | ESLint, Prettier  | Latest  |
| **Package Manager**    | Yarn              | Latest  |

---

## Getting Started

### Prerequisites

- **Node.js 18+** (LTS recommended)
- **Yarn** package manager
- **Backend API** running at `http://localhost:4000` (see backend repository)

### Installation

```bash
# Clone the repository
git clone https://github.com/donbabahmcts/hmcts-case-task-management-system-frontend.git
cd hmcts-case-task-management-system-frontend

# Install dependencies
yarn install

# Build assets
yarn build
```

### Running Locally

**IMPORTANT**: Always use the provided scripts to avoid port conflicts.

```bash
# Start frontend (recommended)
./scripts/start-frontend.sh

# Or manually
yarn install
yarn webpack
yarn start:dev
```

The application will be available at:

- **Development**: https://localhost:3100
- **Backend API**: http://localhost:4000 (must be running)

### Building for Production

```bash
# Build optimized production assets
yarn build:prod

# Start in production mode
NODE_ENV=production yarn start
```

**Production Build Features:**

- Minified JavaScript and CSS
- Optimized assets with content hashing
- Source maps for debugging
- Code splitting for faster load times

### Process Management

**Stopping the Application**

```bash
# Stop frontend (cleans up all processes)
./scripts/stop-frontend.sh
```

---

## Repository Structure

### Directory Organization

```
src/main/
├── app.ts                           # Express application setup
├── server.ts                        # Server entry point
├── development.ts                   # Development-specific configuration
│
├── assets/                          # Static assets
│   ├── scss/                        # SCSS stylesheets
│   └── js/                          # Client-side JavaScript
│
├── config/                          # Configuration files
│   └── validateEnvironment.ts       # Environment variable validation
│
├── middleware/                      # Express middleware
│   ├── auth.ts                      # Authentication guards
│   └── security.ts                  # Security utilities (XSS, logging)
│
├── modules/                         # Core modules
│   └── nunjucks/                    # Nunjucks template configuration
│
├── routes/                          # Route handlers (Controllers)
│   ├── auth.ts                      # Authentication routes
│   ├── home.ts                      # Home page route
│   └── tasks.ts                     # Task management routes
│
├── services/                        # Business logic layer
│   └── authenticationService.ts     # Authentication API integration
│
├── types/                           # TypeScript type definitions
│   ├── express-session.d.ts         # Session type extensions
│   └── govuk-frontend.d.ts          # GOV.UK Frontend types
│
├── utils/                           # Utility functions
│   └── logger.ts                    # Structured logging
│
├── views/                           # Nunjucks templates
│   ├── template.njk                 # Base layout template
│   ├── home.njk                     # Home page
│   ├── error.njk                    # Error page
│   ├── not-found.njk                # 404 page
│   ├── auth/                        # Authentication views
│   │   ├── login.njk                # Email validation (Step 1)
│   │   └── password.njk             # Password entry (Step 2)
│   ├── tasks/                       # Task views
│   │   ├── list.njk                 # Task list display
│   │   ├── manage.njk               # Create/manage task form
│   │   └── success.njk              # Task creation success
│   ├── govuk/                       # GOV.UK component imports
│   ├── macros/                      # Reusable template macros
│   └── webpack/                     # Webpack-specific templates
│
└── public/                          # Compiled assets (generated)
    ├── main-dev.css
    ├── main-dev.js
    └── assets/

src/test/
├── unit/                            # Unit tests
│   ├── authenticationService.test.ts
│   ├── authMiddleware.test.ts
│   ├── security.test.ts
│   └── logger.test.ts
├── integration/                     # Integration tests
│   └── app.test.ts
├── routes/                          # Route tests
│   ├── home.ts
│   └── tasks.test.ts
└── functional/                      # End-to-end tests
    └── features/                    # CodeceptJS scenarios
```

### Key Components

**1. Express Application (`app.ts`)**

- Configures Express server with security middleware (Helmet, CSRF, rate limiting)
- Sets up session management
- Registers routes and error handlers

**2. Authentication Service (`authenticationService.ts`)**

- Communicates with backend `/api/auth/*` endpoints
- Implements two-step authentication workflow
- Handles API errors and retries

**3. Authentication Middleware (`auth.ts`)**

- `requireAuth`: Protects routes requiring authentication
- `redirectIfAuthenticated`: Redirects logged-in users from login pages
- `clearAuth`: Clears session on logout

**4. Security Middleware (`security.ts`)**

- `sanitizeInput`: Removes potentially dangerous HTML/JavaScript
- `requestLogger`: Logs all HTTP requests
- `validateContentType`: Validates request content types

**5. Nunjucks Templates (`views/`)**

- Server-side rendered HTML using GOV.UK Design System components
- Reusable macros for forms, buttons, error messages
- Progressive enhancement with client-side JavaScript

---

## Request-Based Client Architecture

### Server-Side Rendering with Nunjucks

**How It Works:**

1. User requests a page (e.g., `/tasks`)
2. Express route handler processes the request
3. Service layer fetches data from backend API
4. Route handler passes data to Nunjucks template
5. Nunjucks renders HTML on server
6. Complete HTML page sent to browser

**API Endpoints Used:**

| Endpoint                   | Method | Purpose                      |
| -------------------------- | ------ | ---------------------------- |
| `/api/auth/validate-email` | POST   | Validate email (Step 1)      |
| `/api/auth/authenticate`   | POST   | Login with password (Step 2) |
| `/api/auth/logout`         | POST   | Invalidate JWT token         |
| `/api/tasks`               | GET    | Fetch user tasks             |
| `/api/tasks`               | POST   | Create new task              |

### Session Management

**Express Session with Secure Cookies:**

## Security

### Authentication & Authorization Flow

**Two-Step Authentication Process:**

```
┌──────────┐                ┌──────────┐                ┌──────────┐
│  User    │                │ Frontend │                │ Backend  │
└────┬─────┘                └────┬─────┘                └────┬─────┘
     │                           │                           │
     │ 1. GET /auth/login        │                           │
     ├──────────────────────────>│                           │
     │                           │                           │
     │ 2. Show email form        │                           │
     │<──────────────────────────┤                           │
     │                           │                           │
     │ 3. POST /auth/validate-email                          │
     │    { email }              │                           │
     ├──────────────────────────>│ 4. POST /api/auth/validate-email
     │                           ├──────────────────────────>│
     │                           │                           │
     │                           │ 5. { emailValidated: true }│
     │                           │<──────────────────────────┤
     │                           │ 6. Store email in session │
     │                           │                           │
     │ 7. Redirect to            │                           │
     │    /auth/password         │                           │
     │<──────────────────────────┤                           │
     │                           │                           │
     │ 8. POST /auth/authenticate│                           │
     │    { email, password }    │                           │
     ├──────────────────────────>│ 9. POST /api/auth/authenticate
     │                           ├──────────────────────────>│
     │                           │                           │
     │                           │ 10. { token: "JWT..." }   │
     │                           │<──────────────────────────┤
     │                           │ 11. Store token in session│
     │                           │                           │
     │ 12. Redirect to /tasks    │                           │
     │<──────────────────────────┤                           │
     │                           │                           │
     │ 13. GET /tasks            │                           │
     ├──────────────────────────>│ 14. GET /api/tasks        │
     │                           │     Header: Authorization:│
     │                           │     Bearer <JWT>          │
     │                           ├──────────────────────────>│
     │                           │                           │
     │                           │ 15. Return tasks          │
     │                           │<──────────────────────────┤
     │                           │                           │
     │ 16. Render tasks page     │                           │
     │<──────────────────────────┤                           │
```

**Authentication Middleware:**

- Checks requests for a session token
- Redirects to the login page if no token is found
- Allows the request to continue if the user is authenticated

**Protected Routes:**

- Route access requires a valid session token
- Authentication middleware (requireAuth) runs before the route handler
- Blocks unauthenticated users and redirects them to login
- Allows authenticated users to access and continue to the protected task actions

### XSS Protection

Cross-Site Scripting (XSS) protection prevents malicious scripts from being injected into the application through user input.

**1. Input Sanitization**

All user input is cleaned by removing dangerous characters like angle brackets, JavaScript protocol handlers, and event handlers before processing. This prevents attackers from injecting malicious HTML or JavaScript into the application.

**2. Content Security Policy (CSP)**

The application uses strict Content Security Policy headers to control which resources can be loaded and executed. Scripts and styles can only come from the same origin or be explicitly allowed, iframes and plugins are blocked entirely, and all connections are restricted to prevent unauthorized data leakage.

**3. Nunjucks Auto-Escaping**

The Nunjucks template engine automatically escapes all HTML characters in user-provided data by default, converting potentially dangerous characters into safe display text. This prevents XSS attacks even if malicious content reaches the templates.

**4. HTTP-Only Cookies**

Session cookies are marked as HTTP-only, meaning they cannot be accessed by client-side JavaScript. This prevents XSS attacks from stealing authentication tokens. Cookies are also restricted to HTTPS connections and use strict same-site policies.

### CSRF Protection

Cross-Site Request Forgery (CSRF) protection prevents attackers from tricking authenticated users into performing unwanted actions.

**CSRF Token Implementation**

Every form includes a unique, secret token that must be submitted with POST requests. The server validates this token before processing any state-changing operations. Tokens are stored in the session (not cookies) and automatically included in all server-rendered forms, making them transparent to legitimate users but impossible for attackers to forge.

### Security Best Practices

**1. Rate Limiting**

The application limits users to 100 requests per 15-minute window from any single IP address. This prevents brute-force attacks on login forms, denial-of-service attacks, and automated abuse of the API.

**2. Security Headers (Helmet)**

Multiple security headers are automatically added to all responses:

- Prevents browsers from MIME-sniffing responses
- Blocks the application from being embedded in iframes (clickjacking protection)
- Enables browser XSS filters
- Enforces HTTPS connections with HSTS headers

**3. Secure Session Configuration**

Sessions are configured with multiple security layers: secret keys are stored in environment variables (never in code), cookies cannot be accessed by JavaScript, HTTPS is required in production, strict same-site policies prevent CSRF attacks, and sessions expire after 1 hour of inactivity.

**4. Input Validation**

All incoming data is validated using express-validator before being processed. Field length limits prevent buffer overflow attacks, required fields are enforced, and data types are checked. Invalid input is rejected with clear error messages before it can reach the database or backend services.

---

## Quality Assurance

### Testing Strategy

**Test Pyramid:**

```
        /\
       /  \  Unit Tests (70%)
      /────\
     /      \ Integration Tests (20%)
    /────────\
   /          \ Functional/E2E Tests (10%)
  /────────────\
```

**1. Unit Tests (`src/test/unit/`)**

Test individual functions and classes in isolation.

**2. Integration Tests (`src/test/integration/`)**

Test interaction between components.

**3. Route Tests (`src/test/routes/`)**

Test HTTP endpoints:

**Running Tests:**

```bash
# Run all unit tests
yarn test

# Run with coverage
yarn test:coverage

# Run route tests
yarn test:routes

# Run integration tests
yarn test:integration

# Run accessibility tests (WCAG 2.1 AA)
yarn test:a11y

# Run all tests (CI)
yarn cichecks
```

**Coverage Targets:**

- Line coverage: >80%
- Branch coverage: >70%
- Function coverage: >80%

**4. Accessibility Tests (`src/test/a11y/`)**

Automated WCAG 2.1 Level AA compliance testing using axe-core.

```bash
# Run accessibility tests
yarn test:a11y
```

**What's Tested:**

- ✅ **WCAG 2.1 AA Compliance**: All pages tested against WCAG 2.1 Level AA standards
- ✅ **Color Contrast**: Text meets 4.5:1 ratio (normal), 3:1 (large text)
- ✅ **Keyboard Navigation**: All interactive elements accessible via keyboard
- ✅ **Screen Reader Compatibility**: Proper ARIA labels, alt text, semantic HTML
- ✅ **Form Accessibility**: Labels, required field indicators, error messages
- ✅ **Focus Management**: Visible focus indicators, skip links, logical tab order
- ✅ **Responsive Design**: Mobile, tablet, desktop viewports tested
- ✅ **Semantic HTML**: Proper heading hierarchy, landmarks, table structure
- ✅ **Language Declaration**: HTML lang attribute for assistive technologies
- ✅ **Page Titles**: Descriptive titles for all pages

**Pages Covered:**

- Public pages: Home, Login, 404
- Protected pages: Tasks list, Create/manage task, Success confirmation
- Error handling: Form validation, error pages

**Example Test Output:**

```bash
PASS src/test/a11y/pages.test.ts
  WCAG 2.1 Level AA Compliance Tests
    Public Pages
      ✓ Home page should have no WCAG 2.1 AA violations (2341ms)
      ✓ Login page (Step 1 - Email) should have no WCAG 2.1 AA violations (1823ms)
      ✓ 404 Not Found page should have no WCAG 2.1 AA violations (1456ms)
    Keyboard Navigation
      ✓ Home page should be fully keyboard navigable (892ms)
      ✓ Login form should be keyboard accessible (1124ms)
    Color Contrast
      ✓ All pages should pass color contrast checks (3245ms)

Test Suites: 2 passed, 2 total
Tests:       34 passed, 34 total
```

**Interpreting Results:**

If violations are found, the test output includes:

- **Violation ID**: The specific WCAG criterion violated
- **Impact**: Critical, serious, moderate, or minor
- **Description**: What the violation is
- **Help URL**: Link to detailed remediation guidance
- **HTML**: The specific element causing the violation

**Example Violation:**

```
❌ Accessibility violations found on Login Page:

  color-contrast: Elements must have sufficient color contrast
  Impact: serious
  Help: https://dequeuniversity.com/rules/axe/4.7/color-contrast
    - <label class="low-contrast">Email address</label>
```

**Fixing Violations:**

1. Review the violation details and help URL
2. Update the component or template causing the issue
3. Re-run tests to verify the fix
4. Commit changes with reference to WCAG criterion

**Best Practices:**

- Run accessibility tests **before** every release
- Include `yarn test:a11y` in your CI/CD pipeline
- Fix **critical** and **serious** violations immediately
- Document any intentional deviations with justification
- Test with real assistive technologies (NVDA, JAWS, VoiceOver) periodically

### Code Quality Tools

**1. ESLint (JavaScript/TypeScript Linting)**

```bash
# Run linter
yarn lint

# Auto-fix issues
yarn lint:fix
```

**2. Prettier (Code Formatting)**

```bash
# Check formatting
yarn prettier --check .

# Auto-format
yarn prettier --write .
```

**Configuration (`.prettierrc.json`):**

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 120,
  "tabWidth": 2
}
```

**3. Stylelint (CSS/SCSS Linting)**

```bash
# Lint SCSS files
yarn stylelint "**/*.scss"
```

**4. Husky (Git Hooks)**

Pre-commit hook runs linting and formatting:

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

yarn lint
yarn prettier --check .
```

### Running All Checks Together

**Comprehensive Quality & Test Suite:**

Run all quality checks and tests in a single command:

```bash
# Run everything (linting, formatting, tests, build, type-checking)
yarn test:all

# Or using the script directly
./scripts/run-all-checks.sh
```

This comprehensive script runs:

- ✅ ESLint (JavaScript/TypeScript linting)
- ✅ Stylelint (CSS/SCSS linting)
- ✅ Prettier (code formatting check)
- ✅ TypeScript type checking
- ✅ Webpack build
- ✅ Unit tests with coverage
- ✅ Route tests
- ✅ Accessibility tests (WCAG 2.1 AA)
- ✅ Functional tests (if app is running)
- ✅ Security audit

**Quick quality checks:**

```bash
# Check code quality (linting + type checking)
yarn quality:check

# Auto-fix code quality issues
yarn quality:fix
```

See [Complete Quality Checks Guide](docs/COMPLETE_QUALITY_CHECKS.md) for detailed documentation.

### Continuous Integration

**GitHub Actions Workflow (`.github/workflows/checks.yml`):**

```yaml
name: CI Checks

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: yarn install
      - run: yarn lint

  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: yarn install
      - run: yarn build
      - run: yarn test:coverage

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: yarn install
      - run: yarn build:prod
```

---

## Accessibility

### WCAG 2.1 Level AA Compliance

This application maintains **WCAG 2.1 Level AA** compliance to ensure it's accessible to all users, including those using assistive technologies.

**How We Ensure Compliance:**

1. **Automated Testing**: Every page is tested against WCAG 2.1 AA standards using axe-core
2. **GOV.UK Design System**: All components are pre-tested for accessibility
3. **CI/CD Validation**: Accessibility tests run on every pull request
4. **Manual Testing**: Regular testing with screen readers and keyboard navigation

### Automated Testing

Run accessibility tests to validate WCAG 2.1 Level AA compliance:

```bash
# Run all accessibility tests
yarn test:a11y

# Example output:
# ✓ Home page should have no WCAG 2.1 AA violations
# ✓ Login page should have no WCAG 2.1 AA violations
# ✓ All pages pass color contrast checks
# ✓ Forms have proper labels and error messages
# ✓ Keyboard navigation works correctly
```

**What Gets Tested:**

- ✅ **Color Contrast**: Text meets 4.5:1 ratio (normal), 3:1 (large text)
- ✅ **Keyboard Navigation**: All functionality accessible without mouse
- ✅ **Screen Readers**: Semantic HTML, ARIA labels, alt text
- ✅ **Form Accessibility**: Labels, required fields, error messages
- ✅ **Focus Management**: Visible focus indicators, skip links
- ✅ **Responsive Design**: Mobile, tablet, desktop viewports
- ✅ **Page Structure**: Heading hierarchy, landmarks, tables
- ✅ **Language**: HTML lang attribute for assistive tech

**Pages Covered:**

- Public: Home, Login, 404
- Protected: Tasks list, Create/manage task, Success
- Errors: Form validation, server errors

### Testing Guide

For comprehensive accessibility testing guidance, see:

📖 **[Accessibility Testing Guide](docs/ACCESSIBILITY_TESTING.md)**

Includes:

- Running and interpreting tests
- Fixing common violations
- Manual testing checklist
- Screen reader testing
- GOV.UK Design System usage
- WCAG 2.1 guidelines

**Quick Fix Examples:**

```html
<!-- ❌ Poor contrast -->
<p style="color: #767676;">Low contrast text</p>

<!-- ✅ GOV.UK compliant -->
<p class="govuk-body">Proper contrast text</p>

<!-- ❌ Missing label -->
<input type="email" id="email" name="email" />

<!-- ✅ Accessible form -->
<label class="govuk-label" for="email">Email address</label>
<input class="govuk-input" type="email" id="email" name="email" />
```

**Compliance Verification:**

```bash
# Run in CI/CD
yarn cichecks  # Includes accessibility tests

# Local development
yarn test:a11y --watch
```

---

## Additional Documentation

For more detailed information, refer to these documents:

- **[Complete Quality Checks Guide](docs/COMPLETE_QUALITY_CHECKS.md)** - Comprehensive guide for running all tests, linting, formatting, and quality checks in one command
- **[Accessibility Testing Guide](docs/ACCESSIBILITY_TESTING.md)** - Comprehensive guide for running and interpreting accessibility tests, fixing violations, and manual testing procedures
- **[Accessibility Test Results](ACCESSIBILITY_TEST_RESULTS.md)** - Latest test results showing WCAG 2.1 Level AA compliance status
- **[Authentication Implementation](AUTHENTICATION_IMPLEMENTATION.md)** - Detailed guide on two-step authentication flow and implementation
- **[WCAG Compliance Report](COMPLIANCE.md)** - Full compliance matrix for WCAG 2.1 Level AA standards
- **[Process Management](PROCESS_MANAGEMENT.md)** - Guide for managing frontend processes and troubleshooting
- **[Scripts Documentation](scripts/README.md)** - Detailed documentation for start/stop scripts

---

## Quick Start

**IMPORTANT**: Always use the provided scripts instead of running `yarn dev` directly to avoid port conflicts.

### Starting the Application

```bash
# Start frontend (recommended)
./scripts/start-frontend.sh

# Or manually
yarn install
yarn webpack
yarn start:dev
```

### Stopping the Application

```bash
# Stop frontend (cleans up all processes)
./scripts/stop-frontend.sh
```
