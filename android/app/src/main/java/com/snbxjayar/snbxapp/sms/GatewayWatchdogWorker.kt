// android/app/src/main/java/com/snbxjayar/snbxapp/sms/GatewayWatchdogWorker.kt
package com.snbxjayar.snbxapp.sms

import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.work.Worker
import androidx.work.WorkerParameters

class GatewayWatchdogWorker(context: Context, params: WorkerParameters) :
    Worker(context, params) {

    override fun doWork(): Result {
        Log.d("SNBXWatchdog", "Watchdog tick — ensuring gateway is alive")
        return try {
            val intent = Intent(applicationContext, GatewayService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                applicationContext.startForegroundService(intent)
            } else {
                applicationContext.startService(intent)
            }
            Result.success()
        } catch (e: Exception) {
            Log.e("SNBXWatchdog", "Watchdog failed: ${e.message}")
            Result.retry()
        }
    }
}