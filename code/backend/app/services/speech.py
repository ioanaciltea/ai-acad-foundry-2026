from __future__ import annotations

import os
from urllib.parse import urlparse
import httpx
import azure.cognitiveservices.speech as speechsdk
from azure.identity import DefaultAzureCredential

from ..config import settings

# 24 kHz mono PCM in a RIFF container — plays in any browser, no codec needed
TTS_FORMAT = "riff-24khz-16bit-mono-pcm"


class SpeechUnavailable(Exception):
    """Raised with instructions when the Speech resource is not configured."""


class SpeechSynthesisError(Exception):
    """Raised when speech synthesis fails or is canceled."""


def _resolve_speech_endpoint() -> str:
    """Resolves Speech endpoint URL from env, settings, or derives it from AZURE_AI_ENDPOINT for Entra ID."""
    endpoint_url = os.environ.get("AZURE_SPEECH_ENDPOINT") or getattr(settings, "azure_speech_endpoint", "")
    if endpoint_url:
        return endpoint_url
    
    # If using identity auth, derive speech endpoint from AZURE_AI_ENDPOINT
    if getattr(settings, "azure_ai_auth", "") == "identity":
        ai_endpoint = getattr(settings, "azure_ai_endpoint", "")
        if ai_endpoint:
            parsed = urlparse(ai_endpoint)
            host_parts = parsed.netloc.split(".")
            if host_parts:
                return f"https://{host_parts[0]}.cognitiveservices.azure.com/"
    return ""


def synthesize_speech(text: str, voice: str) -> bytes:
    """Synthesize text to speech using Azure Speech SDK with Microsoft Entra ID authentication."""
    endpoint_url = _resolve_speech_endpoint()
    if not endpoint_url:
        raise ValueError("AZURE_SPEECH_ENDPOINT environment variable is missing or could not be resolved.")

    # 1. Instantiate DefaultAzureCredential from azure.identity
    credential = DefaultAzureCredential()

    # 2. Fetch access token for Cognitive Services scope
    token = credential.get_token("https://cognitiveservices.azure.com/.default")

    # 3. Configure SpeechConfig using base endpoint (scheme + netloc) and set authorization token
    parsed = urlparse(endpoint_url)
    base_endpoint = f"{parsed.scheme}://{parsed.netloc}"
    speech_config = speechsdk.SpeechConfig(endpoint=base_endpoint)
    speech_config.speech_synthesis_voice_name = voice

    # Azure Speech SDK with Entra ID token requires aad#resource_id#token format
    resource_id = os.environ.get("AZURE_SPEECH_RESOURCE_ID") or getattr(settings, "azure_speech_resource_id", "")
    if not resource_id:
        resource_id = "/subscriptions/5487059e-7469-4758-9c9e-6f4196b4ebf7/resourceGroups/ai-academy/providers/Microsoft.CognitiveServices/accounts/ai-academy-foundry"

    if resource_id:
        speech_config.authorization_token = f"aad#{resource_id}#{token.token}"
    else:
        speech_config.authorization_token = "Bearer " + token.token

    # 4. Configure SpeechSynthesizer with audio_config=None to prevent playing to default system speakers
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)

    # 5. Run speak_text_async(text).get()
    result = synthesizer.speak_text_async(text).get()

    # 6. Check the result and return bytes or raise exception with cancellation details
    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        return result.audio_data
    elif result.reason == speechsdk.ResultReason.Canceled:
        cancellation_details = speechsdk.SpeechSynthesisCancellationDetails(result)
        error_msg = f"Speech synthesis canceled: {cancellation_details.reason}"
        if cancellation_details.reason == speechsdk.CancellationReason.Error:
            error_msg += f" (Error Code: {cancellation_details.error_code}, Details: {cancellation_details.error_details})"
        raise SpeechSynthesisError(error_msg)
    else:
        raise SpeechSynthesisError(f"Speech synthesis failed with reason: {result.reason}")


def _credentials() -> tuple[str, str]:
    """Key and region for Speech.

    A Foundry resource of kind AIServices is *multi-service*: the same key and
    region already used for chat and embeddings also open Speech. So if the
    dedicated AZURE_SPEECH_* settings are empty we fall back to the Foundry ones —
    one resource, one key, several capabilities.

    A standalone Speech resource is still supported (and is what you would use if
    Speech belonged to a different team or subscription): set AZURE_SPEECH_KEY and
    AZURE_SPEECH_REGION and they win.
    """
    key = settings.azure_speech_key or settings.azure_ai_api_key
    region = settings.azure_speech_region or settings.azure_location
    if not key or not region:
        raise SpeechUnavailable(
            "Speech is not configured. Either set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION "
            "for a dedicated Speech resource, or — since a Foundry AIServices resource "
            "includes Speech — set AZURE_AI_API_KEY and AZURE_LOCATION and it will be used. "
            "See the Session 4 page, 'Speech: giving the assistant a voice'."
        )
    return key, region


def describe() -> dict:
    """What /health reports, without raising when nothing is configured."""
    endpoint_url = _resolve_speech_endpoint()
    if endpoint_url:
        return {
            "configured": True,
            "endpoint": endpoint_url,
            "auth": "Entra ID (Identity)",
            "voice": settings.azure_speech_voice,
        }
    try:
        key, region = _credentials()
    except SpeechUnavailable:
        return {"configured": False, "region": None, "source": None,
                "voice": settings.azure_speech_voice}
    dedicated = bool(settings.azure_speech_key)
    return {
        "configured": True,
        "region": region,
        "source": "dedicated Speech resource" if dedicated else "Foundry AIServices resource",
        "voice": settings.azure_speech_voice,
    }


def _require_config() -> None:
    _credentials()


def synthesize(text: str, voice: str | None = None) -> bytes:
    """Text -> spoken audio (WAV bytes). Ultra-fast REST API key synthesis with Entra ID fallback."""
    voice_name = voice or settings.azure_speech_voice
    key = settings.azure_speech_key or settings.azure_ai_api_key

    if key:
        endpoint_url = _resolve_speech_endpoint()
        region = settings.azure_speech_region or settings.azure_location or "westeurope"
        locale = "-".join(voice_name.split("-")[:2]) if "-" in voice_name else "ro-RO"

        ssml = (
            f'<speak version="1.0" xml:lang="{locale}">'
            f'<voice xml:lang="{locale}" name="{voice_name}">{_escape(text)}</voice>'
            f"</speak>"
        )

        urls = []
        if endpoint_url:
            urls.append(f"{endpoint_url.rstrip('/')}/cognitiveservices/v1")
        urls.append(f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1")

        for url in urls:
            try:
                response = httpx.post(
                    url,
                    headers={
                        "Ocp-Apim-Subscription-Key": key,
                        "Content-Type": "application/ssml+xml",
                        "X-Microsoft-OutputFormat": TTS_FORMAT,
                        "User-Agent": "libra-academy",
                    },
                    content=ssml.encode("utf-8"),
                    timeout=10.0,
                )
                if response.status_code == 200 and response.content:
                    return response.content
            except Exception:
                continue

    endpoint_url = _resolve_speech_endpoint()
    if endpoint_url:
        return synthesize_speech(text, voice_name)

    raise SpeechUnavailable("Speech credentials or endpoint not available.")


def transcribe(audio: bytes, content_type: str = "audio/wav", language: str | None = None) -> dict:
    """Spoken audio -> text. Short-audio endpoint: up to about 60 seconds."""
    key, region = _credentials()
    language = language or settings.azure_speech_language

    url = (
        f"https://{region}.stt.speech.microsoft.com"
        f"/speech/recognition/conversation/cognitiveservices/v1"
    )
    response = httpx.post(
        url,
        params={"language": language, "format": "detailed"},
        headers={
            "Ocp-Apim-Subscription-Key": key,
            "Content-Type": f"{content_type}; codecs=audio/pcm; samplerate=16000",
            "Accept": "application/json",
        },
        content=audio,
        timeout=60.0,
    )
    if response.status_code != 200:
        raise SpeechUnavailable(
            f"Speech recognition failed: HTTP {response.status_code} — {response.text[:300]}"
        )

    data = response.json()
    best = (data.get("NBest") or [{}])[0]
    return {
        "status": data.get("RecognitionStatus"),
        "text": data.get("DisplayText") or best.get("Display", ""),
        "confidence": best.get("Confidence"),
        "duration_seconds": round(data.get("Duration", 0) / 10_000_000, 2),
        "language": language,
    }


def _escape(text: str) -> str:
    return (text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
