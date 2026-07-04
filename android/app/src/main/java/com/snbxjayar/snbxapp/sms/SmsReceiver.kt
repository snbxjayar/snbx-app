// android/app/src/main/java/com/snbxjayar/snbxapp/sms/SmsReceiver.kt

package com.snbxjayar.snbxapp.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.provider.Telephony
import android.util.Log
import com.google.firebase.FirebaseApp
import com.google.firebase.firestore.FirebaseFirestore
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.Date
import kotlin.concurrent.thread

class SmsReceiver : BroadcastReceiver() {

    companion object {
        private const val INBOUND_URL = "https://snbx-pay.vercel.app/api/sms/inbound"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        try {
            // Initialize Firebase if not already done
            if (FirebaseApp.getApps(context).isEmpty()) {
                FirebaseApp.initializeApp(context)
            }

            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            if (messages.isNullOrEmpty()) return

            // Group multi-part messages
            val grouped = mutableMapOf<String, StringBuilder>()

            for (msg in messages) {
                val sender = msg.originatingAddress ?: continue
                grouped.getOrPut(sender) { StringBuilder() }.append(msg.messageBody)
            }

            val db = FirebaseFirestore.getInstance()
            val deviceId = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ANDROID_ID
            ) ?: "unknown"

            grouped.forEach { (from, bodyBuilder) ->
                val body = bodyBuilder.toString()
                Log.d("SNBXSmsReceiver", "Incoming SMS from $from: $body")

                // 1. Store in Firestore sms_inbox collection (in-app inbox)
                val inboxDoc = hashMapOf(
                    "from"      to from,
                    "body"      to body,
                    "deviceId"  to deviceId,
                    "status"    to "received",
                    "read"      to false,
                    "createdAt" to Date(),
                    "source"    to "gateway"
                )

                db.collection("sms_inbox")
                    .add(inboxDoc)
                    .addOnSuccessListener { ref: com.google.firebase.firestore.DocumentReference ->
                        Log.d("SNBXSmsReceiver", "Saved to Firestore: ${ref.id}")
                    }
                    .addOnFailureListener { e: Exception ->
                        Log.e("SNBXSmsReceiver", "Firestore save failed: ${e.message}")
                    }

                // 2. Forward to backend → GHL Conversations
                postToBackend(deviceId, from, body)
            }

        } catch (e: Exception) {
            Log.e("SNBXSmsReceiver", "Error processing incoming SMS: ${e.message}")
        }
    }

    private fun postToBackend(deviceId: String, from: String, body: String) {
        thread {
            try {
                val payload = JSONObject().apply {
                    put("deviceId", deviceId)
                    put("from", from)
                    put("body", body)
                }

                val conn = (URL(INBOUND_URL).openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    setRequestProperty("Content-Type", "application/json")
                    setRequestProperty("x-snbx-secret", "3YlhPsMUJAcEjiNz5GyuQX8emCtTDbv4xFrZa6kB")
                    connectTimeout = 10000
                    readTimeout = 15000
                    doOutput = true
                }

                conn.outputStream.use { it.write(payload.toString().toByteArray()) }
                val code = conn.responseCode
                Log.d("SNBXSmsReceiver", "Inbound POST → $code")
                conn.disconnect()
            } catch (e: Exception) {
                Log.e("SNBXSmsReceiver", "Inbound POST failed: ${e.message}")
            }
        }
    }
}