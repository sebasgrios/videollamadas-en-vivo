import { useEffect, useRef, useState } from 'preact/hooks';
import io from 'socket.io-client';
import VideoPlayer from '../components/VideoPlayer';

const socket = io('http://localhost:3000');
const config = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export default function App() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<{ id: string; stream: MediaStream }[]>([]);

  const peerConnections: { [id: string]: RTCPeerConnection } = {};

  function createPeerConnection(userId: string, stream: MediaStream) {
    const pc = new RTCPeerConnection(config);

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.onicecandidate = e => {
      if (e.candidate) {
        socket.emit('signal', {
          to: userId,
          from: socket.id,
          data: { candidate: e.candidate },
        });
      }
    };

    pc.ontrack = event => {
      setPeers(prev => {
        if (prev.some(p => p.id === userId)) return prev;
        return [...prev, { id: userId, stream: event.streams[0] }];
      });
    };

    return pc;
  }


  useEffect(() => {
    let stream: MediaStream;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(_stream => {
      stream = _stream;
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      socket.emit('join-room');

      socket.on('user-connected', async userId => {
        if (userId === socket.id) return;

        // Solo creamos la oferta desde aquí, no la conexión
        const pc = createPeerConnection(userId, stream);
        peerConnections[userId] = pc;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('signal', {
          to: userId,
          from: socket.id,
          data: { sdp: pc.localDescription },
        });
      });

      socket.on('signal', async ({ from, data }) => {
        if (from === socket.id) return;

        let pc = peerConnections[from];
        if (!pc) {
          pc = createPeerConnection(from, stream);
          peerConnections[from] = pc;
        }

        if (data.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          if (data.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('signal', {
              to: from,
              from: socket.id,
              data: { sdp: pc.localDescription },
            });
          }
        } else if (data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      });

      socket.on('user-disconnected', userId => {
        const pc = peerConnections[userId];
        if (pc) {
          pc.close();
          delete peerConnections[userId];
        }
        setPeers(prev => prev.filter(p => p.id !== userId));
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);


  return (
    <div class="p-4">
      <h1 class="text-xl mb-4">Videollamada en Vivo</h1>
      <div class="grid grid-cols-2 gap-4">
        {localStream && <VideoPlayer stream={localStream} muted />}
        {peers
          .map(({ id, stream }) => (
            <VideoPlayer key={id} stream={stream} />
          ))}
      </div>
    </div>
  );
}
