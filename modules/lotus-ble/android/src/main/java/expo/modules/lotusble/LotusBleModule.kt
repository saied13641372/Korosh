package expo.modules.lotusble

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothManager
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.app.Activity
import android.content.pm.PackageManager
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.UUID

class LotusBleModule : Module() {
  companion object {
    private const val REQUEST_ENABLE_BT = 4701
    val SERVICE_UUID: UUID = UUID.fromString("0000fff0-0000-1000-8000-00805f9b34fb")
    val WRITE_UUID: UUID = UUID.fromString("0000fff3-0000-1000-8000-00805f9b34fb")
  }
  private var scanner: BluetoothLeScanner? = null
  private var gatt: BluetoothGatt? = null
  private var writeCharacteristic: BluetoothGattCharacteristic? = null
  private val found = linkedMapOf<String, BluetoothDevice>()
  private var enablePromise: Promise? = null
  private var connectPromise: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("LotusBleModule")
    AsyncFunction("isEnabled") {
      val manager = appContext.reactContext?.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
      if (android.os.Build.VERSION.SDK_INT >= 31 && !hasConnectPermission()) false else manager?.adapter?.isEnabled == true
    }
    AsyncFunction("requestEnable") { promise: Promise ->
      if (!hasConnectPermission()) { promise.resolve(false); return@AsyncFunction }
      val activity = appContext.currentActivity
      val manager = appContext.reactContext?.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
      val adapter = manager?.adapter
      if (activity == null || adapter == null) { promise.resolve(false); return@AsyncFunction }
      if (adapter.isEnabled) { promise.resolve(true); return@AsyncFunction }
      enablePromise?.resolve(false)
      enablePromise = promise
      activity.startActivityForResult(Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE), REQUEST_ENABLE_BT)
    }
    AsyncFunction("openBluetoothSettings") {
      val activity = appContext.currentActivity ?: return@AsyncFunction false
      activity.startActivity(Intent(Settings.ACTION_BLUETOOTH_SETTINGS))
      true
    }
    AsyncFunction("openWifiPanel") {
      val activity = appContext.currentActivity ?: return@AsyncFunction false
      val panelIntent = Intent("android.settings.panel.action.WIFI")
      try { activity.startActivity(panelIntent) } catch (_: Exception) { activity.startActivity(Intent(Settings.ACTION_WIFI_SETTINGS)) }
      true
    }
    AsyncFunction("hideSystemNavigationBar") {
      val activity = appContext.currentActivity ?: return@AsyncFunction false
      val decor = activity.window.decorView
      if (android.os.Build.VERSION.SDK_INT >= 30) {
        val controller = activity.window.insetsController ?: return@AsyncFunction false
        controller.hide(android.view.WindowInsets.Type.navigationBars())
        controller.systemBarsBehavior = android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
      } else {
        @Suppress("DEPRECATION")
        decor.systemUiVisibility = (android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
          or android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
          or android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
          or android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE)
      }
      true
    }
    AsyncFunction("scan") { promise: Promise ->
      if (!hasScanPermission()) { promise.resolve(emptyList<Map<String,Any?>>()); return@AsyncFunction }
      val manager = appContext.reactContext?.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
      scanner = manager?.adapter?.bluetoothLeScanner
      found.clear()
      val cb = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
          found[result.device.address] = result.device
        }
        override fun onScanFailed(errorCode: Int) { promise.reject("SCAN", "BLE scan failed: $errorCode", null) }
      }
      scanner?.startScan(cb)
      android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
        try { scanner?.stopScan(cb) } catch (_: Exception) {}
        promise.resolve(found.values.map { mapOf("name" to (it.name ?: "Lotus"), "address" to it.address) })
      }, 5000)
    }
    AsyncFunction("connect") { address: String, promise: Promise ->
      if (!hasConnectPermission()) { promise.resolve(false); return@AsyncFunction }
      val manager = appContext.reactContext?.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
      val device = manager?.adapter?.getRemoteDevice(address)
      if (device == null) { promise.resolve(false); return@AsyncFunction }
      val context = appContext.reactContext ?: run { promise.resolve(false); return@AsyncFunction }
      gatt?.close()
      writeCharacteristic = null
      connectPromise?.resolve(false)
      connectPromise = promise
      gatt = device.connectGatt(context, false, callback)
      android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
        if (connectPromise === promise) {
          connectPromise?.resolve(writeCharacteristic != null)
          connectPromise = null
        }
      }, 10000)
    }
    AsyncFunction("disconnect") { connectPromise?.resolve(false); connectPromise=null; gatt?.disconnect(); gatt?.close(); gatt=null; writeCharacteristic=null; true }
    AsyncFunction("isConnected") { writeCharacteristic != null }
    AsyncFunction("power") { on:Boolean -> send(byteArrayOf(0x7E,0x07,0x04,if(on)1 else 0,0x00,0xFF.toByte(),0xFF.toByte(),0x00,0xEF.toByte())) }
    AsyncFunction("brightness") { value:Int -> send(byteArrayOf(0x7E,0x07,0x01,value.coerceIn(0,100).toByte(),0xFF.toByte(),0xFF.toByte(),0xFF.toByte(),0x00,0xEF.toByte())) }
    AsyncFunction("speed") { value:Int -> send(byteArrayOf(0x7E,0x04,0x02,value.coerceIn(0,100).toByte(),0xFF.toByte(),0xFF.toByte(),0xFF.toByte(),0x00,0xEF.toByte())) }
    AsyncFunction("color") { r:Int,g:Int,b:Int ->
      val rr=r.coerceIn(0,255); val gg=g.coerceIn(0,255); val bb=b.coerceIn(0,255)
      send(byteArrayOf(0x7E,0x07,0x05,0x03,rr.toByte(),gg.toByte(),bb.toByte(),0x10,0xEF.toByte()))
    }
    AsyncFunction("mode") { id:Int -> send(byteArrayOf(0x7E,0x07,0x03,id.coerceIn(0,212).toByte(),0xFF.toByte(),0xFF.toByte(),0xFF.toByte(),0x00,0xEF.toByte())) }
    AsyncFunction("scene") { id:Int -> send(byteArrayOf(0x7E,0x07,0x03,id.coerceIn(0,212).toByte(),0xFF.toByte(),0xFF.toByte(),0xFF.toByte(),0x00,0xEF.toByte())) }
    OnActivityResult { _, payload ->
      if (payload.requestCode == REQUEST_ENABLE_BT) {
        val manager = appContext.reactContext?.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        val enabled = manager?.adapter?.isEnabled == true
        enablePromise?.resolve(enabled && payload.resultCode == Activity.RESULT_OK)
        enablePromise = null
      }
    }
  }

  private val callback = object : BluetoothGattCallback() {
    override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
      if (newState == android.bluetooth.BluetoothProfile.STATE_CONNECTED) g.discoverServices()
      if (newState == android.bluetooth.BluetoothProfile.STATE_DISCONNECTED) {
        writeCharacteristic=null
        connectPromise?.resolve(false)
        connectPromise=null
        g.close()
      }
    }
    override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
      if (status != BluetoothGatt.GATT_SUCCESS) {
        connectPromise?.resolve(false)
        connectPromise=null
        return
      }
      val service = g.getService(SERVICE_UUID)
      val characteristic = service?.getCharacteristic(WRITE_UUID)
      writeCharacteristic = characteristic
      characteristic?.writeType = BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
      val ready = characteristic != null
      connectPromise?.resolve(ready)
      connectPromise=null
    }
  }

  private fun send(data: ByteArray): Boolean {
    val c = writeCharacteristic ?: return false
    val g = gatt ?: return false
    c.value=data
    return if (android.os.Build.VERSION.SDK_INT >= 33) g.writeCharacteristic(c) == BluetoothGatt.GATT_SUCCESS else g.writeCharacteristic(c)
  }
  private fun hasScanPermission():Boolean = android.os.Build.VERSION.SDK_INT < 31 || appContext.reactContext?.checkSelfPermission(Manifest.permission.BLUETOOTH_SCAN)==PackageManager.PERMISSION_GRANTED
  private fun hasConnectPermission():Boolean = android.os.Build.VERSION.SDK_INT < 31 || appContext.reactContext?.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT)==PackageManager.PERMISSION_GRANTED
}
