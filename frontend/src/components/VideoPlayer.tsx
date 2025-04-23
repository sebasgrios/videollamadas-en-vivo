import { useEffect, useRef } from "preact/hooks";

type VideoPlayerProps = {
  stream: MediaStream;
  muted?: boolean;
};

export default function VideoPlayer({ stream, muted = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      class="rounded-lg shadow-lg"
    />
  );
}
