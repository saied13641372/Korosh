package expo.modules.livemic

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.media.AudioAttributes
import android.media.AudioManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.atomic.AtomicBoolean

class LiveMicModule : Module() {
  private val running = AtomicBoolean(false)
  private var recordThread: Thread? = null
  private var recorder: AudioRecord? = null
  private var track: AudioTrack? = null
  private var socket: DatagramSocket? = null

  override fun definition() = ModuleDefinition {
    Name("LiveMicModule")
    AsyncFunction("start") { options: Map<String, Any?> ->
      stopInternal()
      val transport = (options["transport"] as? String ?: "dual").lowercase()
      val host = options["host"] as? String
      val port = (options["port"] as? Number)?.toInt() ?: 4210
      if (transport == "wifi" || transport == "dual") {
        if (host.isNullOrBlank()) return@AsyncFunction mapOf("started" to false, "transport" to transport, "sampleRate" to 16000, "packetFormat" to "KNLM-PCM16", "error" to "WIFI_HOST_REQUIRED")
      }
      val sampleRate = 16000
      val min = AudioRecord.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
      if (min <= 0) return@AsyncFunction mapOf("started" to false, "transport" to transport, "sampleRate" to sampleRate, "packetFormat" to "KNLM-PCM16", "error" to "AUDIO_RECORD_UNSUPPORTED")
      try {
        recorder = AudioRecord(MediaRecorder.AudioSource.MIC, sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, maxOf(min * 2, 4096))
        if (transport == "bluetooth" || transport == "dual") {
          val outMin = AudioTrack.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT)
          track = if (Build.VERSION.SDK_INT >= 21) AudioTrack(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build(), AudioFormat.Builder().setSampleRate(sampleRate).setEncoding(AudioFormat.ENCODING_PCM_16BIT).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build(), maxOf(outMin * 2, 4096), AudioTrack.MODE_STREAM, AudioManager.AUDIO_SESSION_ID_GENERATE) else null
          track?.play()
        }
        if (transport == "wifi" || transport == "dual") socket = DatagramSocket()
        recorder?.startRecording()
        running.set(true)
        val destination = if (host.isNullOrBlank()) null else InetAddress.getByName(host)
        recordThread = Thread {
          val buffer = ByteArray(2048)
          var seq = 0
          while (running.get()) {
            val read = try { recorder?.read(buffer, 0, buffer.size) ?: -1 } catch (_:Exception) { -1 }
            if (read <= 0) continue
            if (transport == "bluetooth" || transport == "dual") try { track?.write(buffer, 0, read) } catch (_:Exception) {}
            if ((transport == "wifi" || transport == "dual") && destination != null) {
              try {
                // KNLM header: magic(4), version(1), sequence(4), rate(4), channels(1), PCM16LE payload.
                val header = ByteBuffer.allocate(14).order(ByteOrder.BIG_ENDIAN)
                header.put(byteArrayOf('K'.code.toByte(),'N'.code.toByte(),'L'.code.toByte(),'M'.code.toByte()))
                header.put(1)
                header.putInt(seq++)
                header.putInt(sampleRate)
                header.put(1)
                val packetBytes = ByteArray(14 + read)
                System.arraycopy(header.array(),0,packetBytes,0,14)
                System.arraycopy(buffer,0,packetBytes,14,read)
                socket?.send(DatagramPacket(packetBytes,packetBytes.size,destination,port))
              } catch (_:Exception) {}
            }
          }
        }.also { it.name = "KoroshNovaLiveMic"; it.start() }
        mapOf("started" to true, "transport" to transport, "sampleRate" to sampleRate, "packetFormat" to "KNLM-PCM16")
      } catch (_:SecurityException) {
        stopInternal(); mapOf("started" to false, "transport" to transport, "sampleRate" to sampleRate, "packetFormat" to "KNLM-PCM16", "error" to "RECORD_AUDIO_PERMISSION_REQUIRED")
      } catch (e:Exception) {
        stopInternal(); mapOf("started" to false, "transport" to transport, "sampleRate" to sampleRate, "packetFormat" to "KNLM-PCM16", "error" to (e.message ?: "START_FAILED"))
      }
    }
    AsyncFunction("stop") { stopInternal(); null }
    AsyncFunction("isRunning") { running.get() }
  }

  private fun stopInternal() {
    running.set(false)
    try { recorder?.stop() } catch (_:Exception) {}
    try { recorder?.release() } catch (_:Exception) {}
    try { track?.stop() } catch (_:Exception) {}
    try { track?.release() } catch (_:Exception) {}
    try { socket?.close() } catch (_:Exception) {}
    recorder = null; track = null; socket = null; recordThread = null
  }
}
