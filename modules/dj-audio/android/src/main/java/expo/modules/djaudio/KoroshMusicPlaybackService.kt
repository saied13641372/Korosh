package expo.modules.djaudio

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.media.AudioFocusRequest
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.audiofx.BassBoost
import android.media.audiofx.Equalizer
import android.media.audiofx.Visualizer
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.IBinder
import android.os.PowerManager
import org.json.JSONArray
import org.json.JSONObject

/** Foreground playback owner for Avaye Nova. It is deliberately separate from the React screen lifecycle. */
class KoroshMusicPlaybackService : Service() {
  companion object {
    const val ACTION_PLAY_TRACK = "com.koroshnova.music.PLAY_TRACK"
    const val ACTION_PAUSE = "com.koroshnova.music.PAUSE"
    const val ACTION_RESUME = "com.koroshnova.music.RESUME"
    const val ACTION_STOP = "com.koroshnova.music.STOP"
    const val ACTION_SET_VOLUME = "com.koroshnova.music.SET_VOLUME"
    const val ACTION_SET_RATE = "com.koroshnova.music.SET_RATE"
    const val ACTION_SEEK_RELATIVE = "com.koroshnova.music.SEEK_RELATIVE"
    const val ACTION_CUE = "com.koroshnova.music.CUE"
    const val ACTION_SYNC = "com.koroshnova.music.SYNC"
    const val ACTION_SET_EQ_BAND = "com.koroshnova.music.SET_EQ_BAND"
    const val ACTION_SET_BASS_BOOST = "com.koroshnova.music.SET_BASS_BOOST"
    const val ACTION_SET_EQ_PRESET = "com.koroshnova.music.SET_EQ_PRESET"
    const val EXTRA_BAND = "eq_band"
    const val EXTRA_VALUE = "numeric_value"
    const val EXTRA_ENABLED = "enabled_value"
    const val EXTRA_DELTA_SECONDS = "delta_seconds"
    const val EXTRA_PRESET = "eq_preset"
    const val EXTRA_URI = "track_uri"
    const val EXTRA_TITLE = "track_title"
    const val EXTRA_ARTIST = "track_artist"
    const val EXTRA_QUEUE = "track_queue"
    private const val CHANNEL_ID = "korosh_nova_music_playback"
    private const val NOTIFICATION_ID = 7304
    private const val PREFS = "korosh_nova_music_playback"
    @Volatile var frameSink: ((List<Int>) -> Unit)? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    fun play(context: Context, uri: String, title: String, artist: String) {
      val intent = Intent(context, KoroshMusicPlaybackService::class.java).apply {
        action = ACTION_PLAY_TRACK
        putExtra(EXTRA_URI, uri)
        putExtra(EXTRA_TITLE, title)
        putExtra(EXTRA_ARTIST, artist)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent)
      else context.startService(intent)
    }

    fun action(context: Context, action: String, extras: Bundle? = null) {
      val intent = Intent(context, KoroshMusicPlaybackService::class.java).setAction(action)
      if (extras != null) intent.putExtras(extras)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && action == ACTION_RESUME) context.startForegroundService(intent)
      else context.startService(intent)
    }

    fun status(context: Context): Map<String, Any> {
      val p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      return mapOf(
        "playing" to p.getBoolean("playing", false),
        "loading" to p.getBoolean("loading", false),
        "uri" to (p.getString("uri", "") ?: ""),
        "title" to (p.getString("title", "") ?: ""),
        "artist" to (p.getString("artist", "") ?: "")
      )
    }

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
  }

  private var player: MediaPlayer? = null
  private var equalizer: Equalizer? = null
  private var bassBoost: BassBoost? = null
  private var visualizer: Visualizer? = null
  private var prepared = false
  private var pauseRequested = false
  private var trackUri = ""
  private var trackTitle = "آوای نوا"
  private var trackArtist = ""
  private var queue: List<QueueTrack> = emptyList()
  private var audioManager: AudioManager? = null
  private var audioFocusListener: AudioManager.OnAudioFocusChangeListener? = null
  private var audioFocusRequest: AudioFocusRequest? = null
  private val prefs by lazy { getSharedPreferences(PREFS, Context.MODE_PRIVATE) }

  private data class QueueTrack(val uri:String,val title:String,val artist:String)

  private fun loadQueueFromPrefs(){
    queue = try {
      val raw=prefs.getString("queue_json", "[]") ?: "[]"
      val arr=JSONArray(raw)
      List(arr.length()){i->val o=arr.getJSONObject(i);QueueTrack(o.optString("uri"),o.optString("title"),o.optString("artist"))}.filter{it.uri.isNotBlank()}
    } catch (_:Exception){ emptyList() }
  }

  private fun saveQueue(items:List<QueueTrack>){
    queue=items
    val arr=JSONArray(); items.forEach{t->arr.put(JSONObject().apply{put("uri",t.uri);put("title",t.title);put("artist",t.artist)})}
    prefs.edit().putString("queue_json",arr.toString()).apply()
  }

  private fun requestAudioFocus(){
    try{
      val am=getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val listener=AudioManager.OnAudioFocusChangeListener{change->
        when(change){
          AudioManager.AUDIOFOCUS_GAIN -> try{ if(!pauseRequested && player?.isPlaying==false){player?.start();saveStatus(true,false);updateNotification(true)} }catch(_:Exception){}
          AudioManager.AUDIOFOCUS_LOSS -> { /* Do not terminate the service; Android owns focus policy. */ }
          AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> { /* Keep state; do not destroy playback service. */ }
          AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> try{player?.setVolume(.35f,.35f)}catch(_:Exception){}
        }
      }
      audioManager=am; audioFocusListener=listener
      if(Build.VERSION.SDK_INT>=26){
        val req=AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN).setAudioAttributes(android.media.AudioAttributes.Builder().setUsage(android.media.AudioAttributes.USAGE_MEDIA).setContentType(android.media.AudioAttributes.CONTENT_TYPE_MUSIC).build()).setOnAudioFocusChangeListener(listener).build()
        audioFocusRequest=req; am.requestAudioFocus(req)
      } else @Suppress("DEPRECATION") run { am.requestAudioFocus(listener,AudioManager.STREAM_MUSIC,AudioManager.AUDIOFOCUS_GAIN) }
    }catch(_:Exception){}
  }

  private fun abandonAudioFocus(){
    try{val am=audioManager;val l=audioFocusListener;if(am!=null&&l!=null){if(Build.VERSION.SDK_INT>=26){audioFocusRequest?.let{am.abandonAudioFocusRequest(it)}}else @Suppress("DEPRECATION") run{am.abandonAudioFocus(l)}}}catch(_:Exception){}
    audioManager=null; audioFocusListener=null; audioFocusRequest=null
  }

  private fun playNextQueued(){
    if(queue.isEmpty()){ stopPlaybackAndService(); return }
    val current=queue.indexOfFirst{it.uri==trackUri}
    val next=queue[((if(current<0)0 else current)+1)%queue.size]
    trackUri=next.uri; trackTitle=next.title.ifBlank{"آوای نوا"}; trackArtist=next.artist
    pauseRequested=false; saveStatus(false,true); startForeground(NOTIFICATION_ID,buildNotification(false)); prepareAndPlay(trackUri)
  }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent == null) {
      loadQueueFromPrefs()
      trackUri = prefs.getString("uri", "") ?: ""
      trackTitle = prefs.getString("title", "آوای نوا") ?: "آوای نوا"
      trackArtist = prefs.getString("artist", "") ?: ""
      val shouldRestore = prefs.getBoolean("playing", false) || prefs.getBoolean("loading", false)
      if (trackUri.isBlank() || !shouldRestore) {
        stopPlaybackAndService()
        return START_NOT_STICKY
      }
    }
    when (intent?.action ?: ACTION_RESUME) {
      ACTION_SET_QUEUE -> {
        val raw=intent?.getStringExtra(EXTRA_QUEUE) ?: "[]"
        try{val arr=JSONArray(raw);val items=List(arr.length()){i->val o=arr.getJSONObject(i);QueueTrack(o.optString("uri"),o.optString("title"),o.optString("artist"))}.filter{it.uri.isNotBlank()};saveQueue(items)}catch(_:Exception){saveQueue(emptyList())}
      }
      ACTION_PLAY_TRACK -> {
        trackUri = intent?.getStringExtra(EXTRA_URI) ?: ""
        trackTitle = intent?.getStringExtra(EXTRA_TITLE) ?: "آوای نوا"
        trackArtist = intent?.getStringExtra(EXTRA_ARTIST) ?: ""
        if (trackUri.isBlank()) {
          stopPlaybackAndService()
          return START_NOT_STICKY
        }
        pauseRequested = false
        if(queue.isEmpty()) loadQueueFromPrefs()
        requestAudioFocus()
        saveStatus(false, loading = true)
        startForeground(NOTIFICATION_ID, buildNotification(isPlaying = false))
        prepareAndPlay(trackUri)
      }
      ACTION_PAUSE -> {
        pauseRequested = true
        try { if (player?.isPlaying == true) player?.pause() } catch (_: Exception) {}
        saveStatus(false, loading = false)
        updateNotification(false)
      }
      ACTION_RESUME -> {
        if (trackUri.isBlank()) {
          trackUri = prefs.getString("uri", "") ?: ""
          trackTitle = prefs.getString("title", "آوای نوا") ?: "آوای نوا"
          trackArtist = prefs.getString("artist", "") ?: ""
        }
        if (trackUri.isBlank()) {
          stopPlaybackAndService()
          return START_NOT_STICKY
        }
        pauseRequested = false
        requestAudioFocus()
        startForeground(NOTIFICATION_ID, buildNotification(isPlaying = false))
        val p = player
        if (p != null && prepared) {
          try { if (!p.isPlaying) p.start(); saveStatus(true, loading = false); updateNotification(true) }
          catch (_: Exception) { saveStatus(false, loading = true); prepareAndPlay(trackUri) }
        } else { saveStatus(false, loading = true); prepareAndPlay(trackUri) }
      }
      ACTION_SET_VOLUME -> {
        val value = (intent?.getFloatExtra(EXTRA_VALUE, prefs.getFloat("volume", 1f)) ?: 1f).coerceIn(0f, 1f)
        prefs.edit().putFloat("volume", value).apply()
        try { player?.setVolume(value, value) } catch (_: Exception) {}
      }
      ACTION_SET_RATE -> {
        val rate = (intent?.getFloatExtra(EXTRA_VALUE, prefs.getFloat("rate", 1f)) ?: 1f).coerceIn(0.5f, 2f)
        prefs.edit().putFloat("rate", rate).apply()
        applyRate(rate)
      }
      ACTION_SEEK_RELATIVE -> {
        val delta = intent?.getDoubleExtra(EXTRA_DELTA_SECONDS, 0.0) ?: 0.0
        try { player?.let { p -> if (prepared) p.seekTo((p.currentPosition + (delta * 1000.0)).toInt().coerceIn(0, p.duration.coerceAtLeast(0))) } } catch (_: Exception) {}
      }
      ACTION_CUE -> { try { if (prepared) player?.seekTo(0) } catch (_: Exception) {} }
      ACTION_SYNC -> { prefs.edit().putFloat("rate", 1f).apply(); applyRate(1f) }
      ACTION_SET_EQ_BAND -> {
        val band = intent?.getIntExtra(EXTRA_BAND, 0) ?: 0
        val value = (intent?.getDoubleExtra(EXTRA_VALUE, 0.0) ?: 0.0).coerceIn(-100.0, 100.0)
        prefs.edit().putFloat("eq_band_$band", value.toFloat()).putInt("eq_preset", -1).apply()
        applyEqBand(band, value.toFloat())
      }
      ACTION_SET_BASS_BOOST -> {
        val enabled = intent?.getBooleanExtra(EXTRA_ENABLED, false) ?: false
        prefs.edit().putBoolean("bass_boost", enabled).apply()
        applyBassBoost(enabled)
      }
      ACTION_SET_EQ_PRESET -> {
        val preset = intent?.getIntExtra(EXTRA_PRESET, -1) ?: -1
        prefs.edit().putInt("eq_preset", preset).apply()
        try {
          val e = equalizer
          val count = e?.numberOfPresets?.toInt() ?: 0
          if (preset >= 0 && count > 0) e?.usePreset(preset.coerceIn(0, count - 1).toShort())
        } catch (_: Exception) {}
      }
      ACTION_STOP -> {
        stopPlaybackAndService()
        return START_NOT_STICKY
      }
    }
    return START_STICKY
  }

  private fun prepareAndPlay(uri: String) {
    releasePlayer()
    try {
      val audioAttributes = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_MEDIA)
        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
        .build()
      val p = MediaPlayer()
      p.setAudioAttributes(audioAttributes)
      p.setWakeMode(applicationContext, PowerManager.PARTIAL_WAKE_LOCK)
      p.setOnPreparedListener { mp ->
        prepared = true
        try { attachPlaybackEffects(mp.audioSessionId) } catch (_: Exception) {}
        val savedVolume = prefs.getFloat("volume", 1f).coerceIn(0f, 1f)
        try { mp.setVolume(savedVolume, savedVolume) } catch (_: Exception) {}
        applyRate(prefs.getFloat("rate", 1f).coerceIn(0.5f, 2f))
        if (pauseRequested) {
          saveStatus(false, loading = false)
          updateNotification(false)
          return@setOnPreparedListener
        }
        try {
          mp.start()
          saveStatus(true, loading = false)
          updateNotification(true)
        } catch (_: Exception) {
          saveStatus(false, loading = false)
          updateNotification(false)
        }
      }
      p.setOnCompletionListener {
        // Avaye Nova is a continuous player: completion advances to the next queued track.
        releasePlayer()
        playNextQueued()
      }
      p.setOnErrorListener { _, _, _ ->
        releasePlayer()
        if(queue.size>1) playNextQueued() else { saveStatus(false, loading = false); stopForeground(STOP_FOREGROUND_REMOVE); stopSelf() }
        true
      }
      player = p
      p.setDataSource(this, Uri.parse(uri))
      p.prepareAsync()
    } catch (_: Exception) {
      saveStatus(false, loading = false)
      releasePlayer()
      stopForeground(STOP_FOREGROUND_REMOVE)
      stopSelf()
    }
  }

  private fun applyRate(rate: Float) {
    try {
      val p = player ?: return
      if (Build.VERSION.SDK_INT >= 23 && prepared) {
        val params = p.playbackParams
        params.speed = rate.coerceIn(0.5f, 2f)
        params.pitch = 1f
        p.playbackParams = params
      }
    } catch (_: Exception) {}
  }

  private fun applyEqBand(band: Int, value: Float) {
    try {
      val e = equalizer ?: return
      val count = e.numberOfBands.toInt()
      if (count <= 0) return
      val b = band.coerceIn(0, count - 1).toShort()
      val range = e.bandLevelRange
      val normalized = value.coerceIn(-100f, 100f)
      val level = (range[0] + ((range[1] - range[0]) * ((normalized + 100f) / 200f))).toInt()
        .coerceIn(range[0].toInt(), range[1].toInt()).toShort()
      e.setBandLevel(b, level)
    } catch (_: Exception) {}
  }

  private fun applyBassBoost(enabled: Boolean) {
    try {
      val b = bassBoost ?: return
      b.setStrength(if (enabled) 900.toShort() else 0.toShort())
      b.enabled = enabled
    } catch (_: Exception) {}
  }

  private fun attachPlaybackEffects(sessionId: Int) {
    releaseEffects()
    try {
      val e = Equalizer(1000, sessionId)
      equalizer = e
      e.enabled = true
      val preset = prefs.getInt("eq_preset", -1)
      val count = e.numberOfPresets.toInt()
      if (preset >= 0 && count > 0) {
        e.usePreset(preset.coerceIn(0, count - 1).toShort())
      } else {
        val bandCount = e.numberOfBands.toInt().coerceAtMost(4)
        for (band in 0 until bandCount) applyEqBand(band, prefs.getFloat("eq_band_$band", 0f))
      }
    } catch (_: Exception) { try { equalizer?.release() } catch (_: Exception) {}; equalizer = null }
    try {
      bassBoost = BassBoost(1000, sessionId).also { it.enabled = false }
      applyBassBoost(prefs.getBoolean("bass_boost", false))
    } catch (_: Exception) { bassBoost = null }
    try {
      val v = Visualizer(sessionId)
      val range = Visualizer.getCaptureSizeRange()
      v.captureSize = 1024.coerceIn(range[0], range[1])
      v.setDataCaptureListener(object : Visualizer.OnDataCaptureListener {
        override fun onWaveFormDataCapture(visualizer: Visualizer?, waveform: ByteArray?, samplingRate: Int) {}
        override fun onFftDataCapture(visualizer: Visualizer?, fft: ByteArray?, samplingRate: Int) {
          if (fft == null) return
          // When Avaye Nava is paused, do not overwrite the active DJ Decks' FFT frames.
          val outputActive = try { player?.isPlaying == true && prepared } catch (_: Exception) { false }
          if (!outputActive) return
          val bins = 24
          val half = fft.size / 2
          val values = MutableList(bins) { 0 }
          for (i in 0 until bins) {
            val start = 2 + (i * (half - 2) / bins)
            val end = 2 + ((i + 1) * (half - 2) / bins)
            var peak = 0.0
            for (j in start until end) {
              if (j + 1 >= fft.size) break
              val re = fft[j].toInt(); val im = fft[j + 1].toInt()
              val mag = kotlin.math.sqrt((re * re + im * im).toDouble()) / 181.0
              if (mag > peak) peak = mag
            }
            values[i] = (peak * 100.0).toInt().coerceIn(0, 100)
          }
          mainHandler.post { frameSink?.invoke(values) }
        }
      }, Visualizer.getMaxCaptureRate().coerceAtMost(20000), false, true)
      v.enabled = true
      visualizer = v
    } catch (_: Exception) { visualizer = null }
  }

  private fun releaseEffects() {
    try { visualizer?.enabled = false } catch (_: Exception) {}
    try { visualizer?.release() } catch (_: Exception) {}
    visualizer = null
    try { bassBoost?.release() } catch (_: Exception) {}
    bassBoost = null
    try { equalizer?.release() } catch (_: Exception) {}
    equalizer = null
  }

  private fun saveStatus(playing: Boolean, loading: Boolean = false) {
    prefs.edit()
      .putString("uri", trackUri)
      .putString("title", trackTitle)
      .putString("artist", trackArtist)
      .putBoolean("playing", playing)
      .putBoolean("loading", loading)
      .apply()
  }

  private fun updateNotification(isPlaying: Boolean) {
    try {
      val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.notify(NOTIFICATION_ID, buildNotification(isPlaying))
    } catch (_: Exception) {}
  }

  private fun buildNotification(isPlaying: Boolean): Notification {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val contentIntent = launchIntent?.let {
      PendingIntent.getActivity(this, 7305, it, pendingIntentFlags())
    }
    val toggleAction = if (isPlaying) ACTION_PAUSE else ACTION_RESUME
    val toggleLabel = if (isPlaying) "توقف موقت" else "ادامه پخش"
    val toggleIcon = if (isPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play
    val toggleIntent = PendingIntent.getService(
      this, 7306, Intent(this, KoroshMusicPlaybackService::class.java).setAction(toggleAction), pendingIntentFlags()
    )
    val stopIntent = PendingIntent.getService(
      this, 7307, Intent(this, KoroshMusicPlaybackService::class.java).setAction(ACTION_STOP), pendingIntentFlags()
    )
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, CHANNEL_ID)
      else Notification.Builder(this).setPriority(Notification.PRIORITY_LOW)
    builder.setSmallIcon(android.R.drawable.ic_media_play)
      .setContentTitle(if (trackTitle.isBlank()) "آوای نوا" else trackTitle)
      .setContentText(if (trackArtist.isBlank()) "کوروش نوا • پخش موسیقی" else "کوروش نوا • $trackArtist")
      .setCategory(Notification.CATEGORY_TRANSPORT)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .addAction(toggleIcon, toggleLabel, toggleIntent)
      .addAction(android.R.drawable.ic_media_stop, "پایان پخش", stopIntent)
    if (contentIntent != null) builder.setContentIntent(contentIntent)
    return builder.build()
  }

  private fun pendingIntentFlags(): Int {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    else PendingIntent.FLAG_UPDATE_CURRENT
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(CHANNEL_ID, "پخش موسیقی آوای نوا", NotificationManager.IMPORTANCE_LOW).apply {
        description = "اعلان دائمی برای ادامه پخش موسیقی در پس‌زمینه"
        setShowBadge(false)
      }
      (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(channel)
    }
  }

  private fun releasePlayer() {
    releaseEffects()
    try { player?.setOnPreparedListener(null) } catch (_: Exception) {}
    try { player?.setOnCompletionListener(null) } catch (_: Exception) {}
    try { player?.setOnErrorListener(null) } catch (_: Exception) {}
    try { player?.stop() } catch (_: Exception) {}
    try { player?.release() } catch (_: Exception) {}
    player = null
    prepared = false
  }

  private fun stopPlaybackAndService() {
    releasePlayer()
    abandonAudioFocus()
    prefs.edit().putBoolean("playing", false).putBoolean("loading", false).apply()
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    // Keep playing if the user dismisses the app task from Recents.
    super.onTaskRemoved(rootIntent)
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    releasePlayer(); abandonAudioFocus(); super.onDestroy()
  }


}
