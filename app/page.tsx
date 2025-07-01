import { Metadata } from "next";
import App from "@/components/pages/app";
import { APP_URL } from "@/lib/constants";

const frame = {
  version: "next",
  imageUrl: `https://hatrabbits.com/wp-content/uploads/2017/01/random.jpg`,
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

const frameEmbedNext = {
  frameUrl: `${APP_URL}`,
  frameEmbed: {
    version: "next",
    imageUrl: `${APP_URL}/api/og-image?user=Guest`,
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
  // Optionally add author or other fields here
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Monado Twist",
    openGraph: {
      title: "Monado Twist",
      description: "Spin to Win",
      images: [`https://hatrabbits.com/wp-content/uploads/2017/01/random.jpg`],
    },
    other: {
      "fc:frame": JSON.stringify(frame),
      "frameEmbedNext": JSON.stringify(frameEmbedNext),
    },
  };
}

export default function Home() {
  return <App />;
}
