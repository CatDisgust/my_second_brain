import type { MetadataRoute } from "next";

/**
 * PWA Web App Manifest
 * 用于「添加到主屏幕」后获得 standalone 沉浸式体验（无 Safari 地址栏/工具栏）
 *
 * Icons：此处直接复用 Next.js 的 app/icon.tsx 生成的图标（/icon.png），
 *       这样浏览器标签页、小图标和 PWA 图标都保持一致的「Second Brain」符号。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Second Brain",
    short_name: "Brain",
    description: "Capture insights. Crystallize models. Design identity.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["productivity", "utilities"],
  };
}
