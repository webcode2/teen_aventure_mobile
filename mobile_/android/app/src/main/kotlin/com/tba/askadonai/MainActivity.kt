package com.tba.askadonai

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.os.Build
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private var joinChannel: MethodChannel? = null
    private var pendingJoinLink: String? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        pendingJoinLink = joinLink(intent)
        joinChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "tba/join_links").apply {
            setMethodCallHandler { call, result ->
                if (call.method == "takePendingJoinLink") {
                    result.success(pendingJoinLink)
                    pendingJoinLink = null
                } else {
                    result.notImplemented()
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        val link = joinLink(intent) ?: return
        pendingJoinLink = link
        joinChannel?.invokeMethod("joinLinkAvailable", null)
    }

    override fun cleanUpFlutterEngine(flutterEngine: FlutterEngine) {
        joinChannel?.setMethodCallHandler(null)
        joinChannel = null
        super.cleanUpFlutterEngine(flutterEngine)
    }

    private fun joinLink(intent: Intent?): String? =
        if (intent?.action == Intent.ACTION_VIEW) intent.dataString else null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "askhub_alerts",
                "Teen Bible Adventures alerts",
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = "Cheers, group notes, and account alerts"
                enableVibration(true)
            }
            getSystemService(NotificationManager::class.java)
                .createNotificationChannel(channel)
        }
    }
}
