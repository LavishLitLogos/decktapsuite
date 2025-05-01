# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Running Locally

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Set up Environment Variables:**
    Create a `.env.local` file in the root directory and add your Google Generative AI API key:
    ```
    GOOGLE_GENAI_API_KEY=YOUR_API_KEY_HERE
    ```
3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:9002`.
4.  **(Optional) Run Genkit in development:**
    For debugging or inspecting Genkit flows separately:
    ```bash
    npm run genkit:dev
    ```
    Or with file watching:
    ```bash
    npm run genkit:watch
    ```

## Building for Production

```bash
npm run build
```

## Deploying to Vercel

This project is ready to be deployed to [Vercel](https://vercel.com/).

1.  **Push your code** to a Git repository (GitHub, GitLab, Bitbucket).
2.  **Import your project** into Vercel from your Git repository.
3.  **Configure Environment Variables:**
    - Go to your project settings in Vercel.
    - Navigate to "Environment Variables".
    - Add `GOOGLE_GENAI_API_KEY` with your API key value.
4.  **Deploy:** Vercel will automatically detect it's a Next.js project, build it using `npm run build`, and deploy it.

No `vercel.json` file is typically required as Vercel's default Next.js settings should work.
