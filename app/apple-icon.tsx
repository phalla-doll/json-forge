import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 36,
      }}
    >
      <svg width="140" height="140" viewBox="0 0 32 32">
        <path
          d="M12 7 C9 7 9 11 9 13 C9 15 7 16 7 16 C7 16 9 17 9 19 C9 21 9 25 12 25"
          stroke="#fafafa"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M20 7 C23 7 23 11 23 13 C23 15 25 16 25 16 C25 16 23 17 23 19 C23 21 23 25 20 25"
          stroke="#fafafa"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 11.5 L17 15 L20.5 16 L17 17 L16 20.5 L15 17 L11.5 16 L15 15 Z"
          fill="#f59e0b"
        />
      </svg>
    </div>,
    { ...size },
  );
}
