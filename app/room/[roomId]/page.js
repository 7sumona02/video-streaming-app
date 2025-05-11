'use client'
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import io from 'socket.io-client';
import Peer from 'peerjs';

export default function Room() {
    const videoGrid = useRef(null);
    const params = useParams();
    const roomId = params.roomId;
    const myVideo = useRef(null);
    const peerVideo = useRef(null);
    const [isMuted, setIsMuted] = useState(true);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isRoomFull, setIsRoomFull] = useState(false);
    const [participants, setParticipants] = useState(1);
    const [roomLink, setRoomLink] = useState('');

    useEffect(() => {
        setRoomLink(window.location.href);
        const myPeer = new Peer(undefined, {
            host: '/',
            port: '3001'
        });

        const socket = io();
        let myStream;

        navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        }).then(stream => {
            myStream = stream;
            if (myVideo.current) {
                myVideo.current.srcObject = stream;
            }

            myPeer.on('call', call => {
                if (participants > 2) {
                    return; // Reject additional connections
                }
                call.answer(stream);
                call.on('stream', userVideoStream => {
                    if (peerVideo.current) {
                        peerVideo.current.srcObject = userVideoStream;
                        setParticipants(2);
                    }
                });
            });

            socket.on('user-connected', userId => {
                if (participants < 2) {
                    connectToNewUser(userId, stream);
                } else {
                    setIsRoomFull(true);
                }
            });

            socket.on('user-disconnected', () => {
                if (peerVideo.current) {
                    peerVideo.current.srcObject = null;
                }
                setParticipants(1);
                setIsRoomFull(false);
            });
        });

        myPeer.on('open', id => {
            socket.emit('join-room', roomId, id);
        });

        const connectToNewUser = (userId, stream) => {
            const call = myPeer.call(userId, stream);
            call.on('stream', userVideoStream => {
                if (peerVideo.current) {
                    peerVideo.current.srcObject = userVideoStream;
                    setParticipants(2);
                }
            });
            call.on('close', () => {
                if (peerVideo.current) {
                    peerVideo.current.srcObject = null;
                }
                setParticipants(1);
            });
        };

        return () => {
            if (myStream) {
                myStream.getTracks().forEach(track => track.stop());
            }
            socket.disconnect();
            myPeer.destroy();
        };
    }, [roomId, participants]);

    const toggleAudio = () => {
        const videoStream = myVideo.current.srcObject;
        const audioTrack = videoStream.getAudioTracks()[0];
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!isMuted);
    };

    const toggleVideo = () => {
        const videoStream = myVideo.current.srcObject;
        const videoTrack = videoStream.getVideoTracks()[0];
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!isVideoOff);
    };

    const copyRoomLink = () => {
        navigator.clipboard.writeText(roomLink);
        alert('Room link copied to clipboard!');
    };

    return (
        <div className="min-h-screen bg-gray-900 p-4">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-white">Room: {roomId}</h1>
                    <div className="flex items-center space-x-4">
                        <span className="text-white">
                            {isRoomFull ? 'Room is full' : `Participants: ${participants}/2`}
                        </span>
                        <button 
                            onClick={copyRoomLink}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                        >
                            Share Room
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <video 
                            ref={myVideo} 
                            muted 
                            className="w-full bg-black rounded-lg"
                            autoPlay
                            playsInline
                        />
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                            <button 
                                onClick={toggleAudio}
                                className={`p-3 rounded-full ${isMuted ? 'bg-red-500' : 'bg-green-500'} hover:opacity-80 transition`}
                            >
                                {isMuted ? '🔇' : '🔊'}
                            </button>
                            <button 
                                onClick={toggleVideo}
                                className={`p-3 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-green-500'} hover:opacity-80 transition`}
                            >
                                {isVideoOff ? '📵' : '📹'}
                            </button>
                        </div>
                    </div>
                    <div className="relative">
                        <video 
                            ref={peerVideo}
                            className="w-full bg-black rounded-lg"
                            autoPlay
                            playsInline
                        />
                        {participants === 1 && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <p className="text-white text-lg">Waiting for peer to join...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}