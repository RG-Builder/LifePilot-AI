<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/081e94ee-3f0c-4e02-8c9b-0200c6b3c314

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `VITE_GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deployment environment variables

Configure these variables in your hosting/deployment provider:

- `VITE_GEMINI_API_KEY`: Gemini key used by the Vite client bundle.
- `VITE_RAZORPAY_KEY_ID`: Razorpay public key used by checkout initialization.

Server-only keys (for `server.ts`) should remain non-`VITE_` prefixed and never be exposed to the browser.
