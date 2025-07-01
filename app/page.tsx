import { Metadata } from "next";
import App from "@/components/pages/app";
import { APP_URL } from "@/lib/constants";

export async function generateMetadata({ searchParams }: { searchParams?: Record<string, string> }): Promise<Metadata> {
  const { rank, spins, winnings, userImg } = searchParams || {};
  let imageUrl = `${APP_URL}/images/feed.png`;
  if (rank && spins && winnings) {
    imageUrl = `${APP_URL}/api/og-image?rank=${rank}&spins=${spins}&winnings=${winnings}&userImg=${userImg}`;
  }

  const frame = {
    version: "next",
    imageUrl,
    button: {
      title: "Spin to Win",
      action: {
        type: "launch_frame",
        name: "Monado Twist",
        url: APP_URL,
        splashImageUrl: `${APP_URL}/images/splash.png`,
        splashBackgroundColor: "#14051a",
      },
    },
  };

  // const frameEmbedNext = {
  //   frameUrl: `${APP_URL}`,
  //   frameEmbed: {
  //     version: "next",
  //     imageUrl: `${APP_URL}/api/og-image?user=Guest`,
  //     button: {
  //       title: "Spin to Win 🎰",
  //       action: {
  //         type: "launch_frame",
  //         name: "Monado Twist",
  //         url: APP_URL,
  //         splashImageUrl: `${APP_URL}/images/splash.png`,
  //         splashBackgroundColor: "#14051a",
  //       },
  //     },
  //   },
  //   // Optionally add author or other fields here
  // };

  return {
    title: "Monado Twist",
    openGraph: {
      title: "Monado Twist",
      description: "Spin to Win",
      images: [{ url: imageUrl }],
    },
    other: {
      "fc:frame": JSON.stringify(frame),
      // "frameEmbedNext": JSON.stringify(frameEmbedNext),
    },
  };
}

export default function Home() {
  return <App />;
}
