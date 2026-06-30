// android/app/src/main/java/com/snbxjayar/snbxapp/sms/SmsReceiver.kt

package com.snbxjayar.snbxapp.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import com.google.firebase.FirebaseApp
import com.google.firebase.firestore.FirebaseFirestore
import java.util.Date

class SmsReceiver : BroadcastReceiver() {

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
            var sender  = ""

            for (msg in messages) {
                sender = msg.originatingAddress ?: continue
                grouped.getOrPut(sender) { StringBuilder() }.append(msg.messageBody)
            }

            val db = FirebaseFirestore.getInstance()

            grouped.forEach { (from, bodyBuilder) ->
                val body = bodyBuilder.toString()
                Log.d("SNBXSmsReceiver", "Incoming SMS from $from: $body")

                // Store in Firestore sms_inbox collection
                val inboxDoc = hashMapOf(
                    "from"      to from,
                    "body"      to body,
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
            }

        } catch (e: Exception) {
            Log.e("SNBXSmsReceiver", "Error processing incoming SMS: ${e.message}")
        }
    }
}