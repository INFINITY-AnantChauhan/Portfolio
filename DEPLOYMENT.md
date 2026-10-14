# Deployment

The portfolio frontend can be published on GitHub Pages. GitHub Pages serves static files; it does not run this project's Express `server.js`. As a result, the assistant and email contact form require the Node backend to run on a separate HTTPS host. This is why those features show API route errors when the whole project is deployed only to Pages.

## Configure the GitHub Pages frontend

1. Deploy the static site from this repository using GitHub Pages.
2. Deploy `server.js` and the Node dependencies to a host that runs Node.js.
3. Set `window.PORTFOLIO_API_BASE_URL` in `deployment-config.js` to the backend origin, for example `https://portfolio-api.example.com` (origin only; no route path or trailing slash).
4. Set `ALLOWED_ORIGINS` in the backend environment to the exact Pages origin, for example `https://yourusername.github.io`. For a project site, the origin does not include the repository path. Multiple origins can be comma-separated.
5. Configure backend secrets on the backend host, not in GitHub Pages files: `ANTHROPIC_API_KEY` for provider-backed assistant responses and the `SMTP_*` variables for contact email. See `.env.example` for names and Gmail SMTP examples.
6. Restart/redeploy the backend after changing its environment, then redeploy the Pages frontend after changing `deployment-config.js`.

The pet can request Open-Meteo directly from the browser as a fallback. The chat and contact form cannot work on Pages until the backend URL and CORS origin are configured.

Never put API keys or SMTP passwords in `deployment-config.js`; that file is public browser code.
