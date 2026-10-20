package expo.modules.noravoice

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.media.AudioManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Locale

class NoraVoiceModule : Module() {
  private var recognizer: SpeechRecognizer? = null
  private var tts: TextToSpeech? = null

  override fun definition() = ModuleDefinition {
    Name("NoraVoiceModule")
    Events("onNoraSpeech")

    AsyncFunction("start") { preferOffline: Boolean ->
      val ctx = appContext.reactContext ?: return@AsyncFunction false
      if (!SpeechRecognizer.isRecognitionAvailable(ctx)) return@AsyncFunction false
      if (preferOffline && (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || !SpeechRecognizer.isOnDeviceRecognitionAvailable(ctx))) {
        sendEvent("onNoraSpeech", mapOf("type" to "offlineUnavailable"))
        return@AsyncFunction false
      }
      try {
        recognizer?.destroy()
        recognizer = if (preferOffline) {
          SpeechRecognizer.createOnDeviceSpeechRecognizer(ctx)
        } else {
          SpeechRecognizer.createSpeechRecognizer(ctx)
        }
        recognizer?.setRecognitionListener(object : RecognitionListener {
          override fun onReadyForSpeech(params: android.os.Bundle?) { sendEvent("onNoraSpeech", mapOf("type" to "ready")) }
          override fun onBeginningOfSpeech() { sendEvent("onNoraSpeech", mapOf("type" to "begin")) }
          override fun onRmsChanged(rmsdB: Float) { sendEvent("onNoraSpeech", mapOf("type" to "level", "value" to rmsdB)) }
          override fun onBufferReceived(buffer: ByteArray?) {}
          override fun onEndOfSpeech() { sendEvent("onNoraSpeech", mapOf("type" to "end")) }
          override fun onError(error: Int) { sendEvent("onNoraSpeech", mapOf("type" to "error", "code" to error)) }
          override fun onResults(results: android.os.Bundle?) {
            val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull().orEmpty()
            sendEvent("onNoraSpeech", mapOf("type" to "result", "text" to text))
          }
          override fun onPartialResults(partialResults: android.os.Bundle?) {
            val text = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull().orEmpty()
            sendEvent("onNoraSpeech", mapOf("type" to "partial", "text" to text))
          }
          override fun onEvent(eventType: Int, params: android.os.Bundle?) {}
        })
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
          putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
          putExtra(RecognizerIntent.EXTRA_LANGUAGE, "fa-IR")
          putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
          putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
          putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, preferOffline)
        }
        recognizer?.startListening(intent)
        true
      } catch (_: Exception) {
        try { recognizer?.cancel() } catch (_: Exception) {}
        try { recognizer?.destroy() } catch (_: Exception) {}
        recognizer = null
        false
      }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("stop") {
      try { recognizer?.stopListening(); true } catch (_: Exception) { false }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("speak") { text: String, promise: Promise ->
      val ctx = appContext.reactContext
      if (ctx == null) {
        promise.resolve(false)
      } else {
        val engine = tts
        if (engine != null) {
          val language = engine.setLanguage(Locale("fa", "IR"))
          val supported = language != TextToSpeech.LANG_MISSING_DATA && language != TextToSpeech.LANG_NOT_SUPPORTED
          val result = if (supported) engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, "nora-response") else TextToSpeech.ERROR
          promise.resolve(result == TextToSpeech.SUCCESS)
        } else {
          tts = TextToSpeech(ctx) { status ->
            val ready = tts
            if (status != TextToSpeech.SUCCESS || ready == null) {
              promise.resolve(false)
            } else {
              val language = ready.setLanguage(Locale("fa", "IR"))
              val supported = language != TextToSpeech.LANG_MISSING_DATA && language != TextToSpeech.LANG_NOT_SUPPORTED
              val result = if (supported) ready.speak(text, TextToSpeech.QUEUE_FLUSH, null, "nora-response") else TextToSpeech.ERROR
              promise.resolve(result == TextToSpeech.SUCCESS)
            }
          }
        }
      }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("setSpeaker") { speaker:Boolean ->
      val ctx=appContext.reactContext ?: return@AsyncFunction false
      val am=ctx.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      @Suppress("DEPRECATION") am.isSpeakerphoneOn=speaker
      true
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("online") {
      val ctx=appContext.reactContext ?: return@AsyncFunction false
      val cm=ctx.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
      val n=cm.activeNetwork ?: return@AsyncFunction false
      val caps=cm.getNetworkCapabilities(n) ?: return@AsyncFunction false
      caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }
    OnDestroy {
      Handler(Looper.getMainLooper()).post {
        try { recognizer?.cancel() } catch (_: Exception) {}
        try { recognizer?.destroy() } catch (_: Exception) {}
        recognizer = null
        try { tts?.stop() } catch (_: Exception) {}
        try { tts?.shutdown() } catch (_: Exception) {}
        tts = null
      }
    }
  }
}
