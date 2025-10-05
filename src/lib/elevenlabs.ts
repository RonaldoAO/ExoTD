import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const API_KEY = "sk_0c32caf5ab32aeb92bae3f84edce8b37d96c90138bc7ecfe";

const elevenlabs = new ElevenLabsClient({
  apiKey: API_KEY,
});

export async function textToSpeech(text: string): Promise<HTMLAudioElement> {
  try {
    const audio = await elevenlabs.textToSpeech.convert("JBFqnCBsd6RMkjVDRZzb", {
      text: text,
      modelId: "eleven_multilingual_v2",
      outputFormat: "mp3_44100_128",
    });

    // Convert audio stream to blob URL for browser playback
    const chunks: Uint8Array[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }

    const blob = new Blob(chunks, { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);

    // Create and return audio element
    const audioElement = new Audio(url);
    return audioElement;
  } catch (error) {
    console.error("Error calling ElevenLabs API:", error);
    throw error;
  }
}
