// android/app/src/main/java/com/snbxjayar/snbxapp/sms/GatewayService.kt
package com.snbxjayar.snbxapp.sms

import android.app.*
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.telephony.SmsManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.messaging.FirebaseMessaging
import java.util.Date
import java.util.concurrent.TimeUnit
import android.provider.Settings

class GatewayService : Service() {
    private var firestoreListener: ListenerRegistration? = null
    private lateinit var db: FirebaseFirestore
    private val CHANNEL_ID = "snbx_gateway_channel"
    private val NOTIF_ID   = 1001

    override fun onCreate() {
        super.onCreate()
        if (FirebaseApp.getApps(this).isEmpty()) FirebaseApp.initializeApp(this)
        db = FirebaseFirestore.getInstance()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIF_ID, buildNotification())
        startListening()
        subscribeToFcmTopic()
        scheduleWatchdog()
        Log.d("SNBXGateway", "Gateway service started")
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        firestoreListener?.remove()
        Log.d("SNBXGateway", "Gateway service stopped")
        super.onDestroy()
    }

    // ── FCM wake-up channel ───────────────────────────────────────────────────
    private fun subscribeToFcmTopic() {
        // Keep topic subscription as fallback
        FirebaseMessaging.getInstance().subscribeToTopic("sms_gateway")
            .addOnCompleteListener { task ->
                Log.d("SNBXGateway", "FCM topic subscribe: ${if (task.isSuccessful) "OK" else "FAILED"}")
            }

        // Also save this device's FCM token for targeted wake-ups
        FirebaseMessaging.getInstance().token
            .addOnSuccessListener { token ->
                Log.d("SNBXGateway", "FCM token retrieved: ${token.take(20)}...")
                saveFcmToken(token)
            }
            .addOnFailureListener { e ->
                Log.e("SNBXGateway", "Failed to get FCM token: ${e.message}")
            }
    }

    // ── Save FCM token to Firestore so backend can send targeted wake-ups ─────
    private fun saveFcmToken(token: String) {
        val uid = FirebaseAuth.getInstance().currentUser?.uid
        if (uid == null) {
            Log.w("SNBXGateway", "Cannot save FCM token — user not logged in")
            return
        }
        db.collection("gateway_status")
            .document(uid)
            .update("fcmToken", token)
            .addOnSuccessListener {
                Log.d("SNBXGateway", "FCM token saved to Firestore for uid $uid")
            }
            .addOnFailureListener { e ->
                Log.e("SNBXGateway", "Failed to save FCM token: ${e.message}")
            }
    }

    // ── Watchdog: restart service every 15 min if killed ─────────────────────
    private fun scheduleWatchdog() {
        val request = PeriodicWorkRequestBuilder<GatewayWatchdogWorker>(15, TimeUnit.MINUTES)
            .build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "snbx_gateway_watchdog",
            ExistingPeriodicWorkPolicy.KEEP,
            request
        )
        Log.d("SNBXGateway", "Watchdog scheduled")
    }

    // ── Listen for outgoing SMS jobs in Firestore (this device only) ──────────
    private fun startListening() {
        firestoreListener?.remove()
        val deviceId = Settings.Secure.getString(
            contentResolver,
            Settings.Secure.ANDROID_ID
        ) ?: "unknown"

        Log.d("SNBXGateway", "Listening for jobs assigned to device $deviceId")

        firestoreListener = db.collection("sms_jobs")
            .whereEqualTo("status", "queued")
            .whereEqualTo("deviceId", deviceId)
            .addSnapshotListener { snapshots, error ->
                if (error != null) {
                    Log.e("SNBXGateway", "Firestore listen error: ${error.message}")
                    return@addSnapshotListener
                }
                snapshots?.documentChanges?.forEach { change ->
                    if (change.type != com.google.firebase.firestore.DocumentChange.Type.ADDED) return@forEach
                    val doc   = change.document
                    val data  = doc.data
                    val to    = data["to"] as? String ?: return@forEach
                    val body  = data["body"] as? String ?: return@forEach
                    val jobId = doc.id
                    Log.d("SNBXGateway", "Processing job $jobId → $to")
                    processJob(jobId, to, body)
                }
            }
    }

    // ── Process a single SMS job ──────────────────────────────────────────────
    private fun processJob(jobId: String, to: String, body: String) {
        db.collection("sms_jobs").document(jobId)
            .update("status", "processing", "processedAt", Date())
            .addOnSuccessListener {
                try {
                    val smsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        getSystemService(SmsManager::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        SmsManager.getDefault()
                    }
                    val parts = smsManager.divideMessage(body)
                    smsManager.sendMultipartTextMessage(to, null, parts, null, null)
                    db.collection("sms_jobs").document(jobId)
                        .update("status", "sent", "sentAt", Date())
                    Log.d("SNBXGateway", "Job $jobId sent to $to")
                } catch (e: Exception) {
                    Log.e("SNBXGateway", "Send failed for job $jobId: ${e.message}")
                    db.collection("sms_jobs").document(jobId)
                        .update("status", "failed", "error", e.message, "failedAt", Date())
                }
            }
    }

    // ── Foreground notification ───────────────────────────────────────────────
    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("SNBX Gateway Active")
            .setContentText("SMS gateway is running · Ready to send & receive")
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "SNBX SMS Gateway",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps the SMS gateway running in the background"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
}