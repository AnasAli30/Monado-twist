# Farcaster Mini App Cursor Rule

## 1. Project Structure
- Use Next.js (App Router or Pages Router).
- Organize UI in `/components`, API logic in `/pages/api`, and static assets in `/public`.
- Use a dynamic OG image endpoint (e.g., `/api/og-image`) for Open Graph image generation.
- Use your main page (e.g., `/app/page.tsx`) or a route-specific page for dynamic OG/frame metadata.

## 2. Farcaster Frame & OG Image Logic
- **Dynamic OG Images:**  
  - Use `@vercel/og` to generate images on the fly.
  - Accept query params for user data, stats, and images.
  - Overlay user profile image, stats, and token image on a static template background.
  - Always set `display: 'flex'` on any `<div>` with multiple children in OG JSX.
- **Frame Metadata:**  
  - In `generateMetadata`, check for win/leaderboard params in `searchParams`.
  - If present, set OG image and frame imageUrl to your dynamic OG image endpoint with query params.
  - Otherwise, use a static image.
  - Add `"fc:frame"` meta with frame config (imageUrl, button, etc).
- **Sharing Logic:**  
  - When sharing (e.g., from leaderboard or win), build the embed URL with all relevant params:
    ```
    /?wonValue=...&wonText=...&userImg=...&tokenImg=...
    ```
  - Use encodeURIComponent for all URLs.

## 3. User Profile Integration
- Always pass the user's profile image (`pfpUrl`) as `userImg` in the OG image URL.
- For leaderboard, use the current user's stats and image.
- For win shares, use the winner's image and token image.


## 6. wagmi Integration
- Use wagmi hooks for wallet connection, chain switching, and contract interaction:
  - `useAccount`, `useSwitchChain`, `useSendTransaction`, `useContractWrite`, `useWaitForTransactionReceipt`.
- Always check for correct chain before allowing spins or claims.
- Use wagmi for contract calls (e.g., claim rewards).

## 7. API & Data Sync
- Use your backend API endpoints for game logic, user stats, and rewards.
- Sync user stats and profile image to the backend on relevant events.
- Use a secure fetch utility for API calls (e.g., `fetchWithVerification`).

## 8. UI/UX Patterns
- Use clear, animated feedback for actions (e.g., "Verifying...", "You won!").
- Use modals/popups for results and sharing.
- Use a static template image for OG backgrounds, overlaying dynamic data.

## 9. Performance & Cost
- Use static OG images for default shares to minimize Vercel function invocations.
- Only generate dynamic OG images for personalized or leaderboard/win shares.
- Add cache headers to your OG image endpoint if expecting high traffic.

## 10. Farcaster Frame Best Practices
- Always include a frame button with a clear call to action.
- Use the main app URL as the frame URL for clean attribution.
- Pass all dynamic data as query params for OG/frame rendering.

## 11. Reusable Code Patterns
- Export utility functions (e.g. `fetchWithVerification`) for use in other projects.
- Keep all Farcaster and OG logic modular and parameterized for easy reuse.

---

**How to Use This Rule in Other Projects**
- Copy this rule into your new project's docs or as a `CURSOR_RULE.md`.
- Import or copy the utility functions and OG image logic.
- Follow the checklist for any new Farcaster mini app or frame-enabled project. 