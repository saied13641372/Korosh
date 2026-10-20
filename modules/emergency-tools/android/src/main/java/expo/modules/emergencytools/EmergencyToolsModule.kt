package expo.modules.emergencytools

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.camera2.CameraCaptureSession
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraDevice
import android.hardware.camera2.CameraManager
import android.hardware.camera2.CaptureRequest
import android.hardware.camera2.params.OutputConfiguration
import android.hardware.camera2.params.SessionConfiguration
import android.net.Uri
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.telephony.SmsManager
import android.view.Surface
import androidx.annotation.RequiresApi
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.BufferedOutputStream
import java.io.IOException
import java.net.Inet4Address
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import android.media.ImageReader

class EmergencyToolsModule : Module() {
  private val running = AtomicBoolean(false)
  @Volatile private var latestJpeg: ByteArray? = null
  private var server: ServerSocket? = null
  private var serverThread: Thread? = null
  private var cameraThread: HandlerThread? = null
  private var cameraHandler: Handler? = null
  private var cameraDevice: CameraDevice? = null
  private var captureSession: CameraCaptureSession? = null
  private var imageReader: ImageReader? = null
  private var streamPort = 8787

  override fun definition() = ModuleDefinition {
    Name("EmergencyToolsModule")

    AsyncFunction("sendSms") { numbers: List<String>, body: String ->
      val context = appContext.reactContext ?: return@AsyncFunction mapOf("ok" to false, "error" to "NO_CONTEXT")
      if (Build.VERSION.SDK_INT >= 23 && context.checkSelfPermission(Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
        return@AsyncFunction mapOf("ok" to false, "error" to "SEND_SMS_PERMISSION_REQUIRED")
      }
      val clean = numbers.map { it.trim() }.filter { it.isNotEmpty() }.distinct()
      if (clean.isEmpty()) return@AsyncFunction mapOf("ok" to false, "error" to "NO_RECIPIENT")
      return@AsyncFunction try {
        val sms = SmsManager.getDefault()
        clean.forEachIndexed { i, number ->
          val sentAction = "com.korosh.nova.SMS_SENT_$i"
          val intent = PendingIntent.getBroadcast(context, 9000 + i, Intent(sentAction).setPackage(context.packageName), PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= 23) PendingIntent.FLAG_IMMUTABLE else 0)
          val parts = sms.divideMessage(body)
          if (parts.size == 1) sms.sendTextMessage(number, null, body, intent, null)
          else sms.sendMultipartTextMessage(number, null, parts, ArrayList(List(parts.size) { intent }), null)
        }
        mapOf("ok" to true, "count" to clean.size)
      } catch (e: Exception) { mapOf("ok" to false, "error" to (e.message ?: "SMS_FAILED")) }
    }

    AsyncFunction("callPhone") { number: String ->
      val context = appContext.reactContext ?: return@AsyncFunction mapOf("ok" to false, "error" to "NO_CONTEXT")
      if (Build.VERSION.SDK_INT >= 23 && context.checkSelfPermission(Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) return@AsyncFunction mapOf("ok" to false, "error" to "CALL_PHONE_PERMISSION_REQUIRED")
      return@AsyncFunction try {
        context.startActivity(Intent(Intent.ACTION_CALL, Uri.parse("tel:${number.trim()}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        mapOf("ok" to true)
      } catch (e: Exception) { mapOf("ok" to false, "error" to (e.message ?: "CALL_FAILED")) }
    }

    AsyncFunction("startCameraStream") { port: Int, durationSeconds: Int ->
      startStream(port, durationSeconds)
    }
    AsyncFunction("stopCameraStream") { stopStream(); true }
    AsyncFunction("getCameraStreamInfo") {
      mapOf("running" to running.get(), "url" to if (running.get()) localStreamUrl() else null, "port" to streamPort)
    }
  }

  private fun context(): Context? = appContext.reactContext

  private fun localIp(): String? {
    val c = context() ?: return null
    try {
      val wm = c.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
      @Suppress("DEPRECATION") val ip = wm.connectionInfo.ipAddress
      if (ip != 0) return "%d.%d.%d.%d".format(ip and 0xff, ip shr 8 and 0xff, ip shr 16 and 0xff, ip shr 24 and 0xff)
    } catch (_: Exception) {}
    return try {
      java.net.NetworkInterface.getNetworkInterfaces().toList().flatMap { it.inetAddresses.toList() }.firstOrNull { it is Inet4Address && !it.isLoopbackAddress }?.hostAddress
    } catch (_: Exception) { null }
  }

  private fun localStreamUrl(): String? = localIp()?.let { "http://$it:$streamPort/" }

  private fun startStream(port: Int, durationSeconds: Int): Map<String, Any?> {
    val c = context() ?: return mapOf("started" to false, "error" to "NO_CONTEXT")
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) return mapOf("started" to false, "error" to "CAMERA2_UNSUPPORTED")
    if (Build.VERSION.SDK_INT >= 23 && c.checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) return mapOf("started" to false, "error" to "CAMERA_PERMISSION_REQUIRED")
    stopStream()
    streamPort = port.coerceIn(1024, 65530)
    return try {
      server = ServerSocket(streamPort)
      running.set(true)
      serverThread = Thread { serveLoop() }.also { it.name = "KoroshNovaCameraStream"; it.start() }
      startCamera()
      val safeDuration = durationSeconds.coerceIn(60, 7200)
      Thread { try { Thread.sleep(safeDuration * 1000L) } catch (_: InterruptedException) {} ; if (running.get()) stopStream() }.also { it.name = "KoroshNovaCameraTimeout"; it.start() }
      mapOf("started" to true, "url" to localStreamUrl(), "port" to streamPort, "durationSeconds" to safeDuration)
    } catch (e: Exception) {
      stopStream(); mapOf("started" to false, "error" to (e.message ?: "STREAM_START_FAILED"))
    }
  }

  private fun serveLoop() {
    while (running.get()) {
      val socket = try { server?.accept() } catch (_: Exception) { null } ?: break
      Thread { handleClient(socket) }.start()
    }
  }

  private fun handleClient(socket: Socket) {
    socket.use {
      try {
        val out = BufferedOutputStream(it.getOutputStream())
        val header = "HTTP/1.1 200 OK\r\nContent-Type: multipart/x-mixed-replace; boundary=frame\r\nCache-Control: no-cache\r\nConnection: close\r\nAccess-Control-Allow-Origin: *\r\n\r\n"
        out.write(header.toByteArray()); out.flush()
        var last: ByteArray? = null
        while (running.get() && !it.isClosed) {
          val frame = latestJpeg
          if (frame != null && (last == null || !frame.contentEquals(last))) {
            out.write("--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.size}\r\n\r\n".toByteArray())
            out.write(frame); out.write("\r\n".toByteArray()); out.flush(); last = frame
          }
          Thread.sleep(120)
        }
      } catch (_: Exception) {}
    }
  }

  private fun startCamera() {
    val c = context() ?: return
    cameraThread = HandlerThread("KoroshNovaCamera").also { it.start() }
    cameraHandler = Handler(cameraThread!!.looper)
    val manager = c.getSystemService(Context.CAMERA_SERVICE) as CameraManager
    val cameraId = manager.cameraIdList.firstOrNull { id ->
      val chars = manager.getCameraCharacteristics(id)
      chars.get(CameraCharacteristics.LENS_FACING) == CameraCharacteristics.LENS_FACING_BACK
    } ?: manager.cameraIdList.firstOrNull() ?: return
    imageReader = ImageReader.newInstance(640, 480, android.graphics.ImageFormat.JPEG, 2)
    imageReader!!.setOnImageAvailableListener({ reader ->
      try { reader.acquireLatestImage()?.use { image -> image.planes.firstOrNull()?.buffer?.let { b -> val bytes=ByteArray(b.remaining()); b.get(bytes); latestJpeg=bytes } } } catch (_: Exception) {}
    }, cameraHandler)
    manager.openCamera(cameraId, object: CameraDevice.StateCallback() {
      override fun onOpened(camera: CameraDevice) {
        if (!running.get()) { camera.close(); return }
        cameraDevice = camera
        val surface = imageReader!!.surface
        try {
          if (Build.VERSION.SDK_INT >= 28) {
            val outputs = listOf(OutputConfiguration(surface))
            val config = SessionConfiguration(SessionConfiguration.SESSION_REGULAR, outputs, Executors.newSingleThreadExecutor(), object: CameraCaptureSession.StateCallback() {
              override fun onConfigured(session: CameraCaptureSession) { beginCapture(session, camera) }
              override fun onConfigureFailed(session: CameraCaptureSession) {}
            })
            camera.createCaptureSession(config)
          } else {
            camera.createCaptureSession(listOf(surface), object: CameraCaptureSession.StateCallback() {
              override fun onConfigured(session: CameraCaptureSession) { beginCapture(session, camera) }
              override fun onConfigureFailed(session: CameraCaptureSession) {}
            }, cameraHandler)
          }
        } catch (_: Exception) {}
      }
      override fun onDisconnected(camera: CameraDevice) { camera.close(); cameraDevice=null }
      override fun onError(camera: CameraDevice, error: Int) { camera.close(); cameraDevice=null }
    }, cameraHandler)
  }

  private fun beginCapture(session: CameraCaptureSession, camera: CameraDevice) {
    captureSession = session
    try {
      val request = camera.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW).apply {
        addTarget(imageReader!!.surface)
        set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE)
        set(CaptureRequest.JPEG_QUALITY, 82.toByte())
      }.build()
      session.setRepeatingRequest(request, null, cameraHandler)
    } catch (_: Exception) {}
  }

  private fun stopStream() {
    running.set(false)
    try { captureSession?.stopRepeating() } catch (_: Exception) {}
    try { captureSession?.close() } catch (_: Exception) {}
    captureSession=null
    try { cameraDevice?.close() } catch (_: Exception) {}
    cameraDevice=null
    try { imageReader?.close() } catch (_: Exception) {}
    imageReader=null
    try { cameraThread?.quitSafely() } catch (_: Exception) {}
    cameraThread=null; cameraHandler=null
    try { server?.close() } catch (_: Exception) {}
    server=null; serverThread=null; latestJpeg=null
  }
}
