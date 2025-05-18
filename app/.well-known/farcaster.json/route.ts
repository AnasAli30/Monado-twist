import { NextResponse } from "next/server";
import { APP_URL } from "../../../lib/constants";

export async function GET() {
  const farcasterConfig = {
    // TODO: Add account association
    "accountAssociation": {
      "header": "eyJmaWQiOjI0OTcwMiwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweEVCNDRFYTBlODBhQzE4MjIwREM5RjY0MjEyRWI3OTAwMzAwMTAxNjUifQ",
      "payload": "eyJkb21haW4iOiJtb25hZG8tdHdpc3QudmVyY2VsLmFwcCJ9",
      "signature": "MHg5MTAzZmU3MDMzZDQxMWE2OWUzYjJjNjBjZjM3NWUwYzI5ZDk1ZTRlN2Q2MTUyNmUwZTMxNTg2OWEyZDVjMGVjMTJlNTJiZTNhNWFlZmEwNjNiMmRmNjdhMzJhNDlhMzc3MDQ2MzBmMWJlMmRkYjk0NTU4MWJjZjIxODA5NzU3ZTFi"
    },
    frame: {
      version: "1",
      name: "Monado Twist",
      iconUrl: `${APP_URL}/images/icon.png`,
      homeUrl: `${APP_URL}`,
      imageUrl: `${APP_URL}/images/feed.png`,
      screenshotUrls: [],
      tags: ["monad", "farcaster", "miniapp", "game","playtoearn"],
      primaryCategory: "games",
      buttonTitle: "Spin to Win",
      splashImageUrl: `${APP_URL}/images/splash.png`,
      splashBackgroundColor: "#14051a",
      subtitle: "Monado Twist",
      description: "Win MON tokens by spinning the wheel",
      webhookUrl: `${APP_URL}/api/webhook`,
      tagline:"spin and earn",
      ogTitle:"Monado Twist",
      ogDescription: "Win MON tokens by spinning the wheel",
      ogImageUrl: `${APP_URL}/images/feed.png`,
      heroImageUrl: `${APP_URL}/images/feed.png`,
      requiredChains: ["eip155:10143"],
    },
  };

  return NextResponse.json(farcasterConfig);
}
