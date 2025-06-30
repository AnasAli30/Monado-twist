import { Metadata } from "next";
import App from "@/components/pages/app";
import { APP_URL } from "@/lib/constants";

export async function generateMetadata({ searchParams }: { searchParams: Record<string, string> }): Promise<Metadata> {
  const { rank = '-', spins = '-', winnings = '-' } = searchParams || {};
  const imageUrl = `${APP_URL}/api/og-image?rank=${rank}&spins=${spins}&winnings=${winnings}`;
  const frameEmbedNext = {
    frameUrl: `${APP_URL}`,
    frameEmbed: {
      version: "next",
      imageUrl,
      button: {
        title: "Spin to Win 🎰",
        action: {
          type: "launch_frame",
          name: "Monado Twist",
          url: APP_URL,
          splashImageUrl: `${APP_URL}/images/splash.png`,
          splashBackgroundColor: "#14051a",
        },
      },
    },
  };
  return {
    title: "Monado Twist",
    openGraph: {
      title: "Monado Twist",
      description: "Spin to Win",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "Monado Twist Dynamic OG Image",
        },
      ],
      url: `${APP_URL}?rank=${rank}&spins=${spins}&winnings=${winnings}`,
    },
    other: {
      frameEmbedNext: JSON.stringify(frameEmbedNext),
    },
  };
}

export default function Home() {
  return <App />;
}
