package expo.modules.djaudio

import android.content.Context
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.media.MediaPlayer
import android.media.audiofx.Equalizer
import android.media.audiofx.BassBoost
import android.media.audiofx.Visualizer
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DjAudioModule : Module() {
  private var player: MediaPlayer? = null
  private var eq: Equalizer? = null
  private var bassBoost: BassBoost? = null
  private var visualizer: Visualizer? = null
  private var currentUri: String? = null

  // True dual-deck foreground engine for DJ mode. Deck A and Deck B are
  // independent MediaPlayers with independent transport, gain, rate and FX.
  private val deckPlayers = arrayOfNulls<MediaPlayer>(2)
  private val deckEq = arrayOfNulls<Equalizer>(2)
  private val deckBass = arrayOfNulls<BassBoost>(2)
  private val deckUris = arrayOfNulls<String>(2)
  private val deckVisualizers = arrayOfNulls<Visualizer>(2)
  private val deckReady = BooleanArray(2) { false }
  private val deckLoading = BooleanArray(2) { false }
  private val deckLoadGeneration = IntArray(2) { 0 }
  private val deckFrames = Array(2) { IntArray(20) { 0 } }
  private val deckFrameLock = Any()
  private val mainHandler = Handler(Looper.getMainLooper())

  override fun definition() = ModuleDefinition {
    Name("KoroshDjAudioModule")
    Events("onAudioFrame")
    OnCreate {
      val moduleOwner = this@DjAudioModule
      KoroshMusicPlaybackService.frameSink = { values ->
        moduleOwner.sendEvent("onAudioFrame", mapOf("bars" to values))
      }
    }
    OnDestroy {
      KoroshMusicPlaybackService.frameSink = null
      for (i in 0..1) releaseDeckResources(i)
    }


    AsyncFunction("loadDeck") { deck: Int, uri: String ->
      val i = deck.coerceIn(0, 1)
      val generation = deckLoadGeneration[i] + 1
      deckLoadGeneration[i] = generation
      releaseDeckResources(i)
      deckLoadGeneration[i] = generation
      val context = appContext.reactContext ?: return@AsyncFunction false
      try {
        val mp = MediaPlayer()
        deckPlayers[i] = mp
        deckUris[i] = uri
        deckReady[i] = false
        deckLoading[i] = true
        mp.setDataSource(context, Uri.parse(uri))
        mp.setOnPreparedListener { prepared ->
          if (deckLoadGeneration[i] != generation || deckPlayers[i] !== prepared) {
            try { prepared.release() } catch (_: Exception) {}
          } else {
            deckReady[i] = true
            deckLoading[i] = false
            try {
              val session = prepared.audioSessionId
              val e = Equalizer(0, session)
              e.enabled = true
              deckEq[i] = e
              val bb = BassBoost(0, session)
              bb.enabled = false
              deckBass[i] = bb
              attachDeckVisualizer(i, session)
            } catch (_: Exception) {}
          }
        }
        mp.setOnErrorListener { failed, _, _ ->
          if (deckLoadGeneration[i] == generation && deckPlayers[i] === failed) {
            deckLoading[i] = false
            deckReady[i] = false
            releaseDeckResources(i)
          }
          true
        }
        mp.setOnCompletionListener { completed ->
          try { completed.seekTo(0) } catch (_: Exception) {}
        }
        // State is marked Loading before prepareAsync; callers must wait for onPrepared.
        mp.prepareAsync()
        true
      } catch (_: Exception) {
        if (deckLoadGeneration[i] == generation) releaseDeckResources(i)
        false
      }
    }
    AsyncFunction("playDeck") { deck: Int ->
      val i = deck.coerceIn(0,1)
      val p = deckPlayers[i] ?: return@AsyncFunction false
      if (!deckReady[i] || deckLoading[i]) return@AsyncFunction false
      try { if (!p.isPlaying) p.start(); true } catch (_: Exception) { false }
    }
    AsyncFunction("pauseDeck") { deck: Int ->
      val i = deck.coerceIn(0,1)
      val p = deckPlayers[i] ?: return@AsyncFunction false
      if (!deckReady[i] || deckLoading[i]) return@AsyncFunction false
      try { if (p.isPlaying) p.pause(); true } catch (_: Exception) { false }
    }
    AsyncFunction("stopDeck") { deck: Int ->
      val i = deck.coerceIn(0,1)
      val p = deckPlayers[i] ?: return@AsyncFunction false
      if (!deckReady[i] || deckLoading[i]) return@AsyncFunction false
      try { p.pause(); p.seekTo(0); true } catch (_: Exception) { false }
    }
    AsyncFunction("cueDeck") { deck: Int ->
      val i = deck.coerceIn(0,1)
      val p = deckPlayers[i] ?: return@AsyncFunction false
      if (!deckReady[i] || deckLoading[i]) return@AsyncFunction false
      try { p.pause(); p.seekTo(0); true } catch (_: Exception) { false }
    }
    AsyncFunction("seekDeck") { deck: Int, seconds: Double ->
      val i = deck.coerceIn(0,1)
      val p = deckPlayers[i] ?: return@AsyncFunction false
      if (!deckReady[i] || deckLoading[i]) return@AsyncFunction false
      try {
        val target = (p.currentPosition + seconds * 1000.0).toInt().coerceIn(0, p.duration.coerceAtLeast(0))
        p.seekTo(target)
        true
      } catch (_: Exception) { false }
    }
    AsyncFunction("setDeckVolume") { deck: Int, value: Double ->
      val i = deck.coerceIn(0,1)
      val p = deckPlayers[i] ?: return@AsyncFunction false
      if (!deckReady[i] || deckLoading[i]) return@AsyncFunction false
      try { val v=value.toFloat().coerceIn(0f,1f); p.setVolume(v,v); true } catch (_: Exception) { false }
    }
    AsyncFunction("setDeckRate") { deck: Int, value: Double ->
      val i = deck.coerceIn(0,1)
      val p = deckPlayers[i] ?: return@AsyncFunction false
      if (!deckReady[i] || deckLoading[i]) return@AsyncFunction false
      try {
        if (android.os.Build.VERSION.SDK_INT >= 23) {
          val params=p.playbackParams
          params.speed=value.toFloat().coerceIn(0.5f,2f)
          params.pitch=1f
          p.playbackParams=params
        }
        true
      } catch (_: Exception) { false }
    }
    AsyncFunction("setDeckEqBand") { deck: Int, band: Int, value: Double ->
      val e = deckEq[deck.coerceIn(0,1)] ?: return@AsyncFunction false
      try {
        val count=e.numberOfBands.toInt()
        if (count<=0) return@AsyncFunction false
        val b=band.coerceIn(0,count-1).toShort()
        val range=e.bandLevelRange
        val level=(range[0]+((range[1]-range[0])*((value.coerceIn(-100.0,100.0)+100.0)/200.0))).toInt()
          .coerceIn(range[0].toInt(),range[1].toInt()).toShort()
        e.setBandLevel(b,level)
        true
      } catch (_: Exception) { false }
    }
    AsyncFunction("setDeckBassBoost") { deck: Int, enabled: Boolean ->
      val b=deckBass[deck.coerceIn(0,1)] ?: return@AsyncFunction false
      try { b.setStrength(if(enabled) 900.toShort() else 0.toShort()); b.enabled=enabled; true } catch (_: Exception) { false }
    }
    AsyncFunction("getDeckStatus") { deck: Int ->
      val i=deck.coerceIn(0,1)
      val p=deckPlayers[i]
      mapOf(
        "loaded" to deckReady[i],
        "loading" to deckLoading[i],
        "playing" to (try { p?.isPlaying == true } catch (_: Exception) { false }),
        "positionMs" to (try { if (deckReady[i]) p?.currentPosition ?: 0 else 0 } catch (_: Exception) { 0 }),
        "durationMs" to (try { if (deckReady[i]) p?.duration ?: 0 else 0 } catch (_: Exception) { 0 }),
        "uri" to (deckUris[i] ?: "")
      )
    }

    AsyncFunction("listTracks") {
      val context = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, Any>>()
      KoroshMusicLibrary.list(context)
    }
    AsyncFunction("setMusicQueue") { items: List<Map<String, Any>> ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      val arr = org.json.JSONArray()
      items.forEach { item ->
        val uri = item["uri"]?.toString() ?: ""
        if (uri.isNotBlank()) arr.put(org.json.JSONObject().apply {
          put("uri", uri); put("title", item["title"]?.toString() ?: "آهنگ"); put("artist", item["artist"]?.toString() ?: "")
        })
      }
      KoroshMusicPlaybackService.action(context, KoroshMusicPlaybackService.ACTION_SET_QUEUE, Bundle().apply { putString(KoroshMusicPlaybackService.EXTRA_QUEUE, arr.toString()) })
      true
    }
    AsyncFunction("playMusicTrack") { uri: String, title: String, artist: String ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      KoroshMusicPlaybackService.play(context, uri, title, artist)
      true
    }
    AsyncFunction("pauseMusic") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      KoroshMusicPlaybackService.action(context, KoroshMusicPlaybackService.ACTION_PAUSE)
      true
    }
    AsyncFunction("resumeMusic") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      KoroshMusicPlaybackService.action(context, KoroshMusicPlaybackService.ACTION_RESUME)
      true
    }
    AsyncFunction("stopMusic") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      KoroshMusicPlaybackService.action(context, KoroshMusicPlaybackService.ACTION_STOP)
      true
    }
    AsyncFunction("getMusicStatus") {
      val context = appContext.reactContext ?: return@AsyncFunction mapOf("playing" to false, "uri" to "", "title" to "", "artist" to "")
      KoroshMusicPlaybackService.status(context)
    }

    AsyncFunction("load") { uri: String -> loadInternal(uri) }
    AsyncFunction("play") { val p = player ?: return@AsyncFunction false; try { p.start(); true } catch (_: Exception) { false } }
    AsyncFunction("pause") { val p = player ?: return@AsyncFunction false; try { p.pause(); true } catch (_: Exception) { false } }
    AsyncFunction("stop") { val p = player ?: return@AsyncFunction false; try { p.stop(); true } catch (_: Exception) { false } }
    AsyncFunction("seek") { seconds: Double ->
      val context = appContext.reactContext
      if (context != null && hasServiceTrack(context)) {
        val extras = Bundle().apply { putDouble(KoroshMusicPlaybackService.EXTRA_DELTA_SECONDS, seconds) }
        KoroshMusicPlaybackService.action(context, KoroshMusicPlaybackService.ACTION_SEEK_RELATIVE, extras)
        true
      } else {
        val p = player ?: return@AsyncFunction false
        try { val target = (p.currentPosition + (seconds * 1000.0)).toInt().coerceIn(0, p.duration.coerceAtLeast(0)); p.seekTo(target); true } catch (_: Exception) { false }
      }
    }
    AsyncFunction("setVolume") { value: Double ->
      val v = value.toFloat().coerceIn(0f,1f)
      val context = appContext.reactContext
      if (context != null && hasServiceTrack(context)) {
        KoroshMusicPlaybackService.action(context, KoroshMusicPlaybackService.ACTION_SET_VOLUME, Bundle().apply { putFloat(KoroshMusicPlaybackService.EXTRA_VALUE, v) }); true
      } else { val p = player ?: return@AsyncFunction false; try { p.setVolume(v,v); true } catch (_: Exception) { false } }
    }
    AsyncFunction("setRate") { value: Double ->
      val rate = value.toFloat().coerceIn(0.5f,2f)
      val context = appContext.reactContext
      if (context != null && hasServiceTrack(context)) {
        KoroshMusicPlaybackService.action(context, KoroshMusicPlaybackService.ACTION_SET_RATE, Bundle().apply { putFloat(KoroshMusicPlaybackService.EXTRA_VALUE, rate) }); true
      } else {
        val p = player ?: return@AsyncFunction false
        try { if (android.os.Build.VERSION.SDK_INT >= 23) { val params=p.playbackParams; params.speed=rate; params.pitch=1f; p.playbackParams=params }; true } catch (_: Exception) { false }
      }
    }
    AsyncFunction("setEqBand") { band: Int, value: Double ->
      val context = appContext.reactContext
      if (context != null && hasServiceTrack(context)) {
        KoroshMusicPlaybackService.action(context, KoroshMusicPlaybackService.ACTION_SET_EQ_BAND, Bundle().apply { putInt(KoroshMusicPlaybackService.EXTRA_BAND, band); putDouble(KoroshMusicPlaybackService.EXTRA_VALUE, value) }); true
      } else {
        val e = eq ?: return@AsyncFunction false
        try { val count=e.numberOfBands.toInt(); if (count<=0) return@AsyncFunction false; val b=band.coerceIn(0,count-1).toShort(); val range=e.bandLevelRange; val level=(range[0]+((range[1]-range[0])*((value.coerceIn(-100.0,100.0)+100.0)/200.0))).toInt().coerceIn(range[0].toInt(),range[1].toInt()).toShort(); e.setBandLevel(b,level); true } catch (_: Exception) { false }
      }
    }
    AsyncFunction("setBassBoost") { enabled: Boolean ->
      val context = appContext.reactContext
      if (context != null && hasServiceTrack(context)) {
        KoroshMusicPlaybackService.action(context, KoroshMusicPlaybackService.ACTION_SET_BASS_BOOST, Bundle().apply { putBoolean(KoroshMusicPlaybackService.EXTRA_ENABLED, enabled) }); true
      } else { val b=bassBoost ?: return@AsyncFunction false; try { b.setStrength(if (enabled) 900.toShort() else 0.toShort()); b.enabled=enabled; true } catch (_: Exception) { false } }
    }
    AsyncFunction("setEqPreset") { preset: Int ->
      val context = appContext.reactContext
      if (context != null && hasServiceTrack(context)) { KoroshMusicPlaybackService.action(context, KoroshMusicPlaybackService.ACTION_SET_EQ_PRESET, Bundle().apply { putInt(KoroshMusicPlaybackService.EXTRA_PRESET, preset) }); true }
      else { val e=eq ?: return@AsyncFunction false; try { val count=e.numberOfPresets.toInt(); if(count>0){e.usePreset(preset.coerceIn(0,count-1).toShort());true}else false } catch (_: Exception) { false } }
    }
    AsyncFunction("cue") {
      val context=appContext.reactContext
      if(context!=null&&hasServiceTrack(context)){KoroshMusicPlaybackService.action(context,KoroshMusicPlaybackService.ACTION_CUE);true}
      else {val p=player?:return@AsyncFunction false;try{p.seekTo(0);true}catch(_:Exception){false}}
    }
    AsyncFunction("sync") {
      val context=appContext.reactContext
      if(context!=null&&hasServiceTrack(context)){KoroshMusicPlaybackService.action(context,KoroshMusicPlaybackService.ACTION_SYNC);true}
      else {val p=player?:return@AsyncFunction false;try{if(android.os.Build.VERSION.SDK_INT>=23){val params=p.playbackParams;params.speed=1f;params.pitch=1f;p.playbackParams=params};true}catch(_:Exception){false}}
    }
  }

  private fun releaseDeckResources(index: Int) {
    val i = index.coerceIn(0, 1)
    try { deckVisualizers[i]?.setEnabled(false) } catch (_: Exception) {}
    try { deckVisualizers[i]?.setDataCaptureListener(null, 0, false, false) } catch (_: Exception) {}
    try { deckVisualizers[i]?.release() } catch (_: Exception) {}
    try { deckEq[i]?.release() } catch (_: Exception) {}
    try { deckBass[i]?.release() } catch (_: Exception) {}
    try { deckPlayers[i]?.release() } catch (_: Exception) {}
    deckVisualizers[i] = null
    deckEq[i] = null
    deckBass[i] = null
    deckPlayers[i] = null
    deckUris[i] = null
    deckReady[i] = false
    deckLoading[i] = false
    synchronized(deckFrameLock) { deckFrames[i] = IntArray(20) { 0 } }
  }

  private fun attachDeckVisualizer(index: Int, sessionId: Int) {
    val i = index.coerceIn(0, 1)
    try {
      try { deckVisualizers[i]?.setEnabled(false) } catch (_: Exception) {}
      try { deckVisualizers[i]?.release() } catch (_: Exception) {}
      val v = Visualizer(sessionId)
      val range = Visualizer.getCaptureSizeRange()
      val target = 1024.coerceIn(range[0], range[1])
      var size = Integer.highestOneBit(target)
      if (size < range[0]) size = range[0]
      v.captureSize = size.coerceAtMost(range[1])
      v.setDataCaptureListener(object : Visualizer.OnDataCaptureListener {
        override fun onWaveFormDataCapture(visualizer: Visualizer?, waveform: ByteArray?, samplingRate: Int) {}
        override fun onFftDataCapture(visualizer: Visualizer?, fft: ByteArray?, samplingRate: Int) {
          if (fft == null) return
          val ownIsPlaying = try { deckReady[i] && deckPlayers[i]?.isPlaying == true } catch (_: Exception) { false }
          val count = 20
          val half = fft.size / 2
          val own = IntArray(count) { 0 }
          for (bar in 0 until count) {
            val start = 2 + (bar * (half - 2) / count)
            val end = 2 + ((bar + 1) * (half - 2) / count)
            var peak = 0.0
            var j = start
            while (j < end && j + 1 < fft.size) {
              val re = fft[j].toInt(); val im = fft[j + 1].toInt()
              val magnitude = kotlin.math.sqrt((re * re + im * im).toDouble()) / 181.0
              if (magnitude > peak) peak = magnitude
              j += 2
            }
            own[bar] = (peak * 100.0).toInt().coerceIn(0, 100)
          }
          if (!ownIsPlaying) own.fill(0)
          val merged = synchronized(deckFrameLock) {
            deckFrames[i] = own
            val active = (0..1).filter { ix -> try { deckReady[ix] && deckPlayers[ix]?.isPlaying == true } catch (_: Exception) { false } }
            if (active.isEmpty()) IntArray(count) { 0 }.toList()
            else IntArray(count) { col -> active.maxOfOrNull { ix -> deckFrames[ix][col] } ?: 0 }.toList()
          }
          mainHandler.post { KoroshMusicPlaybackService.frameSink?.invoke(merged) }
        }
      }, Visualizer.getMaxCaptureRate().coerceAtMost(20000), false, true)
      v.enabled = true
      deckVisualizers[i] = v
    } catch (_: Exception) {
      deckVisualizers[i] = null
    }
  }

  private fun hasServiceTrack(context: Context): Boolean {
    return (KoroshMusicPlaybackService.status(context)["uri"] as? String).orEmpty().isNotBlank()
  }

  private fun loadInternal(uriString: String): Boolean {
    releaseAll()
    currentUri = uriString
    val context = appContext.reactContext ?: return false
    return try {
      val p = MediaPlayer()
      p.setDataSource(context, Uri.parse(uriString))
      p.setOnPreparedListener { mp ->
        try { attachEffects(mp.audioSessionId) } catch (_: Exception) {}
      }
      p.setOnCompletionListener { mp -> mp.seekTo(0) }
      p.prepareAsync()
      player = p
      true
    } catch (_: Exception) { false }
  }

  private fun attachEffects(sessionId: Int) {
    try {
      eq?.release()
      eq = Equalizer(1000, sessionId)
      eq?.enabled = true
      try { bassBoost?.release() } catch (_: Exception) {}
      bassBoost = BassBoost(1000, sessionId)
    } catch (_: Exception) { eq = null }
    try {
      visualizer?.release()
      val v = Visualizer(sessionId)
      val range = Visualizer.getCaptureSizeRange()
      val size = minOf(Visualizer.getMaxCaptureRate().coerceAtLeast(8000), 16384).let { _ ->
        var target = 1024
        while (target < range[0]) target *= 2
        while (target * 2 <= range[1] && target < 2048) target *= 2
        target.coerceIn(range[0], range[1])
      }
      v.captureSize = size
      v.setDataCaptureListener(object: Visualizer.OnDataCaptureListener {
        override fun onWaveFormDataCapture(vs: Visualizer?, waveform: ByteArray?, samplingRate: Int) {}
        override fun onFftDataCapture(vs: Visualizer?, fft: ByteArray?, samplingRate: Int) {
          if (fft == null) return
          val bins = 20
          val bars = MutableList(bins){0}
          val half = fft.size / 2
          for (i in 0 until bins) {
            val start = 2 + (i * (half-2) / bins)
            val end = 2 + ((i+1) * (half-2) / bins)
            var peak = 0.0
            for (j in start until end) {
              if (j+1 >= fft.size) break
              val re = fft[j].toInt(); val im = fft[j+1].toInt()
              val mag = kotlin.math.sqrt((re*re + im*im).toDouble()) / 181.0
              if (mag > peak) peak = mag
            }
            bars[i] = (peak*100.0).toInt().coerceIn(0,100)
          }
          sendEvent("onAudioFrame", mapOf("bars" to bars))
        }
      }, Visualizer.getMaxCaptureRate().coerceAtMost(20000), false, true)
      v.enabled = true
      visualizer = v
    } catch (_: Exception) { visualizer = null }
  }

  private fun releaseAll() {
    try { visualizer?.setEnabled(false) } catch (_: Exception) {}
    try { visualizer?.release() } catch (_: Exception) {}
    visualizer = null
    try { eq?.release() } catch (_: Exception) {}
    eq = null
    try { player?.release() } catch (_: Exception) {}
    player = null
  }

  override fun onDestroy() { releaseAll(); super.onDestroy() }
}
