package expo.modules.audioroute

import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AudioRouteModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AudioRouteModule")

    AsyncFunction("getBluetoothAudioDevices") {
      val context = appContext.reactContext
        ?: return@AsyncFunction mapOf("supported" to false, "devices" to emptyList<Map<String, Any>>(), "error" to "NO_CONTEXT")
      try {
        if (Build.VERSION.SDK_INT >= 31 && context.checkSelfPermission("android.permission.BLUETOOTH_CONNECT") != PackageManager.PERMISSION_GRANTED) {
          return@AsyncFunction mapOf("supported" to false, "devices" to emptyList<Map<String, Any>>(), "error" to "BLUETOOTH_CONNECT_REQUIRED")
        }
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
          ?: return@AsyncFunction mapOf("supported" to false, "devices" to emptyList<Map<String, Any>>(), "error" to "AUDIO_SERVICE_UNAVAILABLE")
        val btTypes = mutableSetOf(AudioDeviceInfo.TYPE_BLUETOOTH_A2DP, AudioDeviceInfo.TYPE_BLUETOOTH_SCO)
        if (Build.VERSION.SDK_INT >= 31) btTypes.add(AudioDeviceInfo.TYPE_BLE_HEADSET)
        val devices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
          .filter { it.type in btTypes }
          .map {
            mapOf(
              "name" to it.productName.toString(),
              "type" to it.type,
              "id" to it.id
            )
          }
        mapOf("supported" to true, "devices" to devices)
      } catch (_: SecurityException) {
        mapOf("supported" to false, "devices" to emptyList<Map<String, Any>>(), "error" to "BLUETOOTH_CONNECT_REQUIRED")
      } catch (e: Exception) {
        mapOf("supported" to false, "devices" to emptyList<Map<String, Any>>(), "error" to "AUDIO_ROUTE_READ_FAILED", "message" to (e.message ?: ""))
      }
    }
  }
}
