// android/app/src/main/java/com/snbxjayar/snbxapp/sms/SmsModule.kt

package com.snbxjayar.snbxapp.sms

import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class SmsModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SNBXSmsModule"

    // ── Send SMS ─────────────────────────────────────────────────────────────
    @ReactMethod
    fun sendSms(phoneNumber: String, message: String, jobId: String, promise: Promise) {
        try {
            val smsManager = getSmsManager()
            val parts      = smsManager.divideMessage(message)

            val sentIntents    = ArrayList<PendingIntent>()
            val deliverIntents = ArrayList<PendingIntent>()

            for (i in parts.indices) {
                val sentIntent = Intent("SMS_SENT_$jobId").apply {
                    putExtra("jobId", jobId)
                    putExtra("part", i)
                    putExtra("total", parts.size)
                }
                val deliverIntent = Intent("SMS_DELIVERED_$jobId").apply {
                    putExtra("jobId", jobId)
                }

                val sentPI = PendingIntent.getBroadcast(
                    reactContext, i,
                    sentIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                val deliverPI = PendingIntent.getBroadcast(
                    reactContext, i,
                    deliverIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                sentIntents.add(sentPI)
                deliverIntents.add(deliverPI)
            }

            // Register sent receiver
            val sentReceiver = object : BroadcastReceiver() {
                override fun onReceive(ctx: Context, intent: Intent) {
                    val jId   = intent.getStringExtra("jobId") ?: jobId
                    val status = when (resultCode) {
                        Activity.RESULT_OK           -> "sent"
                        SmsManager.RESULT_ERROR_GENERIC_FAILURE -> "failed_generic"
                        SmsManager.RESULT_ERROR_NO_SERVICE      -> "failed_no_service"
                        SmsManager.RESULT_ERROR_NULL_PDU        -> "failed_null_pdu"
                        SmsManager.RESULT_ERROR_RADIO_OFF       -> "failed_radio_off"
                        else -> "failed_unknown"
                    }
                    sendEvent("onSmsSent", Arguments.createMap().apply {
                        putString("jobId", jId)
                        putString("status", status)
                        putString("phone", phoneNumber)
                    })
                    try { reactContext.unregisterReceiver(this) } catch (_: Exception) {}
                }
            }

            // Register delivered receiver
            val deliverReceiver = object : BroadcastReceiver() {
                override fun onReceive(ctx: Context, intent: Intent) {
                    val jId = intent.getStringExtra("jobId") ?: jobId
                    sendEvent("onSmsDelivered", Arguments.createMap().apply {
                        putString("jobId", jId)
                        putString("status", "delivered")
                        putString("phone", phoneNumber)
                    })
                    try { reactContext.unregisterReceiver(this) } catch (_: Exception) {}
                }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                reactContext.registerReceiver(sentReceiver,    IntentFilter("SMS_SENT_$jobId"),    Context.RECEIVER_NOT_EXPORTED)
                reactContext.registerReceiver(deliverReceiver, IntentFilter("SMS_DELIVERED_$jobId"), Context.RECEIVER_NOT_EXPORTED)
            } else {
                reactContext.registerReceiver(sentReceiver,    IntentFilter("SMS_SENT_$jobId"))
                reactContext.registerReceiver(deliverReceiver, IntentFilter("SMS_DELIVERED_$jobId"))
            }

            smsManager.sendMultipartTextMessage(phoneNumber, null, parts, sentIntents, deliverIntents)
            promise.resolve("queued")

        } catch (e: Exception) {
            promise.reject("SMS_SEND_ERROR", e.message, e)
        }
    }

    // ── Get SIM slots ─────────────────────────────────────────────────────────
    @ReactMethod
    fun getSimSlots(promise: Promise) {
        try {
            val result = Arguments.createArray()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                val subManager = reactContext.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE)
                    as? SubscriptionManager
                val subs = subManager?.activeSubscriptionInfoList
                subs?.forEach { info ->
                    result.pushMap(Arguments.createMap().apply {
                        putInt("subscriptionId", info.subscriptionId)
                        putInt("simSlotIndex", info.simSlotIndex)
                        putString("displayName", info.displayName?.toString() ?: "SIM ${info.simSlotIndex + 1}")
                        putString("number", info.number ?: "")
                        putString("carrierName", info.carrierName?.toString() ?: "")
                    })
                }
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("SIM_ERROR", e.message, e)
        }
    }

    // ── Check SMS permission ──────────────────────────────────────────────────
    @ReactMethod
    fun checkSmsPermission(promise: Promise) {
        val granted = reactContext.checkSelfPermission(android.Manifest.permission.SEND_SMS) ==
                android.content.pm.PackageManager.PERMISSION_GRANTED
        promise.resolve(granted)
    }

    // ── Start / stop the background gateway service ──────────────────────────
    @ReactMethod
    fun startGatewayService(promise: Promise) {
        try {
            val intent = Intent(reactContext, com.snbxjayar.snbxapp.sms.GatewayService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
            promise.resolve("started")
        } catch (e: Exception) {
            promise.reject("SERVICE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopGatewayService(promise: Promise) {
        try {
            val intent = Intent(reactContext, com.snbxjayar.snbxapp.sms.GatewayService::class.java)
            reactContext.stopService(intent)
            promise.resolve("stopped")
        } catch (e: Exception) {
            promise.reject("SERVICE_ERROR", e.message, e)
        }
    }

    // ── Helper: get SmsManager ────────────────────────────────────────────────
    private fun getSmsManager(): SmsManager {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            reactContext.getSystemService(SmsManager::class.java)
        } else {
            @Suppress("DEPRECATION")
            SmsManager.getDefault()
        }
    }

    // ── Emit event to JS ──────────────────────────────────────────────────────
    private fun sendEvent(eventName: String, params: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}