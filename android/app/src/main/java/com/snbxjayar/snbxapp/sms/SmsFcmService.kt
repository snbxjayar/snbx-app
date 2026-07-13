// android/app/src/main/java/com/snbxjayar/snbxapp/sms/SmsFcmService.kt
package com.snbxjayar.snbxapp.sms

import android.content.Intent
import android.os.Build
import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class SmsFcmService : FirebaseMessagingService() {

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        Log.d("SNBXFcm", "FCM received: ${message.data}")

        if (message.data["type"] == "sms_job") {
            // Wake the gateway — high-priority FCM grants a temporary
            // background-start exemption, so this works even if the app was killed.
            val intent = Intent(this, GatewayService::class.java)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(intent)
                } else {
                    startService(intent)
                }
                Log.d("SNBXFcm", "GatewayService started from FCM")
            } catch (e: Exception) {
                Log.e("SNBXFcm", "Failed to start gateway from FCM: ${e.message}")
            }
        }
    }

    override fun onNewToken(token: String) {
  super.onNewToken(token)
  Log.d("SmsFcmService", "FCM token refreshed: $token")
  // Save new token to Firestore so backend can send targeted wake-ups
  val uid = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: return
  com.google.firebase.firestore.FirebaseFirestore.getInstance()
    .collection("gateway_status")
    .document(uid)
    .update("fcmToken", token)
    .addOnSuccessListener {
      Log.d("SmsFcmService", "FCM token saved to Firestore")
    }
    .addOnFailureListener { e ->
      Log.e("SmsFcmService", "Failed to save FCM token: ${e.message}")
    }
}
}