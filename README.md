# Noema

Noema helps people who find speaking or typing hard share their day with family far away.
It asks simple questions one at a time. She answers with a big tap or a few spoken words,
and Noema turns her answers into a message for her family, using only what she said.

Built with Expo (React Native), Expo Router, Clerk for accounts, and OpenAI for questions,
voice understanding, and writing the message.

## Run it

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root (it is git-ignored):

   ```
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   EXPO_PUBLIC_OPENAI_API_KEY=sk-...
   EXPO_PUBLIC_OPENAI_MODEL=gpt-4.1-mini
   ```

   In Clerk, enable **Username** + **Password** sign-in and make email optional.

3. Start the web preview (shows the app in a phone-sized frame):

   ```bash
   npx expo start --web
   ```

   Then open http://localhost:8081.

> The OpenAI key is bundled into the app, which is fine for a local demo. Move AI calls to a server before publishing.
