import { Metadata } from "next";
import App from "@/components/pages/app";
import { APP_URL } from "@/lib/constants";

export async function generateMetadata({ searchParams }: { searchParams?: Record<string, string> }): Promise<Metadata> {
  const { rank, spins, winnings, userImg, wonValue, wonText, tokenImg, username, winPercentage , totalSpins } = searchParams || {};  
  let imageUrl = `${APP_URL}/images/feed.png`;
  if (wonValue && wonText && userImg && tokenImg) {
    imageUrl = `${APP_URL}/api/og-image?wonValue=${wonValue}&wonText=${encodeURIComponent(wonText)}&userImg=${encodeURIComponent(userImg)}&tokenImg=${encodeURIComponent(tokenImg)}&username=${encodeURIComponent(username)}&winPercentage=${encodeURIComponent(winPercentage)}&totalSpins=${encodeURIComponent(totalSpins)}`;
  } else if (rank && spins && winnings && userImg) {
    imageUrl = `${APP_URL}/api/og-image?rank=${rank}&spins=${spins}&winnings=${winnings}&userImg=${encodeURIComponent(userImg)}&username=${encodeURIComponent(username)}&winPercentage=${encodeURIComponent(winPercentage)}&totalSpins=${encodeURIComponent(totalSpins)}`;
  }

  const frame = {
    version: "next",
    imageUrl,
    button: {
      title: "Spin to Win",
      action: {
        type: "launch_frame",
        name: "Monad Twist",
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
  //         name: "Monad Twist",
  //         url: APP_URL,
  //         splashImageUrl: `${APP_URL}/images/splash.png`,
  //         splashBackgroundColor: "#14051a",
  //       },
  //     },
  //   },
  //   // Optionally add author or other fields here
  // };

  return {
    title: "Monad Twist",
    openGraph: {
      title: "Monad Twist",
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
