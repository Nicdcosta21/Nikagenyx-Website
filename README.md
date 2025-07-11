# Nikagenyx Vision Tech - Developer Documentation

![Nikagenyx Logo](assets/Nikagenyx%20Vision%20Tech.png)

## Overview

Nikagenyx Vision Tech is a comprehensive enterprise management system featuring employee portal, attendance tracking with facial recognition, payroll processing, and administrative tools. This document provides technical guidance for developers contributing to the platform.

**Current Version:** 1.2.0 (as of 2025-07-11)

## Technology Stack

- **Frontend:** HTML5, CSS3 (Tailwind CSS), Vanilla JavaScript
- **Backend:** Netlify Functions (Serverless)
- **Database:** PostgreSQL
- **Authentication:** JWT-based session management
- **Additional Technologies:**
  - Face verification API
  - PDF document generation
  - Service workers for offline capability
  - Confetti.js for UI celebrations

## Development Setup

### Prerequisites

- Node.js v18.x or higher
- npm v9.x or higher
- Netlify CLI
- PostgreSQL database (local or cloud-hosted)
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/nikagenyx/vision-tech.git
   cd vision-tech
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your database credentials and API keys.

4. Build the CSS:
   ```bash
   npm run build
   ```

5. Start the development server:
   ```bash
   netlify dev
   ```

6. The application will be available at `http://localhost:8888`

### Running Tests

We use Jest for testing:

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Generate test coverage report
npm run test:coverage
```

## Project Structure

```
nikagenyx-vision-tech/
├── assets/
│   ├── css/                  # Generated CSS output
│   ├── js/                   # JavaScript files
│   │   ├── modules/          # JavaScript modules
│   │   ├── date-utils.js     # Date handling utilities
│   │   ├── image-optimizer.js # Image optimization utilities
│   │   └── ...
│   └── img/                  # Image assets
├── netlify/
│   └── functions/            # Netlify serverless functions
│       ├── mark_attendance.js
│       ├── get_dashboard_data.js
│       └── ...
├── tests/                    # Jest test files
├── index.html                # Main landing page
├── employee_portal.html      # Employee login page
├── employee_dashboard.html   # Employee dashboard
├── admin_dashboard.html      # Admin dashboard
├── payroll_portal.html       # Payroll management
├── face_verify_test.html     # Face verification testing
├── service-worker.js         # Service worker for offline functionality
├── tailwind.config.js        # Tailwind configuration
└── package.json              # Project dependencies and scripts
```

## Development Roadmap

### Q3 2025 (July - September)

- [ ] **Mobile Application Development**
  - Native mobile applications for iOS and Android
  - Push notifications for important alerts
  - QR code-based attendance system

- [ ] **Enhanced Analytics Dashboard**
  - Advanced data visualization components
  - Predictive attendance patterns
  - Team performance metrics

- [ ] **AI-Powered Features**
  - Automated leave recommendation system
  - Productivity pattern analysis
  - Anomaly detection in attendance patterns

### Q4 2025 (October - December)

- [ ] **Multi-Language Support**
  - Internationalization framework implementation
  - Support for 5 major languages

- [ ] **Advanced Security Features**
  - Two-factor authentication for all users
  - IP-based access restrictions
  - Detailed audit logging

- [ ] **Integration Expansion**
  - Microsoft Teams integration
  - Google Workspace connection
  - Slack notifications

### Q1 2026 (January - March)

- [ ] **Hybrid Work Model Support**
  - Work-from-home scheduling
  - Remote work productivity tracking
  - Geo-location verification options

- [ ] **Performance Review System**
  - 360-degree feedback implementation
  - Goal setting and tracking
  - Performance metrics integration with payroll

- [ ] **Advanced Document Management**
  - Document workflows with e-signatures
  - Template management system
  - Document versioning and approval flows

## Code Standards

We follow these coding standards:

1. **JavaScript:**
   - ES6+ syntax preferred
   - Module pattern for organization
   - Comprehensive error handling
   - JSDoc comments for functions

2. **HTML/CSS:**
   - Semantic HTML elements
   - Mobile-first responsive design
   - Tailwind utility classes

3. **Testing:**
   - Unit tests for all utility functions
   - Integration tests for critical user flows
   - Min. 80% code coverage for new features

## Pull Request Process

1. Create a feature branch from `develop`
2. Implement your changes with appropriate tests
3. Ensure all tests pass with `npm test`
4. Update documentation as necessary
5. Submit a PR to `develop` branch
6. Code review by at least one team member
7. Address any feedback
8. Squash commits and merge

## Troubleshooting Common Issues

### Database Connection Issues

If you encounter database connection errors:

```bash
# Check database connectivity
netlify functions:invoke check_db_connection

# Reset database connection pool
netlify functions:invoke reset_db_pool
```

### Authentication Problems

For JWT or session issues:

1. Check that your `.env` has the correct `JWT_SECRET`
2. Verify that your local time is synchronized (JWT validation depends on accurate timestamps)
3. Try clearing browser local storage

## Contact Information

- **Lead Developer:** Nikolas D'Costa (n.dcosta@nikagenyx.com)
- **Technical Support:** support@nikagenyx.com

---

© 2025 Nikagenyx Vision Tech. All rights reserved.
