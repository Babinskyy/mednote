"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type DictationSupport = "checking" | "supported" | "unsupported";
type DictationStatus = "idle" | "connecting" | "recording" | "finalizing";

type RealtimeTranscriptionEvent = {
  type: string;
  delta?: string;
  error?: {
    message?: string;
  };
  item_id?: string;
  transcript?: string;
};

type UseRealtimeDictationOptions = {
  onTranscript: (transcript: string) => void;
};

export function appendDictationText(currentValue: string, transcript: string) {
  const cleanedTranscript = transcript.trim();

  if (!cleanedTranscript) {
    return currentValue;
  }

  if (!currentValue.trim()) {
    return cleanedTranscript;
  }

  const separator = /\s$/.test(currentValue) ? "" : " ";

  return `${currentValue}${separator}${cleanedTranscript}`;
}

export function formatRecordingDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

function logDictationDebug(eventName: string, details?: Record<string, unknown>) {
  if (
    typeof window === "undefined" ||
    window.localStorage.getItem("mednote:speech-debug") !== "1"
  ) {
    return;
  }

  console.log("[mednote:dictation]", eventName, details ?? {});
}

export function useRealtimeDictation({ onTranscript }: UseRealtimeDictationOptions) {
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const finalTranscriptRef = useRef("");
  const finalizeTimeoutRef = useRef<number | null>(null);
  const isFinalizingRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const partialTranscriptsRef = useRef(new Map<string, string>());
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [message, setMessage] = useState<string | undefined>();
  const [status, setStatus] = useState<DictationStatus>("idle");
  const [support, setSupport] = useState<DictationSupport>("checking");

  const isConnecting = status === "connecting";
  const isFinalizing = status === "finalizing";
  const isRecording = status === "recording";
  const isActive = isConnecting || isRecording || isFinalizing;

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const stopMediaStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, []);

  const buildTranscript = useCallback(() => {
    const partialTranscript = Array.from(partialTranscriptsRef.current.values())
      .join(" ")
      .trim();

    return appendDictationText(finalTranscriptRef.current, partialTranscript);
  }, []);

  const refreshLiveTranscript = useCallback(() => {
    setLiveTranscript(buildTranscript());
  }, [buildTranscript]);

  const clearFinalizeTimeout = useCallback(() => {
    if (finalizeTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(finalizeTimeoutRef.current);
    finalizeTimeoutRef.current = null;
  }, []);

  const closeConnection = useCallback(() => {
    clearFinalizeTimeout();
    dataChannelRef.current?.close();
    dataChannelRef.current = null;
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    stopMediaStream();
  }, [clearFinalizeTimeout, stopMediaStream]);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = "";
    partialTranscriptsRef.current.clear();
    setLiveTranscript("");
  }, []);

  const commitTranscript = useCallback(() => {
    const transcript = buildTranscript().trim();

    if (transcript) {
      onTranscriptRef.current(transcript);
    }

    isFinalizingRef.current = false;
    resetTranscript();
    setElapsedSeconds(0);
    setMessage(undefined);
    setStatus("idle");
    closeConnection();
  }, [buildTranscript, closeConnection, resetTranscript]);

  const sendRealtimeEvent = useCallback((event: Record<string, unknown>) => {
    if (dataChannelRef.current?.readyState !== "open") {
      return;
    }

    dataChannelRef.current.send(JSON.stringify(event));
  }, []);

  const handleRealtimeEvent = useCallback(
    (event: RealtimeTranscriptionEvent) => {
      logDictationDebug("event", { type: event.type });

      if (event.type === "conversation.item.input_audio_transcription.delta") {
        const itemId = event.item_id ?? "current";
        const previousTranscript = partialTranscriptsRef.current.get(itemId) ?? "";
        partialTranscriptsRef.current.set(itemId, `${previousTranscript}${event.delta ?? ""}`);
        refreshLiveTranscript();
        return;
      }

      if (event.type === "conversation.item.input_audio_transcription.completed") {
        if (event.item_id) {
          partialTranscriptsRef.current.delete(event.item_id);
        }

        finalTranscriptRef.current = appendDictationText(
          finalTranscriptRef.current,
          event.transcript ?? "",
        );
        refreshLiveTranscript();

        if (isFinalizingRef.current) {
          commitTranscript();
        }

        return;
      }

      if (event.type === "error") {
        setMessage(event.error?.message ?? "Sesja transkrypcji została przerwana.");
      }
    },
    [commitTranscript, refreshLiveTranscript],
  );

  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof RTCPeerConnection === "undefined"
    ) {
      const timeoutId = window.setTimeout(() => {
        setSupport("unsupported");
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      setSupport("supported");
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      closeConnection();
    };
  }, [closeConnection]);

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setElapsedSeconds((currentSeconds) => currentSeconds + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRecording]);

  const start = useCallback(async () => {
    if (support !== "supported" || status !== "idle") {
      setMessage("Ta przeglądarka nie obsługuje dyktowania realtime.");
      return;
    }

    setStatus("connecting");
    setMessage("Łączę z transkrypcją realtime...");
    isFinalizingRef.current = false;
    resetTranscript();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const peerConnection = new RTCPeerConnection();
      const dataChannel = peerConnection.createDataChannel("oai-events");
      const audioTrack = stream.getAudioTracks()[0];

      if (!audioTrack) {
        throw new Error("missing-audio-track");
      }

      mediaStreamRef.current = stream;
      peerConnectionRef.current = peerConnection;
      dataChannelRef.current = dataChannel;
      peerConnection.addTrack(audioTrack, stream);

      dataChannel.addEventListener("open", () => {
        logDictationDebug("data-channel:open");
        setElapsedSeconds(0);
        setMessage("Dyktowanie realtime włączone.");
        setStatus("recording");
      });

      dataChannel.addEventListener("message", (messageEvent) => {
        try {
          handleRealtimeEvent(JSON.parse(messageEvent.data) as RealtimeTranscriptionEvent);
        } catch {
          logDictationDebug("event:parse-error");
        }
      });

      dataChannel.addEventListener("close", () => {
        logDictationDebug("data-channel:close");
      });

      peerConnection.addEventListener("connectionstatechange", () => {
        logDictationDebug("peer:state", { state: peerConnection.connectionState });

        if (peerConnection.connectionState === "failed") {
          isFinalizingRef.current = false;
          setElapsedSeconds(0);
          setMessage("Połączenie realtime zostało przerwane.");
          setStatus("idle");
          closeConnection();
        }
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      const sdpResponse = await fetch("/api/realtime-transcription", {
        method: "POST",
        body: offer.sdp,
        headers: {
          "Content-Type": "application/sdp",
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(await sdpResponse.text());
      }

      await peerConnection.setRemoteDescription({
        type: "answer",
        sdp: await sdpResponse.text(),
      });
    } catch {
      isFinalizingRef.current = false;
      setElapsedSeconds(0);
      setMessage("Nie udało się uruchomić transkrypcji realtime.");
      setStatus("idle");
      closeConnection();
    }
  }, [closeConnection, handleRealtimeEvent, resetTranscript, status, support]);

  const stop = useCallback(() => {
    if (status !== "recording") {
      return;
    }

    isFinalizingRef.current = true;
    setMessage("Kończę dyktowanie...");
    setStatus("finalizing");
    sendRealtimeEvent({ type: "input_audio_buffer.commit" });
    stopMediaStream();
    finalizeTimeoutRef.current = window.setTimeout(() => {
      commitTranscript();
    }, 2500);
  }, [commitTranscript, sendRealtimeEvent, status, stopMediaStream]);

  const toggle = useCallback(() => {
    if (status === "recording") {
      stop();
      return;
    }

    void start();
  }, [start, status, stop]);

  const reset = useCallback(() => {
    isFinalizingRef.current = false;
    resetTranscript();
    setElapsedSeconds(0);
    setMessage(undefined);
    setStatus("idle");
    closeConnection();
  }, [closeConnection, resetTranscript]);

  return {
    elapsedSeconds,
    isActive,
    isConnecting,
    isFinalizing,
    isRecording,
    liveTranscript,
    message,
    reset,
    status,
    support,
    toggle,
  };
}
