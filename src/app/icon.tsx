import { ImageResponse } from "next/og";

export const runtime = "edge";

// 512x512 icon for PWA / iOS home screen
export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000000",
        }}
      >
        <div
          style={{
            width: "72%",
            height: "72%",
            borderRadius: "32%",
            borderWidth: 4,
            borderStyle: "solid",
            borderColor: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontSize: 220,
            fontWeight: 700,
            letterSpacing: "-0.12em",
          }}
        >
          2B
        </div>
      </div>
    ),
    {
      width: size.width,
      height: size.height,
    },
  );
}

