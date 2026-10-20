package expo.modules.carrierbalance

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CarrierBalanceModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CarrierBalanceModule")

    AsyncFunction("getCarrier") {
      val context = appContext.reactContext ?: return@AsyncFunction mapOf("supported" to false, "carrier" to "", "subscriptionId" to -1)
      if (!hasPhoneStatePermission(context)) {
        return@AsyncFunction mapOf("supported" to false, "carrier" to "", "subscriptionId" to -1, "error" to "READ_PHONE_STATE_REQUIRED")
      }
      val subId = defaultSubscriptionId()
      val telephony = telephonyFor(subId)
      val name = (telephony?.simOperatorName ?: telephony?.networkOperatorName ?: "").trim()
      val normalized = normalizeCarrier(name)
      mapOf("supported" to (normalized != null), "carrier" to (normalized ?: name), "subscriptionId" to subId)
    }

    AsyncFunction("query") { kind: String, promise: Promise ->
      val context = appContext.reactContext ?: run { promise.resolve(mapOf("ok" to false, "error" to "NO_CONTEXT")); return@AsyncFunction }
      if (!hasCallPermission(context)) {
        promise.resolve(mapOf("ok" to false, "error" to "CALL_PHONE_REQUIRED")); return@AsyncFunction
      }
      if (!hasPhoneStatePermission(context)) {
        promise.resolve(mapOf("ok" to false, "error" to "READ_PHONE_STATE_REQUIRED")); return@AsyncFunction
      }
      val subId = defaultSubscriptionId()
      val telephony = telephonyFor(subId)
      val rawName = (telephony?.simOperatorName ?: telephony?.networkOperatorName ?: "").trim()
      val carrier = normalizeCarrier(rawName)
      if (carrier == null || telephony == null) {
        promise.resolve(mapOf("ok" to false, "error" to "UNSUPPORTED_CARRIER", "carrier" to rawName, "subscriptionId" to subId)); return@AsyncFunction
      }
      val code = ussdFor(carrier, kind)
      if (code == null) {
        promise.resolve(mapOf("ok" to false, "error" to "UNSUPPORTED_QUERY", "carrier" to carrier, "subscriptionId" to subId)); return@AsyncFunction
      }
      if (Build.VERSION.SDK_INT < 26) {
        promise.resolve(mapOf("ok" to false, "error" to "ANDROID_API_TOO_OLD", "carrier" to carrier)); return@AsyncFunction
      }
      try {
        val mainHandler = Handler(Looper.getMainLooper())
        telephony.sendUssdRequest(code, object : TelephonyManager.UssdResponseCallback() {
          override fun onReceiveUssdResponse(t: TelephonyManager, request: String, response: CharSequence) {
            promise.resolve(mapOf("ok" to true, "carrier" to carrier, "kind" to kind, "ussd" to code, "response" to response.toString(), "subscriptionId" to subId))
          }
          override fun onReceiveUssdResponseFailed(t: TelephonyManager, request: String, failureCode: Int) {
            promise.resolve(mapOf("ok" to false, "carrier" to carrier, "kind" to kind, "ussd" to code, "error" to "USSD_FAILED", "failureCode" to failureCode, "subscriptionId" to subId))
          }
        }, mainHandler)
      } catch (e: SecurityException) {
        promise.resolve(mapOf("ok" to false, "error" to "CALL_PHONE_REQUIRED", "carrier" to carrier, "subscriptionId" to subId))
      } catch (e: Exception) {
        promise.resolve(mapOf("ok" to false, "error" to "USSD_EXCEPTION", "message" to (e.message ?: ""), "carrier" to carrier, "subscriptionId" to subId))
      }
    }
  }

  private fun defaultSubscriptionId(): Int {
    if (Build.VERSION.SDK_INT >= 24) {
      val data = SubscriptionManager.getDefaultDataSubscriptionId()
      if (data != SubscriptionManager.INVALID_SUBSCRIPTION_ID) return data
    }
    return SubscriptionManager.getDefaultSubscriptionId()
  }

  private fun telephonyFor(subId: Int): TelephonyManager? {
    val context = appContext.reactContext ?: return null
    val base = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager ?: return null
    return if (Build.VERSION.SDK_INT >= 24 && subId != SubscriptionManager.INVALID_SUBSCRIPTION_ID) base.createForSubscriptionId(subId) else base
  }

  private fun normalizeCarrier(name: String): String? {
    val n = name.lowercase()
    return when {
      n.contains("irancell") || n.contains("ایرانسل") || n.contains("mtn") -> "ایرانسل"
      n.contains("mci") || n.contains("hamrah") || n.contains("همراه") || n.contains("mobile communications company") -> "همراه اول"
      n.contains("rightel") || n.contains("رایتل") || n.contains("righ tel") -> "رایتل"
      else -> null
    }
  }

  private fun ussdFor(carrier: String, kind: String): String? = when (carrier) {
    "همراه اول" -> if (kind == "balance") "*140*11#" else "*100*10#"
    "ایرانسل" -> if (kind == "balance") "*555*1*2#" else "*555*1*4#"
    "رایتل" -> if (kind == "balance") "*140#" else "*141#"
    else -> null
  }

  private fun hasPhoneStatePermission(context: Context): Boolean =
    Build.VERSION.SDK_INT < 23 || context.checkSelfPermission(Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED

  private fun hasCallPermission(context: Context): Boolean =
    Build.VERSION.SDK_INT < 23 || context.checkSelfPermission(Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED
}
