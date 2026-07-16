# Agent & Developer Guide: Car Finance Calculator

This repository contains a modern, premium **Car Finance Calculator** that allows users to compare Cash vs. Finance vs. Lease options, and Gasoline vs. Hybrid savings side-by-side.

## Technology Stack & Architecture
- **HTML**: Structuring the inputs, comparison metrics, charts, and layout (`index.html`).
- **CSS**: Located in `/css`. Styled using vanilla CSS variables, layout utilities, and custom components (`css/components.css`).
  - *Note on UI Pill Toggles*: The segmented controls (`.segmented-control`) use the modern CSS `:has()` selector to animate the background pill translation.
- **Javascript**: Fully vanilla modules under `/js`.
  - `main.js`: Core orchestrator.
  - `js/ui/`: Contains DOM UI bindings, input listeners, presets, result rendering, and chart updates.
  - `js/calc/`: Implements mathematical models for Cash, Finance, Lease, Fuel/Hybrid savings, and comparisons.
  - `js/utils/`: Handles formatting and state sharing via URL query parameters.

## Local Development
Since this is a static web application, it does not require a compilation step. To run locally, you can serve the directory using any HTTP server:
```bash
# Using Python
python3 -m http.server 8000

# Using Node (npx)
npx serve .
```

## Deployment to GitHub Pages
The site is hosted on **GitHub Pages** and is configured to automatically rebuild and deploy from the `main` branch.

### Deployment URL
- **Live Site**: [https://henrysha.github.io/car-finance-calc/](https://henrysha.github.io/car-finance-calc/)

### How to Deploy Changes
1. Commit your changes to the codebase.
2. Push to the `main` branch:
   ```bash
   git push origin main
   ```
3. GitHub Actions will automatically trigger the `pages-build-deployment` workflow to rebuild and deploy the static assets.

## Core Files Checklist
- [`index.html`](file:///Users/henry/code/car-finance-calc/index.html) - Main layout and DOM elements.
- [`css/components.css`](file:///Users/henry/code/car-finance-calc/css/components.css) - Custom UI components, including the fixed segmented control styles.
- [`js/ui/inputs.js`](file:///Users/henry/code/car-finance-calc/js/ui/inputs.js) - Preset handling and input event binding.
- [`js/main.js`](file:///Users/henry/code/car-finance-calc/js/main.js) - Calculation controller and main loop.
